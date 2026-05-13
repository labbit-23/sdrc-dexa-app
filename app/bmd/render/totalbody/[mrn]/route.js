/**
 * GET /bmd/render/totalbody/[mrn]
 * GET /bmd/render/totalbody/[mrn]?lh=1   (letterhead)
 *
 * Returns the full HTML report for a patient's latest total body scan.
 * Puppeteer (in /api/pdf) navigates to this URL to generate the PDF.
 */

import { NextResponse }        from 'next/server'
import { computeReportData }   from '@/lib/bmd-compute.js'
import { generateReportHtml }  from '@/lib/bmd-html-template.js'
import { fetchLatestTotalbodyScan, buildTotalbodyImageUrls } from '@/lib/fetch-scan.js'

export const dynamic = 'force-dynamic'

export async function GET(req, { params }) {
  const { mrn } = params

  if (!mrn || !/^[\w-]+$/.test(mrn)) {
    return new NextResponse('Invalid MRN', { status: 400 })
  }

  const scan = await fetchLatestTotalbodyScan(mrn)
  if (!scan) {
    return new NextResponse(
      `<html><body style="font-family:sans-serif;padding:40px">
        <h2>No total body scan found for MRN <code>${mrn}</code></h2>
        <p>Either the patient has not been scanned yet, or the collector has not uploaded the data.</p>
      </body></html>`,
      { status: 404, headers: { 'Content-Type': 'text/html' } },
    )
  }

  const imageUrls = buildTotalbodyImageUrls(scan.image_paths)

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

  const reportData = computeReportData(rawData, mrn, '')
  reportData.images = {
    fat_lean_url:     imageUrls.fat_lean_url     ?? '',
    fat_gradient_url: imageUrls.fat_gradient_url ?? '',
    bone_url:         imageUrls.bone_url         ?? '',
    composite_url:    imageUrls.composite_url    ?? '',
  }

  const letterhead = req.nextUrl.searchParams.get('lh') === '1'
  const html = generateReportHtml(reportData, { dark: false, letterhead })

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
