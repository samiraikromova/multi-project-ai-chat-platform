/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },

  // ✅ Add this block to allow your network IP in dev mode
  experimental: {
    allowedDevOrigins: [
      'http://192.168.56.1:3000',
      'http://localhost:3000',
    ],
  },
}

module.exports = nextConfig
