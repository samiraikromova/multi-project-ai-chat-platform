import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_EMAILS } from "@/lib/adminList";

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { email, password, full_name } = await req.json();

  // mark as admin if email is in the whitelist
  const is_admin = ADMIN_EMAILS.includes(email);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name, is_admin },
    },
  });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({
    message: "User registered successfully",
    user: data.user,
  });
}
