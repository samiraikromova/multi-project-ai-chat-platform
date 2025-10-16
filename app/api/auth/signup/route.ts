import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  const { email, password, full_name } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: "Missing email or password" }, { status: 400 })
  }

  const adminEmails = ["samiraikromova2006@gmail.com"]
  const isAdmin = adminEmails.includes(email.toLowerCase())

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name,
        is_admin: isAdmin,
      },
    },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Optionally ensure profile exists
  if (data.user) {
    await supabase.from("profiles").upsert({
      id: data.user.id,
      email,
      full_name,
      is_admin: isAdmin,
      updated_at: new Date().toISOString(),
    })
  }

  return NextResponse.json({
    message: "Signup successful",
    user: data.user,
  })
}
