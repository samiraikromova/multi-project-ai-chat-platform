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
      model,
      quality,
      numImages,
      imageSize
    } = await req.json();

    // Check credits
    const { data: user } = await supabase
      .from("users")
      .select("credits")
      .eq("id", userId)
      .single();

    const estimatedCost = calculateImageCost(model, quality, numImages);

    if (!user || Number(user.credits) < estimatedCost) {
      return NextResponse.json(
        { error: "Insufficient credits" },
        { status: 402 }
      );
    }

    // Call n8n webhook
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || 'https://n8n.leveragedcreator.ai/webhook/cb4-chat';

    const n8nPayload = {
      message,
      userId,
      projectId,
      projectSlug,
      model,
      quality,
      numImages,
      imageSize,
      userMessage: message,
      messageContent: message
    };

    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(n8nPayload),
    });

    if (!n8nResponse.ok) {
      throw new Error('N8N webhook failed');
    }

    const result = await n8nResponse.json();
    const output = result.output || result.reply;

    // Check if this is a text response (clarification) or image URL
    const isImageUrl = typeof output === 'string' && output.startsWith('http');

    if (!isImageUrl) {
      // This is a text response (clarification needed)
      return NextResponse.json({
        success: true,
        isTextResponse: true,
        message: output,
        cost: result.usage?.cost || 0
      });
    }

    // This is an image URL
    const imageUrl = output;

    // Store in database
    const { data: savedImage } = await supabase
      .from("generated_images")
      .insert({
        user_id: userId,
        project_id: projectId,
        prompt: message,
        image_url: imageUrl,
        style: model,
        aspect_ratio: imageSize,
      })
      .select()
      .single();

    // Deduct credits
    const actualCost = result.usage?.cost || estimatedCost;
    const newCredits = Number(user.credits) - actualCost;

    await supabase
      .from("users")
      .update({ credits: newCredits })
      .eq("id", userId);

    // Log usage
    await supabase.from("usage_logs").insert({
      user_id: userId,
      model: `${model} - ${quality}`,
      tokens_input: 0,
      tokens_output: 0,
      estimated_cost: actualCost,
      project_id: projectId,
      metadata: { type: "image_generation", quality, numImages, imageSize },
    });

    return NextResponse.json({
      success: true,
      isTextResponse: false,
      imageUrl,
      imageId: savedImage?.id,
      cost: actualCost,
      remainingCredits: newCredits,
    });
  } catch (error: any) {
    console.error("Image generation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}