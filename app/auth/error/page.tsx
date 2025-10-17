import Link from 'next/link'

type ErrorPageProps = {
  searchParams: Promise<{ message?: string }>
}

export default async function ErrorPage(props: ErrorPageProps) {
  const searchParams = await props.searchParams
  const message = searchParams.message

  let errorTitle = 'Authentication Error'
  let errorMessage = 'Something went wrong. Please try again.'

  if (message === 'already-registered') {
    errorTitle = 'Email Already Registered'
    errorMessage = 'This email is already registered. Please sign in instead.'
  } else if (message) {
    errorMessage = decodeURIComponent(message)
  }

  return (
    <div className="min-h-screen bg-[#f7f5ef] flex items-center justify-center px-4">
      <div className="w-full max-w-[400px] text-center">
        <div className="bg-white border border-[#e0ddd4] rounded-2xl p-8 shadow-sm">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-[24px] font-semibold text-[#2d2d2d] mb-2">
            {errorTitle}
          </h1>
          <p className="text-[15px] text-[#6b6b6b] mb-6">
            {errorMessage}
          </p>
          <div className="space-y-3">
            <Link
              href="/auth/login"
              className="block w-full bg-[#d97757] hover:bg-[#c86545] text-white font-medium py-3 rounded-lg text-[15px] transition-colors"
            >
              Back to login
            </Link>
            <Link
              href="/auth/signup"
              className="block w-full bg-[#f5f5f5] hover:bg-[#e0ddd4] text-[#2d2d2d] font-medium py-3 rounded-lg text-[15px] transition-colors"
            >
              Try signup again
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}