import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
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

  // Check if user is on allow list (skip for auth pages)
  if (user && !request.nextUrl.pathname.startsWith('/auth')) {
    const { data: allowedUser } = await supabase
      .from('allowed_users')
      .select('is_active')
      .eq('email', user.email)
      .eq('is_active', true)
      .maybeSingle()

    if (!allowedUser) {
      // User not on allow list - redirect to access denied page
      const url = request.nextUrl.clone()
      url.pathname = '/auth/access-denied'
      return NextResponse.redirect(url)
    }
  }

  // Redirect logic for non-authenticated users
  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/auth') &&
    !request.nextUrl.pathname.startsWith('/_next') &&
    request.nextUrl.pathname !== '/'
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}