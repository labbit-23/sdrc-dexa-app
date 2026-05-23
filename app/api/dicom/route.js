/**
 * Proxy for the DICOM sidecar (manualsend endpoint).
 * Reads DICOM_SEND_URL (falls back to DICOM_ENDPOINT) so the URL is never hardcoded in static files.
 */

export const dynamic = 'force-dynamic'

const BASE_URL  = (process.env.DICOM_SEND_URL ?? process.env.DICOM_ENDPOINT ?? '').replace(/\/$/, '')
const ENDPOINT  = BASE_URL ? BASE_URL + '/manualsend/' : ''

export async function POST(req) {
  if (!ENDPOINT) {
    return new Response(JSON.stringify({ error: 'DICOM_SEND_URL not configured' }), {
      status: 503, headers: { 'Content-Type': 'application/json' },
    })
  }
  try {
    const body = await req.text()
    const upstream = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })
    const text = await upstream.text()
    return new Response(text, {
      status: upstream.status,
      headers: { 'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 502, headers: { 'Content-Type': 'application/json' },
    })
  }
}
