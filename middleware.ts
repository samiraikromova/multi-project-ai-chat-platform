// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Allow auth pages without login
  if (request.nextUrl.pathname.startsWith('/auth')) {
    return supabaseResponse
  }

  // Redirect to login if not authenticated
  if (!user && !request.nextUrl.pathname.startsWith('/_next') && request.nextUrl.pathname !== '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // Check subscription for protected routes
  if (user && !request.nextUrl.pathname.startsWith('/auth') && !request.nextUrl.pathname.startsWith('/pricing')) {
  const { data: userData } = await supabase
    .from('users')
    .select('subscription_tier, credits')
    .eq('id', user.id)
    .single()

  // ✅ Block users with no subscription AND no credits
  if (userData) {
    const hasAccess =
      userData.subscription_tier !== 'free' ||
      Number(userData.credits) > 0

    if (!hasAccess) {
      // Allow access to payment/pricing pages
      const allowedPaths = ['/auth/payment-required', '/pricing', '/pricing/top-up', '/auth/redeem-coupon']
      const isAllowedPath = allowedPaths.some(path => request.nextUrl.pathname.startsWith(path))

      if (!isAllowedPath) {
        const url = request.nextUrl.clone()
        url.pathname = '/auth/payment-required'
        return NextResponse.redirect(url)
      }
    }
  }
}

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}