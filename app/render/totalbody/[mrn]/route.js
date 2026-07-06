/**
 * GET /bmd/render/totalbody/[mrn]
 * GET /bmd/render/totalbody/[mrn]?lh=1   (letterhead)
 *
 * Returns the full HTML report for a patient's latest total body scan.
 * Puppeteer (in /api/pdf) navigates to this URL to generate the PDF.
 */

import { NextResponse }        from 'next/server'
import { computeReportData }        from '@/lib/bmd-compute.js'
import { generateReportHtml }       from '@/lib/bmd-html-template.js'
import { generateEditorialHtml }    from '@/lib/editorial-html-template.js'
import { generateComprehensiveHtml } from '@/lib/comprehensive-html-template.js'
import { selectTotalbodyAndHistory, buildTotalbodyImageUrls } from '@/lib/fetch-scan.js'

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

export async function GET(req, { params: paramsPromise }) {
  const { mrn } = await paramsPromise

  if (!mrn || !/^[\w-]+$/.test(mrn)) {
    return new NextResponse('Invalid MRN', { status: 400 })
  }

  try {
    const targetDate = req.nextUrl.searchParams.get('date')
    const result = await selectTotalbodyAndHistory(mrn, targetDate)
    const debugMsg = `[render/totalbody] MRN=${mrn} targetDate=${targetDate} found=${!!result} priorScans=${result?.priorScans?.length ?? 0}`
    console.log(debugMsg)
    if (!result) {
      return new NextResponse(
        `<html><body style="font-family:sans-serif;padding:40px">
          <h2>No total body scan found for MRN <code>${mrn}</code></h2>
          <p>Target date: ${targetDate || 'most recent'}</p>
          <p>Either the patient has not been scanned yet, or the collector has not uploaded the data.</p>
        </body></html>`,
        { status: 404, headers: { 'Content-Type': 'text/html' } },
      )
    }

    const { scan, priorScans } = result

    const imageUrls = buildTotalbodyImageUrls(scan.image_paths)

    const rawData = parseRaw(scan.raw_json)
    if (!rawData) {
      return new NextResponse(
        `<html><body style="font-family:sans-serif;padding:40px">
          <h2>Malformed scan data for MRN <code>${mrn}</code></h2>
          <p>Could not parse raw_json. Scan type: ${scan.scan_type}</p>
          <p>raw_json length: ${scan.raw_json?.length ?? 0} bytes</p>
        </body></html>`,
        { status: 500, headers: { 'Content-Type': 'text/html' } },
      )
    }

    const reportData = computeReportData(rawData, mrn, '')
    if (!reportData || !reportData.composition) {
      return new NextResponse(
        `<html><body style="font-family:sans-serif;padding:40px">
          <h2>Failed to compute report data for MRN <code>${mrn}</code></h2>
          <p>computeReportData returned invalid structure. Scan type: ${scan.scan_type}</p>
        </body></html>`,
        { status: 500, headers: { 'Content-Type': 'text/html' } },
      )
    }

    reportData.images = {
      fat_lean_url:     imageUrls.fat_lean_url     ?? '',
      fat_gradient_url: imageUrls.fat_gradient_url ?? '',
      bone_url:         imageUrls.bone_url         ?? '',
      bone_roi_url:     imageUrls.bone_roi_url     ?? '',
      composite_url:    imageUrls.composite_url    ?? '',
    }

    // Build history array: compute report data for each prior scan, skip failures
    const historyDebug = []
    const history = priorScans
      .map(s => {
        try {
          const raw = parseRaw(s.raw_json)
          if (!raw) {
            historyDebug.push(`${s.scan_date}: parseRaw failed`)
            return null
          }
          const report = computeReportData(raw, mrn, '')
          if (!report) {
            historyDebug.push(`${s.scan_date}: computeReportData returned null`)
            return null
          }
          historyDebug.push(`${s.scan_date}: OK`)
          return report
        } catch (histErr) {
          historyDebug.push(`${s.scan_date}: ${histErr.message}`)
          return null
        }
      })
      .filter(Boolean)

    const letterhead   = req.nextUrl.searchParams.get('lh') === '1'
    const preview      = req.nextUrl.searchParams.get('preview') === '1'
    const anonymize    = req.nextUrl.searchParams.get('anonymize') === '1'
    const tpl          = req.nextUrl.searchParams.get('tpl') ?? 'standard'
    const forceTrends  = req.nextUrl.searchParams.get('trends') === '1'

    // Anonymize PII if requested
    const anonizePiiInData = (data) => {
      data.patient.id = 'SAMPLE'
      data.patient.name = 'Sample Patient'
      data.patient.first_name = 'Sample'
      data.patient.last_name = 'Patient'
      data.patient.dob_str = ''
      data.patient.physician = ''
      data.patient.scan_date = 'SAMPLE DATE'
      data.patient.scan_time = '00:00:00'
    }

    if (anonymize) {
      anonizePiiInData(reportData)
      history.forEach(anonizePiiInData)
      if (reportData.scan_delta) reportData.scan_delta.scan_date_prev = 'SAMPLE DATE'
    }

    // Scan delta: diff between current and most recent prior scan (non-fatal if it fails)
    const prevData = history[history.length - 1] ?? null
    if (prevData && reportData.composition && prevData.composition) {
      try {
        const cur = reportData.composition
        const prv = prevData.composition
        reportData.scan_delta = {
          fat_pct_change:  parseFloat((cur.fat_pct - prv.fat_pct).toFixed(1)),
          fat_kg_change:   parseFloat((cur.fat_g / 1000 - prv.fat_g / 1000).toFixed(1)),
          lean_kg_change:  parseFloat((cur.lean_g / 1000 - prv.lean_g / 1000).toFixed(1)),
          bmc_kg_change:   parseFloat((cur.bmc_g / 1000 - prv.bmc_g / 1000).toFixed(2)),
          scan_date_prev:  prevData.patient.scan_date,
        }
      } catch (deltaErr) {
        console.warn('[render/totalbody] Could not compute scan delta:', deltaErr.message)
      }
    }

    // forceTrends: in dev, show trends page even for single-scan patients
    const historyForRender = forceTrends && history.length === 0
      ? [{ ...reportData, patient: { ...reportData.patient, scan_date: 'Preview (no prior scan)' } }]
      : history

    const debugHtml = `<!-- DEBUG: priorScans=${priorScans.length}, history=${history.length}, historyForRender=${historyForRender.length}\n${historyDebug.map(d => '  ' + d).join('\n')}\n-->`

    const html = tpl === 'studio'
      ? generateEditorialHtml(reportData, { letterhead, history: historyForRender, preview })
      : tpl === 'comprehensive'
      ? generateComprehensiveHtml(reportData, { letterhead, history: historyForRender, preview })
      : generateReportHtml(reportData, { dark: false, letterhead, history: historyForRender, preview })

    return new NextResponse(debugHtml + html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (error) {
    console.error('[render/totalbody] Error:', error)
    return new NextResponse(
      `<html><body style="font-family:sans-serif;padding:40px;color:#c00">
        <h2>Error rendering report for MRN <code>${mrn}</code></h2>
        <pre>${error.message}</pre>
        <p>Check server logs for details.</p>
      </body></html>`,
      { status: 500, headers: { 'Content-Type': 'text/html' } },
    )
  }
}
