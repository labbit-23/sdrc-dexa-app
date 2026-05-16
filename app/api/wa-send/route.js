/**
 * POST /api/wa-send
 *
 * Sends a DEXA report PDF to a patient via WhatsApp using Labbit's internal
 * document-send endpoint. The PDF is served by our own /api/pdf route and
 * attached by Labbit as a template header document.
 *
 * Body: { phone, mrn, scanType, patientName, reportLabel }
 * Env:  WHATSAPP_INTERNAL_SEND_TOKEN, WHATSAPP_LAB_ID, APP_PUBLIC_URL
 */

import { NextResponse } from 'next/server'

const WA_API  = 'https://api.sdrc.in/api/internal/whatsapp/send'
const TOKEN   = process.env.WHATSAPP_INTERNAL_SEND_TOKEN
const LAB_ID  = process.env.WHATSAPP_LAB_ID

function normalizePhone(raw) {
  const digits = (raw ?? '').replace(/\D/g, '')
  if (digits.length === 10) return '91' + digits
  if (digits.startsWith('91') && digits.length === 12) return digits
  if (digits.startsWith('0') && digits.length === 11) return '91' + digits.slice(1)
  return digits
}

export async function POST(req) {
  if (!TOKEN) {
    return NextResponse.json(
      { error: 'WHATSAPP_INTERNAL_SEND_TOKEN not configured on server' },
      { status: 503 },
    )
  }

  const { phone, mrn, scanType, patientName, reportLabel } = await req.json()

  if (!phone || !mrn) {
    return NextResponse.json({ error: 'phone and mrn are required' }, { status: 400 })
  }

  const type       = scanType === 'totalbody' ? 'totalbody' : 'osteo'
  const labelSafe  = type === 'totalbody' ? 'Total Body Composition' : 'Bone Density'
  const label      = reportLabel || `DEXA ${labelSafe} Report`
  const filename   = `SDRC_DEXA_${type === 'totalbody' ? 'TotalBody' : 'BoneDensity'}_${mrn}.pdf`
  const caption    = `Hi ${patientName || 'there'}, your ${label} report from SDRC Diagnostics is attached.`

  // Build absolute PDF URL — use env override or derive from Labbit-reachable hostname
  const appBase = (process.env.APP_PUBLIC_URL ?? 'https://bmd.sdrc.in').replace(/\/$/, '')
  const pdfUrl  = `${appBase}/api/pdf?mrn=${encodeURIComponent(mrn)}&type=${type}&lh=1`

  const payload = {
    lab_id:         LAB_ID,
    phone:          normalizePhone(phone),
    message_type:   'document',
    document_url:   pdfUrl,
    filename,
    caption,
    source_service: 'sdrc_dexa_worker',
  }

  try {
    const res  = await fetch(WA_API, {
      method:  'POST',
      headers: {
        'Content-Type':   'application/json',
        'x-ingest-token': TOKEN,
      },
      body: JSON.stringify(payload),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      return NextResponse.json(
        { error: data.message ?? data.error ?? res.statusText, detail: data },
        { status: res.status },
      )
    }

    return NextResponse.json({ ok: true, ...data, pdfUrl })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 502 })
  }
}
