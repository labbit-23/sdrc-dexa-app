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
import { fetchAllOsteoScans, buildImageUrls } from '@/lib/fetch-scan.js'

export const dynamic = 'force-dynamic'

/**
 * Parse raw_json — handles TEXT storage and legacy double-encoding.
 * Returns the parsed object, or null if parsing fails.
 */
function parseRaw(raw_json) {
  let raw = raw_json
  for (let i = 0; i < 2 && typeof raw === 'string'; i++) {
    try { raw = JSON.parse(raw) } catch { return null }
  }
  return typeof raw === 'object' && raw !== null ? raw : null
}

export async function GET(req, { params }) {
  const { mrn } = params

  if (!mrn || !/^[\w-]+$/.test(mrn)) {
    return new NextResponse('Invalid MRN', { status: 400 })
  }

  const scans = await fetchAllOsteoScans(mrn)
  if (!scans.length) {
    return new NextResponse(
      `<html><body style="font-family:sans-serif;padding:40px">
        <h2>No osteo scan found for MRN <code>${mrn}</code></h2>
        <p>Either the patient has not been scanned yet, or the collector has not uploaded the data.</p>
      </body></html>`,
      { status: 404, headers: { 'Content-Type': 'text/html' } },
    )
  }

  // Most recent scan is the current; all prior are history
  const scan = scans[scans.length - 1]
  const priorScans = scans.slice(0, -1)

  const imageUrls = buildImageUrls(scan.image_paths)

  const rawData = parseRaw(scan.raw_json)
  if (!rawData) {
    return new NextResponse(
      `<html><body style="font-family:sans-serif;padding:40px">
        <h2>Malformed scan data for MRN <code>${mrn}</code></h2>
        <p>Could not parse raw_json for the latest scan.</p>
      </body></html>`,
      { status: 500, headers: { 'Content-Type': 'text/html' } },
    )
  }

  const reportData = computeOsteoData(rawData, mrn, '')
  reportData.images = {
    spine_url:               imageUrls.spine_url,
    left_femur_url:          imageUrls.left_femur_url,
    right_femur_url:         imageUrls.right_femur_url,
    spine_overlay_url:       imageUrls.spine_overlay_url,
    left_femur_overlay_url:  imageUrls.left_femur_overlay_url,
    right_femur_overlay_url: imageUrls.right_femur_overlay_url,
  }

  // Build history array: compute OsteoReportData for each prior scan, skip failures
  const history = priorScans
    .map(s => {
      const raw = parseRaw(s.raw_json)
      if (!raw) return null
      return computeOsteoData(raw, mrn, '')
    })
    .filter(Boolean)

  const letterhead = req.nextUrl.searchParams.get('lh') === '1'
  const html = generateOsteoHtml(reportData, { dark: false, letterhead, history })

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
