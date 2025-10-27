export default function AccessDeniedPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-red-100 rounded-full mx-auto mb-6 flex items-center justify-center">
          <span className="text-3xl">🚫</span>
        </div>
        <h1 className="text-2xl font-normal text-gray-800 mb-4">
          Access Denied
        </h1>
        <p className="text-sm text-gray-600 mb-6">
          Your account does not have access to this platform.
        </p>
          <a
          href="/auth/login"
          className="inline-block bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg"
          >
          Back to Login
        </a>
      </div>
    </div>
  );
}