/**
 * ECG study activity and operator repair API.
 *
 * Reads the ecg_studies ledger populated by the normal Mirth poller. Repair
 * actions are authenticated and run the standalone Python ECG worker locally.
 */

import { getServiceClient } from '@/lib/supabase.js'
import { spawn } from 'node:child_process'

export const dynamic = 'force-dynamic'

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000

function istDayRangeUtc(yyyymmdd) {
  const y = Number(yyyymmdd.slice(0, 4))
  const m = Number(yyyymmdd.slice(4, 6))
  const d = Number(yyyymmdd.slice(6, 8))
  const startUtcMs = Date.UTC(y, m - 1, d) - IST_OFFSET_MS
  return [new Date(startUtcMs).toISOString(), new Date(startUtcMs + 86400000).toISOString()]
}

function isAdminAuthorized(req) {
  const header = req.headers.get('authorization') || ''
  if (!header.startsWith('Basic ')) return false
  try {
    const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8')
    const split = decoded.indexOf(':')
    if (split < 1) return false
    return decoded.slice(0, split) === process.env.ECG_ADMIN_USER && decoded.slice(split + 1) === process.env.ECG_ADMIN_PASS
  } catch {
    return false
  }
}

function runLocalEcgManualSend(row, sendWhatsapp, testPhone) {
  return new Promise((resolve, reject) => {
    const child = spawn('/opt/labbit-utils/workers/dicom_export/.venv/bin/python', [
      '/opt/labbit-utils/workers/ecg_delivery/manual_send.py', '--config',
      '/opt/labbit-utils/workers/dicom_export/config/dicom_export.json',
    ], { stdio: ['pipe', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', chunk => { stdout += chunk.toString() })
    child.stderr.on('data', chunk => { stderr += chunk.toString() })
    child.on('error', reject)
    child.on('close', code => {
      if (code !== 0) return reject(new Error(stderr.trim() || `ECG worker exited with ${code}`))
      try {
        resolve(JSON.parse(stdout.trim().split('\n').filter(Boolean).pop()))
      } catch {
        reject(new Error(stderr.trim() || 'ECG worker returned invalid JSON'))
      }
    })
    child.stdin.end(JSON.stringify({ row, send_whatsapp: Boolean(sendWhatsapp), test_phone: testPhone || null }) + '\n')
  })
}

function deliveryStages(row) {
  const stored = row.raw_json?.manualDelivery?.stages
  if (stored) return stored
  return {
    core: { status: row.pdf_url_plain ? 'linked' : 'unknown' },
    ftp: { status: row.pdf_url ? 'ok' : 'missing' },
    ledger: { status: 'ok' },
    whatsapp: { status: row.whatsapp_sent_at ? 'ok' : 'pending' },
  }
}

function publicStudy(row) {
  const { raw_json, ...safe } = row
  return { ...safe, delivery_stages: deliveryStages(row) }
}

export async function POST(req) {
  let body
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const sb = getServiceClient()

  if (body.action === 'REATTACH') {
    if (!isAdminAuthorized(req)) {
      return new Response(JSON.stringify({ error: 'ECG admin authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', 'WWW-Authenticate': 'Basic realm="ECG administration"' },
      })
    }
    if (!body.tricog_ecg_id || typeof body.send_whatsapp !== 'boolean') {
      return Response.json({ error: 'Expected tricog_ecg_id and send_whatsapp' }, { status: 400 })
    }
    let testPhone = null
    if (body.test_phone != null && String(body.test_phone).trim()) {
      const digits = String(body.test_phone).replace(/\D/g, "")
      if (!/^\d{10}$/.test(digits) && !/^91\d{10}$/.test(digits)) {
        return Response.json({ error: "Custom WhatsApp number must be a 10-digit Indian number" }, { status: 400 })
      }
      if (!body.send_whatsapp) {
        return Response.json({ error: "Custom WhatsApp number requires send_whatsapp=true" }, { status: 400 })
      }
      testPhone = digits
    }
    const { data: row, error } = await sb
      .from('ecg_studies')
      .select('accession_no, tricog_ecg_id, patient_name, age, sex, branch_center_id, branch_center_name, diagnosis, final_classification, status, acquired_at, pdf_url, pdf_url_plain, whatsapp_sent_at, whatsapp_message_id, raw_json')
      .eq('tricog_ecg_id', body.tricog_ecg_id)
      .maybeSingle()
    if (error) return Response.json({ error: error.message }, { status: 502 })
    if (!row) return Response.json({ error: 'ECG study not found' }, { status: 404 })
    if (!row.diagnosis || !String(row.diagnosis).trim()) return Response.json({ error: 'ECG has no diagnosis; delivery is gated' }, { status: 409 })

    try {
      const result = await runLocalEcgManualSend(row, body.send_whatsapp, testPhone)
      const stages = { ...(result.stages || {}) }
      const raw = { ...(row.raw_json || {}), manualDelivery: { at: new Date().toISOString(), links: result.links || [], stages } }
      const update = {
        pdf_url: result.links?.[0] || row.pdf_url,
        pdf_url_plain: result.links?.[1] || row.pdf_url_plain,
        raw_json: raw,
      }
      if (body.send_whatsapp && stages.whatsapp?.status === 'ok') {
        update.whatsapp_sent_at = new Date().toISOString()
        update.whatsapp_message_id = stages.whatsapp.detail || null
      }
      const { error: updateError } = await sb.from('ecg_studies').update(update).eq('tricog_ecg_id', row.tricog_ecg_id)
      if (updateError) return Response.json({ error: `Delivery completed but ledger update failed: ${updateError.message}`, result }, { status: 502 })
      stages.ledger = { status: 'ok' }
      return Response.json({ ...result, stages })
    } catch (err) {
      return Response.json({ error: err.message || 'ECG manual send failed' }, { status: 502 })
    }
  }

  if (body.action !== 'LIST' || !body.date) {
    return Response.json({ error: 'Expected { action: "LIST", date: "YYYYMMDD" }' }, { status: 400 })
  }

  const [startUtc, endUtc] = istDayRangeUtc(body.date)
  const { data, error } = await sb
    .from('ecg_studies')
    .select('accession_no, tricog_ecg_id, patient_name, age, sex, branch_center_name, diagnosis, status, acquired_at, pdf_url, pdf_url_plain, whatsapp_sent_at, whatsapp_message_id, raw_json')
    .gte('acquired_at', startUtc)
    .lt('acquired_at', endUtc)
    .order('acquired_at', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 502 })
  return Response.json((data ?? []).map(publicStudy))
}
