/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname:  'supabase.sdrc.in',
        pathname:  '/storage/v1/object/**',
      },
    ],
  },
}

module.exports = nextConfig
