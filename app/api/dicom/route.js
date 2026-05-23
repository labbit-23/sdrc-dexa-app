/**
 * Proxy for the DICOM sidecar (manualsend endpoint).
 * Reads DICOM_ENDPOINT from env so the URL is never hardcoded in static files.
 */

export const dynamic = 'force-dynamic'

const ENDPOINT = (process.env.DICOM_ENDPOINT ?? '').replace(/\/$/, '') + '/manualsend/'

export async function POST(req) {
  if (!ENDPOINT || ENDPOINT === '/manualsend/') {
    return new Response(JSON.stringify({ error: 'DICOM_ENDPOINT not configured' }), {
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
