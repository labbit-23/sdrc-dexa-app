import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Images from Supabase Storage
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

export default nextConfig
