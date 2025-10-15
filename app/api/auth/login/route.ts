import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { email, password } = await req.json();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });

  const user = data.user;

  // redirect based on role
  if (user?.user_metadata?.is_admin) {
    return NextResponse.redirect(new URL("/admin", req.url));
  } else {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
}
