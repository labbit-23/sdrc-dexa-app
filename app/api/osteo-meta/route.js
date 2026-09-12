/**
 * GET /api/osteo-meta?mrn=MRN123
 *
 * Returns patient name, latest scan date, and which scanned regions are
 * missing their ROI-overlay image (falling back to the plain scan image, or
 * having no image at all) — for the osteo report toolbar's screen-only
 * warning banner. Mirrors /api/tb-meta's ROI-check-banner pattern.
 */

import { NextResponse } from 'next/server'
import { fetchLatestOsteoScan } from '@/lib/fetch-scan.js'

const REGION_LABELS = {
  spine:         'Spine',
  left_femur:    'Left Femur',
  right_femur:   'Right Femur',
  left_forearm:  'Left Forearm',
  right_forearm: 'Right Forearm',
}

function parseRaw(raw_json) {
  let raw = raw_json
  for (let i = 0; i < 2 && typeof raw === 'string'; i++) {
    try { raw = JSON.parse(raw) } catch { return null }
  }
  return typeof raw === 'object' && raw !== null ? raw : null
}

function computeMissingOverlays(session, imagePaths) {
  const items = []
  for (const [region, label] of Object.entries(REGION_LABELS)) {
    const hasData = Object.keys(session?.[region] ?? {}).length > 0
    if (!hasData) continue
    const hasOverlay = Boolean(imagePaths?.[`${region}_overlay`])
    if (hasOverlay) continue
    const hasPlain = Boolean(imagePaths?.[region])
    items.push({ region, label, hasPlain })
  }
  return items.length ? items : null
}

export async function GET(req) {
  const mrn = req.nextUrl.searchParams.get('mrn')
  if (!mrn || !/^[\w-]+$/.test(mrn)) {
    return NextResponse.json({ error: 'Missing or invalid ?mrn= param' }, { status: 400 })
  }

  const scan = await fetchLatestOsteoScan(mrn)
  if (!scan) return NextResponse.json({ error: 'Scan not found' }, { status: 404 })

  const pat = scan.bmd_patients
  const firstName = pat?.first_name ?? ''
  const lastName  = pat?.last_name  ?? ''
  const name      = `${lastName} ${firstName}`.trim() || mrn
  const scanDate  = (scan.scan_date ?? '').slice(0, 10)

  const rawData = parseRaw(scan.raw_json)
  const missingOverlays = rawData ? computeMissingOverlays(rawData.session, scan.image_paths) : null

  return NextResponse.json({ name, scan_date: scanDate, missing_overlays: missingOverlays })
}
