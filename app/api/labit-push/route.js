/**
 * POST /api/labit-push
 *
 * Pushes a finished DEXA report PDF to Labit Core as an attachment, keyed by
 * patient MRN. Labit Core resolves MRN → requisition itself; a doctor there
 * approves the report and Labit's own enqueue-send (with cooling-off) handles
 * delivery to the patient. This route does not send anything to the patient
 * directly — it only hands the PDF to Labit Core.
 *
 * Body: { mrn, scanType }
 *
 * testRef for total body is a single fixed code. testRef for osteo is NOT
 * fixed — Labit's schema splits it into a spine code and a hip code, joined
 * with a comma (e.g. "BAP,BBH"), reflecting which views were actually done:
 *   Spine: BAP (AP) — Lateral spine (BLSL) is out of scope, not done here.
 *   Hip:   BHIP (single hip) or BBH (both hips)
 * Spine is hardcoded to the AP code — this worker's MDB/XPS parsers
 * (parse_mdb.py, parse_xps.py) don't produce Lateral spine data anyway.
 * Hip is genuinely per-patient (whichever side(s) were actually scanned),
 * so it's computed per report from left_femur/right_femur presence.
 *
 * Env:  LABIT_CORE_BASE_URL              — e.g. https://labit.sdrc.in
 *       LABIT_ATTACHMENT_INTERNAL_TOKEN  — shared secret, sent as X-Internal-Token
 *       LABIT_BMD_TB_TEST_REF            — total body testRef (e.g. BWB)
 *       LABIT_BMD_SPINE_AP_TEST_REF      — osteo spine (e.g. BAP)
 *       LABIT_BMD_HIP_SINGLE_TEST_REF    — osteo hip, one side scanned (e.g. BHIP)
 *       LABIT_BMD_HIP_BOTH_TEST_REF      — osteo hip, both sides scanned (e.g. BBH)
 */

import { NextResponse } from 'next/server'
import { computeOsteoData } from '@/lib/osteo-compute.js'
import { selectScanAndHistory } from '@/lib/fetch-scan.js'

const LABIT_BASE      = (process.env.LABIT_CORE_BASE_URL ?? '').replace(/\/+$/, '')
const TOKEN            = process.env.LABIT_ATTACHMENT_INTERNAL_TOKEN
const TB_TEST_REF      = process.env.LABIT_BMD_TB_TEST_REF
const SPINE_AP_REF     = process.env.LABIT_BMD_SPINE_AP_TEST_REF
const HIP_SINGLE_REF   = process.env.LABIT_BMD_HIP_SINGLE_TEST_REF
const HIP_BOTH_REF     = process.env.LABIT_BMD_HIP_BOTH_TEST_REF
const log              = (...a) => console.log('[labit-push]', ...a)

function parseRaw(raw_json) {
  let raw = raw_json
  for (let i = 0; i < 2 && typeof raw === 'string'; i++) {
    try { raw = JSON.parse(raw) } catch { return null }
  }
  return typeof raw === 'object' && raw !== null ? raw : null
}

/** Builds the comma-joined osteo testRef from which regions were actually scanned. */
async function osteoTestRef(mrn) {
  if (!SPINE_AP_REF || !HIP_SINGLE_REF || !HIP_BOTH_REF) {
    return { error: 'LABIT_BMD_SPINE_AP_TEST_REF / LABIT_BMD_HIP_SINGLE_TEST_REF / LABIT_BMD_HIP_BOTH_TEST_REF not configured' }
  }

  const result = await selectScanAndHistory(mrn)
  if (!result) return { error: `No osteo scan found for MRN ${mrn}` }

  const rawData = parseRaw(result.scan.raw_json)
  if (!rawData) return { error: `Malformed scan data for MRN ${mrn}` }

  const { spine, left_femur, right_femur } = computeOsteoData(rawData, mrn, '')

  const hasSpine = Object.keys(spine || {}).length > 0
  const hasLeft  = Object.keys(left_femur || {}).length > 0
  const hasRight = Object.keys(right_femur || {}).length > 0

  const parts = []
  if (hasSpine) parts.push(SPINE_AP_REF)
  if (hasLeft || hasRight) parts.push(hasLeft && hasRight ? HIP_BOTH_REF : HIP_SINGLE_REF)

  if (parts.length === 0) return { error: `Scan for MRN ${mrn} has neither spine nor hip data — nothing to derive a testRef from` }

  return { testRef: parts.join(',') }
}

export async function POST(req) {
  if (!LABIT_BASE || !TOKEN) {
    return NextResponse.json(
      { error: 'LABIT_CORE_BASE_URL / LABIT_ATTACHMENT_INTERNAL_TOKEN not configured on server' },
      { status: 503 },
    )
  }

  const { mrn, scanType } = await req.json()

  if (!mrn) {
    return NextResponse.json({ error: 'mrn is required' }, { status: 400 })
  }

  const type = scanType === 'totalbody' ? 'totalbody' : 'osteo'

  let testRef
  if (type === 'totalbody') {
    if (!TB_TEST_REF) {
      return NextResponse.json({ error: 'LABIT_BMD_TB_TEST_REF not configured' }, { status: 503 })
    }
    testRef = TB_TEST_REF
  } else {
    const resolved = await osteoTestRef(mrn)
    if (resolved.error) {
      return NextResponse.json({ error: resolved.error }, { status: 503 })
    }
    testRef = resolved.testRef
  }

  // Generate the PDF ourselves via our own render pipeline — always hit
  // localhost directly (same convention as /api/pdf's internal Puppeteer
  // navigation) to avoid routing back out through the reverse proxy.
  const port = process.env.PORT ?? '3010'
  const base = process.env.NEXT_PUBLIC_BASEPATH ?? ''
  const pdfUrl = `http://localhost:${port}${base}/api/pdf?mrn=${encodeURIComponent(mrn)}&type=${type}&lh=1`

  let pdfBytes
  try {
    const pdfRes = await fetch(pdfUrl)
    if (!pdfRes.ok) {
      return NextResponse.json(
        { error: `PDF generation failed (${pdfRes.status})` },
        { status: 502 },
      )
    }
    pdfBytes = Buffer.from(await pdfRes.arrayBuffer())
  } catch (e) {
    return NextResponse.json({ error: `PDF generation error: ${e.message}` }, { status: 502 })
  }

  const dispatchUrl = `${LABIT_BASE}/machine-api/bmd-attachment/by-patient/${encodeURIComponent(mrn)}/${encodeURIComponent(testRef)}`

  const form = new FormData()
  form.append('report_ready_at', new Date().toISOString())
  form.append('file', new Blob([pdfBytes], { type: 'application/pdf' }), `${mrn}_${type}.pdf`)

  log(`push → ${dispatchUrl}`, { mrn, type, testRef })

  try {
    const res  = await fetch(dispatchUrl, {
      method:  'POST',
      headers: { 'X-Internal-Token': TOKEN },
      body:    form,
    })
    const data = await res.json().catch(() => ({}))

    if (!res.ok && res.status !== 409) {
      return NextResponse.json(
        { error: data.message ?? data.error ?? res.statusText, detail: data },
        { status: res.status },
      )
    }

    return NextResponse.json({ ok: true, alreadyExists: res.status === 409, testRef, ...data })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 502 })
  }
}
