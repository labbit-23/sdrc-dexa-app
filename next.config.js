/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: process.env.NEXT_PUBLIC_BASEPATH || '',
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
