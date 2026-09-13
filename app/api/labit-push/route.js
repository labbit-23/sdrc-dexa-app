/**
 * POST /api/labit-push
 *
 * Pushes a finished DEXA report PDF to Labit Core as an attachment, keyed by
 * patient MRN. Labit Core resolves MRN → requisition itself; a doctor there
 * approves the report and Labit's own enqueue-send (with cooling-off) handles
 * delivery to the patient. This route does not send anything to the patient
 * directly — it only hands the PDF to Labit Core.
 *
 * Body: { mrn, scanType, lh, anonymize, date, tpl }
 *
 * lh/anonymize/date/tpl mirror exactly what the operator has open on the
 * print page (letterhead toggle, anonymize toggle, the scan date being
 * viewed, and — for total body — the letterhead template). The PDF handed
 * to Labit is generated with these same params, and testRef is derived from
 * the same scan date, so the pushed report is never a re-render that could
 * differ from what was visually confirmed on screen before pushing.
 *
 * testRef for total body is a single fixed code. testRef for osteo is NOT
 * fixed — Labit's schema splits it into a spine code, a hip code, and a
 * forearm code, joined with a comma (e.g. "BAP,BBH,BMW"), reflecting which
 * views were actually done:
 *   Spine:   BAP (AP) — Lateral spine (BLSL) is out of scope, not done here.
 *   Hip:     BHIP (single hip) or BBH (both hips)
 *   Forearm: BMW (BMD Scan Of Forearm/Wrist) — added 2026-09-13; earlier
 *            pushes never included it even when a forearm was scanned, since
 *            osteoTestRef() only ever checked spine/hip presence. Labit's
 *            BMW mapping was already correctly configured the whole time —
 *            this was purely a gap on the sending side.
 * Spine is hardcoded to the AP code — this worker's MDB/XPS parsers
 * (parse_mdb.py, parse_xps.py) don't produce Lateral spine data anyway.
 * Hip and forearm are genuinely per-patient (whichever side(s) were
 * actually scanned), so both are computed per report from raw region
 * presence — forearm is optional (a patient can have no forearm scan at
 * all), so its ref isn't required to be configured unless a report
 * actually has forearm data.
 *
 * Env:  LABIT_CORE_BASE_URL              — e.g. https://labit.sdrc.in
 *       LABIT_ATTACHMENT_INTERNAL_TOKEN  — shared secret, sent as X-Internal-Token
 *       LABIT_BMD_TB_TEST_REF            — total body testRef (e.g. BWB)
 *       LABIT_BMD_SPINE_AP_TEST_REF      — osteo spine (e.g. BAP)
 *       LABIT_BMD_HIP_SINGLE_TEST_REF    — osteo hip, one side scanned (e.g. BHIP)
 *       LABIT_BMD_HIP_BOTH_TEST_REF      — osteo hip, both sides scanned (e.g. BBH)
 *       LABIT_BMD_FOREARM_TEST_REF       — osteo forearm/wrist (e.g. BMW)
 */

import { NextResponse } from 'next/server'
import { selectScanAndHistory, selectTotalbodyAndHistory } from '@/lib/fetch-scan.js'
import { getServiceClient } from '@/lib/supabase.js'

const LABIT_BASE      = (process.env.LABIT_CORE_BASE_URL ?? '').replace(/\/+$/, '')
const TOKEN            = process.env.LABIT_ATTACHMENT_INTERNAL_TOKEN
const TB_TEST_REF      = process.env.LABIT_BMD_TB_TEST_REF
const SPINE_AP_REF     = process.env.LABIT_BMD_SPINE_AP_TEST_REF
const HIP_SINGLE_REF   = process.env.LABIT_BMD_HIP_SINGLE_TEST_REF
const HIP_BOTH_REF     = process.env.LABIT_BMD_HIP_BOTH_TEST_REF
const FOREARM_REF      = process.env.LABIT_BMD_FOREARM_TEST_REF
const log              = (...a) => console.log('[labit-push]', ...a)

function parseRaw(raw_json) {
  let raw = raw_json
  for (let i = 0; i < 2 && typeof raw === 'string'; i++) {
    try { raw = JSON.parse(raw) } catch { return null }
  }
  return typeof raw === 'object' && raw !== null ? raw : null
}

/**
 * Builds the comma-joined osteo testRef from which regions were actually
 * scanned, for the exact same scan date the operator is pushing. This is a
 * pure structural check on the raw scan JSON (which region keys are
 * present) — not a BMD/T-score computation — so it can never disagree with
 * what computeOsteoData produced for the report the operator is viewing.
 */
async function osteoTestRef(mrn, date) {
  if (!SPINE_AP_REF || !HIP_SINGLE_REF || !HIP_BOTH_REF) {
    return { error: 'LABIT_BMD_SPINE_AP_TEST_REF / LABIT_BMD_HIP_SINGLE_TEST_REF / LABIT_BMD_HIP_BOTH_TEST_REF not configured' }
  }

  const result = await selectScanAndHistory(mrn, date || null)
  if (!result) return { error: `No osteo scan found for MRN ${mrn}${date ? ` on ${date}` : ''}` }

  const rawData = parseRaw(result.scan.raw_json)
  if (!rawData) return { error: `Malformed scan data for MRN ${mrn}` }

  const session = rawData.session || {}
  const hasSpine        = Object.keys(session.spine || {}).length > 0
  const hasLeft         = Object.keys(session.left_femur || {}).length > 0
  const hasRight        = Object.keys(session.right_femur || {}).length > 0
  const hasLeftForearm  = Object.keys(session.left_forearm || {}).length > 0
  const hasRightForearm = Object.keys(session.right_forearm || {}).length > 0
  const hasForearm      = hasLeftForearm || hasRightForearm

  const parts = []
  if (hasSpine) parts.push(SPINE_AP_REF)
  if (hasLeft || hasRight) parts.push(hasLeft && hasRight ? HIP_BOTH_REF : HIP_SINGLE_REF)
  if (hasForearm) {
    if (!FOREARM_REF) return { error: 'Scan has forearm data but LABIT_BMD_FOREARM_TEST_REF is not configured' }
    parts.push(FOREARM_REF)
  }

  if (parts.length === 0) return { error: `Scan for MRN ${mrn} has no spine, hip, or forearm data — nothing to derive a testRef from` }

  return { testRef: parts.join(','), scanId: result.scan.id }
}

