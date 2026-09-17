/**
 * Proxy for the new dicom_export Python worker (LIST / manual-send).
 * Reads DICOM_EXPORT_V2_URL so the URL is never hardcoded in static files.
 * Separate route from /api/dicom on purpose -- that one still proxies the
 * live Mirth sidecar (port 8085) and must not be touched by this cutover-
 * ahead-of-cutover work. This proxies the new worker (port 8086) instead.
 */

export const dynamic = 'force-dynamic'

const BASE_URL = (process.env.DICOM_EXPORT_V2_URL ?? '').replace(/\/$/, '')
const ENDPOINT = BASE_URL ? BASE_URL + '/api/dicom' : ''

export async function POST(req) {
  if (!ENDPOINT) {
    return new Response(JSON.stringify({ error: 'DICOM_EXPORT_V2_URL not configured' }), {
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
