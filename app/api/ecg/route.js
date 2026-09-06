/**
 * ECG study activity API — reads ecg_studies (populated by the Mirth
 * "Tricog ECG Portal Fetcher" channel) for the ECG workspace page.
 */

import { getServiceClient } from '@/lib/supabase.js'

export const dynamic = 'force-dynamic'

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000

/** 'YYYYMMDD' (IST calendar date) -> [startUtcIso, endUtcIso) */
function istDayRangeUtc(yyyymmdd) {
  const y = Number(yyyymmdd.slice(0, 4))
  const m = Number(yyyymmdd.slice(4, 6))
  const d = Number(yyyymmdd.slice(6, 8))
  // Midnight IST for this calendar date, expressed as a UTC instant.
  const startUtcMs = Date.UTC(y, m - 1, d) - IST_OFFSET_MS
  const endUtcMs = startUtcMs + 24 * 60 * 60 * 1000
  return [new Date(startUtcMs).toISOString(), new Date(endUtcMs).toISOString()]
}

export async function POST(req) {
  let body
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (body.action !== 'LIST' || !body.date) {
    return Response.json({ error: 'Expected { action: "LIST", date: "YYYYMMDD" }' }, { status: 400 })
  }

  const [startUtc, endUtc] = istDayRangeUtc(body.date)

  const sb = getServiceClient()
  const { data, error } = await sb
    .from('ecg_studies')
    .select('accession_no, patient_name, age, sex, branch_center_name, diagnosis, status, acquired_at, pdf_url, whatsapp_sent_at, whatsapp_message_id')
    .gte('acquired_at', startUtc)
    .lt('acquired_at', endUtc)
    .order('acquired_at', { ascending: false })

  if (error) {
    return Response.json({ error: error.message }, { status: 502 })
  }

  return Response.json(data ?? [])
}
