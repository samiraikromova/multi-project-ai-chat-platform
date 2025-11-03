import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface ThrivecartBody {
  event: string;
  product_id: string;
  customer?: {
    email?: string;
  };
}

export async function POST(req: Request) {
  const body = (await req.json()) as ThrivecartBody;
  const email = body.customer?.email;
  const productId = body.product_id;

  if (!email || !productId) {
    return NextResponse.json({ error: "Missing email or product_id" }, { status: 400 });
  }

  // ✅ Allow null as valid type for tier
  const tierMap: Record<string, { tier: string | null; credits: number }> = {
    "product_abc123": { tier: "tier1", credits: 10000 },
    "product_xyz789": { tier: "tier2", credits: 40000 },
    "product_top10": { tier: null, credits: 10000 },
    "product_top25": { tier: null, credits: 25000 },
    "product_top50": { tier: null, credits: 50000 },
  };

  const config = tierMap[productId];
  if (!config) {
    return NextResponse.json({ error: "Unknown product" }, { status: 400 });
  }

  const supabase = await createClient();

  // ✅ Fetch user first before updating
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("credits")
    .eq("email", email)
    .single();

  if (userError) {
    console.error("User fetch error:", userError);
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // ✅ Handle payment-related events
  if (body.event === "order.success" || body.event === "subscription.charge.success") {
    // Tiered subscriptions or top-ups
    if (config.tier) {
      await supabase
        .from("users")
        .update({
          subscription_tier: config.tier,
          credits: (user?.credits || 0) + config.credits,
        })
        .eq("email", email);
    } else {
      await supabase
        .from("users")
        .update({
          credits: (user?.credits || 0) + config.credits,
        })
        .eq("email", email);
    }
  } else if (body.event === "subscription.cancelled") {
    // Handle cancellations
    await supabase
      .from("users")
      .update({ subscription_tier: "free" })
      .eq("email", email);
  }

  return NextResponse.json({ success: true });
}
