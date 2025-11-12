/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'v3b.fal.media',
        pathname: '/files/**',
      },
      {
        protocol: 'https',
        hostname: '**.fal.media',
      }
    ],
  },
}

module.exports = nextConfig