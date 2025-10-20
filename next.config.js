/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },

  experimental: {
    allowedDevOrigins: [
      'http://192.168.56.1:3000',
      'http://localhost:3000',
    ],
  },

  // ✅ Fix Watchpack errors on Windows
  webpackDevMiddleware: (config) => {
    config.watchOptions.ignored = [
      '**/node_modules/**',
      '**/.git/**',
      'C:/pagefile.sys',
      'C:/hiberfil.sys',
      'C:/swapfile.sys'
    ];
    return config;
  },
}

module.exports = nextConfig
