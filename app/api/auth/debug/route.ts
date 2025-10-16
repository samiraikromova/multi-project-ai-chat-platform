import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies })

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  const { data: session, error: sessionError } = await supabase.auth.getSession()
  const { data: profiles } = await supabase.from("profiles").select("*").limit(5)

  return NextResponse.json({
    user,
    session,
    userError,
    sessionError,
    profiles,
  })
}
