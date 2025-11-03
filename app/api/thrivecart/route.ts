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

  const tierMap: Record<string, { tier: string | null; credits: number; monthly_allowance?: number }> = {
    "7": { tier: "Tier1", credits: 10000, monthly_allowance: 10000 },
    "8": { tier: "Tier2", credits: 40000, monthly_allowance: 40000 },
    "product_top10": { tier: null, credits: 10000 },
    "product_top25": { tier: null, credits: 25000 },
    "product_top50": { tier: null, credits: 50000 },
  };

  const config = tierMap[productId];
  if (!config) {
    return NextResponse.json({ error: "Unknown product" }, { status: 400 });
  }

  const supabase = await createClient();

  // ✅ Fetch user ID using email
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .single();

  if (userError || !user) {
    console.error("User fetch error:", userError);
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const userId = user.id;

  // ✅ Check if user already has a user_credits record
  const { data: existingCredits } = await supabase
    .from("user_credits")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (body.event === "order.success" || body.event === "subscription.charge.success") {
    // Calculate new balance
    const newCredits = (existingCredits?.credits || 0) + config.credits;

    if (existingCredits) {
      await supabase
        .from("user_credits")
        .update({
          tier: config.tier || existingCredits.tier,
          credits: newCredits,
          monthly_allowance: config.monthly_allowance || existingCredits.monthly_allowance,
          renewal_date: new Date().toISOString(),
        })
        .eq("user_id", userId);
    } else {
      await supabase.from("user_credits").insert({
        user_id: userId,
        tier: config.tier || "free",
        credits: config.credits,
        monthly_allowance: config.monthly_allowance || 0,
        renewal_date: new Date().toISOString(),
      });
    }
  } else if (body.event === "subscription.cancelled") {
    await supabase
      .from("user_credits")
      .update({ tier: "free" })
      .eq("user_id", userId);
  }

  return NextResponse.json({ success: true });
}
