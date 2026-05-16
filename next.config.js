/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/bmd',
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
