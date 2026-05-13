/**
 * GET /api/pdf?mrn=MRN123
 * GET /api/pdf?mrn=MRN123&lh=1              (letterhead)
 * GET /api/pdf?mrn=MRN123&type=totalbody    (total body scan)
 * GET /api/pdf?mrn=MRN123&type=totalbody&lh=1
 *
 * Generates a PDF for the patient's latest scan using Puppeteer.
 * Defaults to scan type 'osteo' if &type= is not specified.
 */

import { NextResponse } from 'next/server'
import puppeteer from 'puppeteer'

export async function GET(req) {
  const mrn = req.nextUrl.searchParams.get('mrn')
  if (!mrn || !/^[\w-]+$/.test(mrn)) {
    return NextResponse.json({ error: 'Missing or invalid ?mrn= param' }, { status: 400 })
  }

  const lh       = req.nextUrl.searchParams.get('lh') === '1'
  const scanType = req.nextUrl.searchParams.get('type') === 'totalbody' ? 'totalbody' : 'osteo'
  const host     = req.headers.get('host') ?? 'localhost:3010'
  const proto    = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const renderUrl = `${proto}://${host}/bmd/render/${scanType}/${mrn}${lh ? '?lh=1' : ''}`

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })

  try {
    const page = await browser.newPage()
    await page.goto(renderUrl, { waitUntil: 'networkidle0', timeout: 30_000 })

    await page.evaluate(() =>
      Promise.all(
        Array.from(document.images).map(img =>
          img.complete
            ? Promise.resolve()
            : new Promise(r => { img.onload = r; img.onerror = r })
        )
      )
    )

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
    })

    const label    = scanType === 'totalbody' ? 'total_body' : 'bone_density'
    const filename = `${mrn}_${label}${lh ? '_letterhead' : ''}.pdf`
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } finally {
    await browser.close()
  }
}
