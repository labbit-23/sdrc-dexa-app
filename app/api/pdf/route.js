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
import fs from 'fs'

// Find system Chrome installation (fallback)
function findSystemChrome() {
  const paths = [
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/snap/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ]
  for (const p of paths) {
    if (fs.existsSync(p)) return p
  }
  return null
}

export async function GET(req) {
  const mrn = req.nextUrl.searchParams.get('mrn')
  if (!mrn || !/^[\w-]+$/.test(mrn)) {
    return NextResponse.json({ error: 'Missing or invalid ?mrn= param' }, { status: 400 })
  }

  const lh       = req.nextUrl.searchParams.get('lh') === '1'
  const tpl      = req.nextUrl.searchParams.get('tpl') ?? 'standard'
  const scanType = req.nextUrl.searchParams.get('type') === 'totalbody' ? 'totalbody' : 'osteo'
  const date     = req.nextUrl.searchParams.get('date')
  const anonymize = req.nextUrl.searchParams.get('anonymize') === '1'
  // Patient-friendly filename passed from the print page (via tb-meta)
  const dlParam  = req.nextUrl.searchParams.get('dl')
  // Puppeteer runs server-side — always hit localhost directly to avoid routing
  // through the reverse proxy (which would land on ERPNext, not this Next.js app).
  const port     = process.env.PORT ?? '3010'
  const base     = process.env.NEXT_PUBLIC_BASEPATH ?? ''
  const qp = new URLSearchParams()
  if (lh) qp.set('lh', '1')
  if (tpl !== 'standard') qp.set('tpl', tpl)
  if (date) qp.set('date', date)
  if (anonymize) qp.set('anonymize', '1')
  const qs = qp.toString()
  const renderUrl = `http://localhost:${port}${base}/render/${scanType}/${mrn}${qs ? '?' + qs : ''}`

  let browser
  let launchError

  // Try cached Chrome first (Puppeteer's default)
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    })
  } catch (e) {
    launchError = e
    // Cached Chrome not found, try system Chrome
    const systemChrome = findSystemChrome()
    if (!systemChrome) {
      return NextResponse.json({
        error: 'Chrome not found. Install cached: npx puppeteer browsers install chrome OR system: sudo apt-get install google-chrome-stable'
      }, { status: 500 })
    }

    try {
      browser = await puppeteer.launch({
        headless: true,
        executablePath: systemChrome,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      })
    } catch (e2) {
      return NextResponse.json({
        error: `Chrome launch failed: ${e2.message}`
      }, { status: 500 })
    }
  }

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

    const label    = scanType === 'totalbody' ? 'Body_Composition' : 'Bone_Density'
    const printSuffix = lh ? '_Print' : ''
    const filename = dlParam
      ? dlParam.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.pdf$/i, '') + printSuffix + '.pdf'
      : `${mrn}_${label}${printSuffix}.pdf`
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
