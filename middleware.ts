import { createClient } from './lib/supabase/server'
import {NextRequest, NextResponse} from "next/server";

export async function middleware(req: NextRequest) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()

  if (!data?.user && req.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }

  if (data?.user && req.nextUrl.pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/auth/:path*'],
}
