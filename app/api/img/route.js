/**
 * GET /api/img?p=raw-osteo/MRN/ts/img_spine.png
 * GET /api/img?p=raw-totalbody/MRN/ts/img_fat_lean.png
 *
 * Proxy for Supabase Storage scan images.
 * The browser can only reach the Next.js server (via Tailscale);
 * the Supabase instance at supabase.sdrc.in is only accessible
 * server-side. This route fetches and streams the image.
 */

import { NextResponse } from 'next/server'
import { signedImageUrl } from '@/lib/supabase.js'

export const dynamic = 'force-dynamic'

export async function GET(req) {
  const p = req.nextUrl.searchParams.get('p')
  if (!p || !/^raw-(osteo|totalbody)\/[\w\-./]+$/.test(p)) {
    return new NextResponse('Bad path', { status: 400 })
  }

  let signed
  try {
    signed = await signedImageUrl(p)
  } catch (e) {
    return new NextResponse('Cannot sign URL', { status: 502 })
  }

  const res = await fetch(signed)
  if (!res.ok) {
    return new NextResponse('Image not found', { status: res.status })
  }

  const buf = await res.arrayBuffer()
  return new NextResponse(buf, {
    headers: {
      'Content-Type': res.headers.get('Content-Type') || 'image/png',
      'Cache-Control': 'private, max-age=60',
    },
  })
}