/** Resolve the total_body scan id for the same date being pushed, for push-status tracking. */
async function totalbodyScanId(mrn, date) {
  const result = await selectTotalbodyAndHistory(mrn, date || null)
  return result?.scan?.id ?? null
}

/**
 * Record a successful push on the scan row so /list can show a "Pushed"
 * indicator. Best-effort: a failure here must never fail the push response
 * itself — the PDF already reached Labit Core by this point.
 */
async function recordPushStatus(scanId, testRef) {
  if (!scanId) return
  try {
    const sb = getServiceClient()
    await sb.from('bmd_scans')
      .update({ labit_pushed_at: new Date().toISOString(), labit_test_ref: testRef })
      .eq('id', scanId)
  } catch (e) {
    log('recordPushStatus failed (push itself still succeeded)', e.message)
  }
}

export async function POST(req) {
  if (!LABIT_BASE || !TOKEN) {
    return NextResponse.json(
      { error: 'LABIT_CORE_BASE_URL / LABIT_ATTACHMENT_INTERNAL_TOKEN not configured on server' },
      { status: 503 },
    )
  }

  const { mrn, scanType, lh, anonymize, date, tpl } = await req.json()

  if (!mrn) {
    return NextResponse.json({ error: 'mrn is required' }, { status: 400 })
  }

  // Labit is the doctor-approval / patient-delivery pipeline — never accept
  // a push for a report with the logo hidden or with demographics stripped.
  // "Letterhead" (lh) means printing onto pre-printed stationery, which
  // hides the in-PDF logo (see osteo/bmd/editorial html templates) — so the
  // report Labit needs is the one with letterhead OFF. This is the
  // authoritative check; the print-page UI also disables the push button in
  // this state, but that's client-side only.
  if (lh) {
    return NextResponse.json({ error: 'Refusing to push: letterhead is on (logo hidden). Disable letterhead before pushing to Labit.' }, { status: 400 })
  }
  if (anonymize) {
    return NextResponse.json({ error: 'Refusing to push: report is anonymized. Disable Anonymize before pushing to Labit.' }, { status: 400 })
  }

  const type = scanType === 'totalbody' ? 'totalbody' : 'osteo'

  let testRef
  let scanId
  if (type === 'totalbody') {
    if (!TB_TEST_REF) {
      return NextResponse.json({ error: 'LABIT_BMD_TB_TEST_REF not configured' }, { status: 503 })
    }
    testRef = TB_TEST_REF
    scanId = await totalbodyScanId(mrn, date)
  } else {
    const resolved = await osteoTestRef(mrn, date)
    if (resolved.error) {
      return NextResponse.json({ error: resolved.error }, { status: 503 })
    }
    testRef = resolved.testRef
    scanId = resolved.scanId
  }

  // Generate the PDF ourselves via our own render pipeline — always hit
  // localhost directly (same convention as /api/pdf's internal Puppeteer
  // navigation) to avoid routing back out through the reverse proxy. Mirror
  // the exact params (letterhead/anonymize/date/template) the operator has
  // open on the print page so this is the same report they confirmed, not
  // an independent re-render (e.g. always-latest-scan, always-with-letterhead).
  const port = process.env.PORT ?? '3010'
  const base = process.env.NEXT_PUBLIC_BASEPATH ?? ''
  const pdfParams = new URLSearchParams({ mrn, type })
  if (lh) pdfParams.set('lh', '1')
  if (anonymize) pdfParams.set('anonymize', '1')
  if (date) pdfParams.set('date', date)
  if (tpl && tpl !== 'standard') pdfParams.set('tpl', tpl)
  const pdfUrl = `http://localhost:${port}${base}/api/pdf?${pdfParams.toString()}`

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

  log(`push → ${dispatchUrl}`, { mrn, type, testRef, lh: !!lh, anonymize: !!anonymize, date: date || 'latest' })

  try {
    const res  = await fetch(dispatchUrl, {
      method:  'POST',
      headers: { 'X-Internal-Token': TOKEN },
      body:    form,
    })
    const data = await res.json().catch(() => ({}))
    const detailMsg = typeof data.detail === 'string' ? data.detail : (data.message ?? data.error ?? res.statusText)

    if (!res.ok && res.status !== 409) {
      // Labit returns 404 "No pending (attachment-free) item found" both when
      // no matching order exists for this test AND when it was already
      // fulfilled by an earlier push (the slot is no longer attachment-free
      // either way) — this response alone can't distinguish the two, so flag
      // it as its own state rather than reporting a flat, misleading failure
      // (previously this fell through to res.statusText — "Not Found" — which
      // buried Labit's actual explanation entirely).
      const noPendingItem = res.status === 404 && /no pending/i.test(detailMsg)
      return NextResponse.json(
        { error: detailMsg, detail: data, noPendingItem },
        { status: res.status },
      )
    }

    // Record push status on any successful outcome, including 409 (already
    // exists) — either way the report is confirmed present on Labit Core.
    await recordPushStatus(scanId, testRef)

    return NextResponse.json({ ok: true, alreadyExists: res.status === 409, testRef, ...data })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 502 })
  }
}
