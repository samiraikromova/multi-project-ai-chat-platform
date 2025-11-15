import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function calculateImageCost(model: string, quality: string, numImages: number): number {
  const pricing: Record<string, Record<string, number>> = {
    'Ideogram': {
      'TURBO': 0.03,
      'BALANCED': 0.06,
      'QUALITY': 0.09
    },
    'Flux': {
      'flux-1': 0.025,
      'flux-1.1-pro': 0.04,
      'flux-1.1-pro-ultra': 0.06
    }
  };

  const cost = pricing[model]?.[quality] || 0.06;
  return cost * numImages;
}

export async function POST(req: NextRequest) {
  try {
    const {
      message,
      userId,
      projectId,
      projectSlug,
      quality,
      numImages,
      imageSize,
      threadId
    } = await req.json();

    console.log('📸 Image generation request:', { userId, quality, numImages, imageSize });

    // Check credits FIRST
    const { data: user } = await supabase
      .from("users")
      .select("credits")
      .eq("id", userId)
      .single();

    const estimatedCost = calculateImageCost('Ideogram', quality, numImages);

    if (!user || Number(user.credits) < estimatedCost) {
      return NextResponse.json(
        { error: "Insufficient credits" },
        { status: 402 }
      );
    }

    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || 'https://n8n.leveragedcreator.ai/webhook/cb4-chat';

    const n8nPayload = {
      message,
      userId,
      projectId,
      projectSlug,
      model: 'Ideogram',
      quality,
      numImages,
      imageSize,
      userMessage: message,
      messageContent: message,
      threadId
    };

    console.log('🔄 Calling N8N for image generation...');

    let n8nResponse;
    let result;

    try {
      n8nResponse = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(n8nPayload),
        signal: AbortSignal.timeout(180000)
      });

      if (!n8nResponse.ok) {
        const errorText = await n8nResponse.text();
        console.error('❌ N8N webhook failed:', errorText);
        throw new Error(`N8N returned ${n8nResponse.status}: ${errorText}`);
      }

      result = await n8nResponse.json();
      console.log('✅ N8N response received:', result);

    } catch (fetchError: any) {
      console.error('❌ N8N fetch error:', fetchError);
      return NextResponse.json({
        success: false,
        error: 'Failed to connect to image generation service',
        details: fetchError.message
      }, { status: 500 });
    }

    // Validate the response structure
    if (!result || (!result.output && !result.reply)) {
      console.error('❌ Invalid N8N response structure:', result);
      return NextResponse.json({
        success: false,
        error: 'Invalid response from image generation service'
      }, { status: 500 });
    }

    const output = result.output || result.reply;

    // Check for error messages
    if (typeof output === 'string' && (output === 'No response' || output.includes('Error:') || output.includes('error'))) {
      console.error('❌ N8N returned error:', output);
      return NextResponse.json({
        success: false,
        error: output
      }, { status: 500 });
    }

    // Check if this is a text response (clarification) or image URL(s)
    const isImageUrl = (typeof output === 'string' && output.startsWith('http')) ||
                       (Array.isArray(output) && output.length > 0 && output[0].startsWith('http'));

    if (!isImageUrl) {
      // Text response (clarification)
      return NextResponse.json({
        success: true,
        isTextResponse: true,
        message: output,
        cost: 0
      });
    }

    // ✅ Handle multiple image URLs
    let imageUrls = [];

    // Check if result has imageUrls array (preferred)
    if (result.imageUrls && Array.isArray(result.imageUrls)) {
      imageUrls = result.imageUrls;
    }
    // Fallback: check output field
    else if (Array.isArray(output)) {
      imageUrls = output;
    } else if (typeof output === 'string') {
      imageUrls = [output];
    }

    console.log(`✅ Generated ${imageUrls.length} image(s)`);

    const savedImages = [];

    // Store all images in database
    for (const imageUrl of imageUrls) {
      const { data: savedImage, error: saveError } = await supabase
        .from("generated_images")
        .insert({
          user_id: userId,
          project_id: projectId,
          prompt: message,
          image_url: imageUrl,
          style: 'Ideogram',
          aspect_ratio: imageSize,
          thread_id: threadId
        })
        .select()
        .single();

      if (saveError) {
        console.error('⚠️ Failed to save image:', saveError);
      } else if (savedImage) {
        savedImages.push(savedImage);
      }
    }

    // ✅ Calculate cost based on ACTUAL number of images generated
    const actualNumImages = imageUrls.length;
    const actualCost = result.usage?.cost
      ? Number((result.usage.cost * actualNumImages / (result.usage.numImages || 1)).toFixed(2))
      : calculateImageCost('Ideogram', quality, actualNumImages);

    const newCredits = Number((Number(user.credits) - actualCost).toFixed(2));

    console.log(`💰 Deducting ${actualCost} credits for ${actualNumImages} images. New balance: ${newCredits}`);
        const { error: creditError } = await supabase
      .from("users")
      .update({
        credits: newCredits,
        last_credit_update: new Date().toISOString()
      })
      .eq("id", userId);

    if (creditError) {
      console.error('⚠️ Failed to deduct credits:', creditError);
    }

    // Log usage
    await supabase.from("usage_logs").insert({
      user_id: userId,
      model: `Ideogram - ${quality}`,
      tokens_input: 0,
      tokens_output: 0,
      estimated_cost: actualCost,
      project_id: projectId,
      metadata: {
        type: "image_generation",
        quality,
        numImages: imageUrls.length,
        imageSize,
        thread_id: threadId
      },
    });

    return NextResponse.json({
      success: true,
      isTextResponse: false,
      imageUrls,
      imageIds: savedImages.map(img => img.id),
      cost: actualCost,
      remainingCredits: newCredits,
    });

  } catch (error: any) {
    console.error("❌ Image generation error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
}