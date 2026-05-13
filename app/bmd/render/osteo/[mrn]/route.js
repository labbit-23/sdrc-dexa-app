/**
 * GET /bmd/render/osteo/[mrn]
 * GET /bmd/render/osteo/[mrn]?lh=1   (letterhead)
 *
 * Returns the full HTML report for a patient's latest osteo scan.
 * Puppeteer (in /api/pdf) navigates to this URL to generate the PDF.
 */

import { NextResponse }      from 'next/server'
import { computeOsteoData }  from '@/lib/osteo-compute.js'
import { generateOsteoHtml } from '@/lib/osteo-html-template.js'
import { fetchLatestOsteoScan, buildImageUrls } from '@/lib/fetch-scan.js'

export const dynamic = 'force-dynamic'

export async function GET(req, { params }) {
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

  const imageUrls = buildImageUrls(scan.image_paths)
  process.stderr.write(`[IMG] paths=${JSON.stringify(scan.image_paths)} urls=${JSON.stringify(imageUrls)}\n`)

  // raw_json is stored as TEXT — parse it to an object before computing
  let rawData = scan.raw_json
  if (typeof rawData === 'string') {
    try { rawData = JSON.parse(rawData) } catch (e) {
      return new NextResponse(
        `<html><body style="font-family:sans-serif;padding:40px">
          <h2>Malformed scan data for MRN <code>${mrn}</code></h2>
          <pre>${e.message}</pre>
        </body></html>`,
        { status: 500, headers: { 'Content-Type': 'text/html' } },
      )
    }
  }

  const reportData = computeOsteoData(rawData, mrn, '')
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
