/**
 * GET /bmd/render/osteo/[mrn]
 * GET /bmd/render/osteo/[mrn]?lh=1   (letterhead variant)
 *
 * Returns the full HTML report for a patient's latest osteo scan.
 * Puppeteer (in /api/pdf) navigates to this URL to generate the PDF.
 */

import { NextRequest, NextResponse } from 'next/server'
import { computeOsteoData }          from '@/lib/osteo-compute'
import { generateOsteoHtml }         from '@/lib/osteo-html-template'
import { fetchLatestOsteoScan, buildImageUrls } from '@/lib/fetch-scan'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { mrn: string } },
) {
  const { mrn } = params

  if (!mrn || !/^[\w-]+$/.test(mrn)) {
    return new NextResponse('Invalid MRN', { status: 400 })
  }

  const scan = await fetchLatestOsteoScan(mrn)
  if (!scan) {
    return new NextResponse(
      `<html><body style="font-family:sans-serif;padding:40px">
        <h2>No osteo scan found for MRN <code>${mrn}</code></h2>
        <p>Either the patient has not been scanned yet, or the collector has not uploaded the data.</p>
      </body></html>`,
      { status: 404, headers: { 'Content-Type': 'text/html' } },
    )
  }

  // Build signed image URLs from Storage
  const imageUrls = await buildImageUrls(scan.image_paths)

  // Compute report data from raw JSON
  const reportData = computeOsteoData(
    scan.raw_json,
    mrn,
    '',   // imageBaseUrl unused — we pass urls directly below
  )

  // Override image URLs with the signed Storage URLs
  reportData.images = {
    spine_url:       imageUrls.spine_url,
    left_femur_url:  imageUrls.left_femur_url,
    right_femur_url: imageUrls.right_femur_url,
  }

  const letterhead = req.nextUrl.searchParams.get('lh') === '1'
  const html = generateOsteoHtml(reportData, { dark: false, letterhead })

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
