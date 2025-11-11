// app/api/generate-image/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { prompt, style, aspectRatio, userId, projectId } = await req.json();
    const IMAGE_COST = 0.04;

    // Check credits
    const { data: user } = await supabase
      .from("users")
      .select("credits")
      .eq("id", userId)
      .single();

    if (!user || Number(user.credits) < IMAGE_COST) {
      return NextResponse.json({ error: "Insufficient credits" }, { status: 402 });
    }

    const sizeMap: Record<string, string> = {
      "1:1": "1024x1024",
      "16:9": "1792x1024",
      "9:16": "1024x1792",
    };
    const size = sizeMap[aspectRatio] || "1024x1024";

    // Call Gemini 2.5 Flash Image
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image" });
    const response = await model.generateContent([
      { text: `${style} style: ${prompt}` },
    ]);

    const candidate = response.response?.candidates?.[0];
    const part = candidate?.content?.parts?.find((p: any) => p.inlineData);

    if (!part?.inlineData?.data) {
      throw new Error("No image returned from Gemini");
    }

    const imageUrl = `data:image/png;base64,${part.inlineData.data}`;

    // Store in DB
    await supabase.from("generated_images").insert({
      user_id: userId,
      project_id: projectId,
      prompt,
      image_url: imageUrl,
      style,
      aspect_ratio: aspectRatio,
    });

    // Deduct credits
    const newCredits = Number(user.credits) - IMAGE_COST;
    await supabase.from("users").update({ credits: newCredits }).eq("id", userId);

    // Log usage
    await supabase.from("usage_logs").insert({
      user_id: userId,
      model: "Gemini 2.5 Flash Image",
      tokens_input: 0,
      tokens_output: 0,
      estimated_cost: IMAGE_COST,
      project_id: projectId,
      metadata: { type: "image_generation", style, aspectRatio },
    });

    return NextResponse.json({
      success: true,
      imageUrl,
      cost: IMAGE_COST,
      remainingCredits: newCredits,
    });
  } catch (error: any) {
    console.error("Image generation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
