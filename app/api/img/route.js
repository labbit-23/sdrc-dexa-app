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
import sharp from 'sharp'
import { signedImageUrl } from '@/lib/supabase.js'

export const dynamic = 'force-dynamic'

// GE Lunar's femur export canvas is asymmetric: the femoral shaft sits off
// to one side (left-anchored for left femur, right-anchored for right
// femur), leaving a large wedge of blank white space on the other side —
// anywhere from ~0% to ~30% of the frame width, patient to patient. That
// wastes display space and makes the ROI look smaller than it needs to be
// when the image is shown at a larger size. Crop it out at render time
// (not at ingestion) so it's non-destructive, applies retroactively to
// every already-stored scan, and can be retuned without reprocessing.
const FEMUR_IMAGE_RE = /\/img_(left|right)_femur(?:_overlay)?\.png$/i

/**
 * Detects the actual (non-blank) content's horizontal extent and crops out
 * excess white margin, keeping a safety margin so we never crop flush
 * against real bone/ROI content. Bidirectional (checks both left and right
 * edges) rather than assuming which side is blank, since the amount varies
 * a lot and occasionally there's near-zero margin on either side. Falls
 * back to the original image untouched if detection is inconclusive or
 * anything throws — a missed crop is harmless, a bad crop is not.
 */
async function cropFemurBlankMargin(buf) {
  try {
    const { data, info } = await sharp(buf).clone().grayscale().raw().toBuffer({ resolveWithObject: true })
    const { width, height } = info
    const WHITE_THRESHOLD = 245
    const ROW_STRIDE = 2 // sample every other row — plenty for a margin estimate, halves the work

    let xmin = -1
    let xmax = -1
    for (let x = 0; x < width; x++) {
      let hasContent = false
      for (let y = 0; y < height; y += ROW_STRIDE) {
        if (data[y * width + x] < WHITE_THRESHOLD) { hasContent = true; break }
      }
      if (hasContent) {
        if (xmin === -1) xmin = x
        xmax = x
      }
    }
    if (xmin === -1) return buf // couldn't find any content — bail, serve original

    const margin = Math.round(width * 0.06)
    const cropLeft  = Math.max(0, xmin - margin)
    const cropRight = Math.min(width - 1, xmax + margin)
    const cropWidth = cropRight - cropLeft + 1

    // Not enough blank space to be worth cropping (or detection landed on
    // almost the whole frame) — leave the image as-is.
    if (cropWidth >= width * 0.95) return buf

    return await sharp(buf).extract({ left: cropLeft, top: 0, width: cropWidth, height }).png().toBuffer()
  } catch (e) {
    console.error('[api/img] femur blank-margin crop failed, serving original image:', e.message)
    return buf
  }
}

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

  let buf = Buffer.from(await res.arrayBuffer())
  let contentType = res.headers.get('Content-Type') || 'image/png'

  if (FEMUR_IMAGE_RE.test(p)) {
    buf = await cropFemurBlankMargin(buf)
    contentType = 'image/png'
  }

  return new NextResponse(buf, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'private, max-age=60',
    },
  })
}
