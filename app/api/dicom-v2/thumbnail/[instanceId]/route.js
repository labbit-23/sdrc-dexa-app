/**
 * Proxy for the dicom_export worker's CT thumbnail endpoint
 * (GET /api/dicom-thumbnail/{instanceId} on port 8086). Same reason as
 * the sibling POST proxy in ../route.js -- the browser can't reach the
 * worker's internal address directly. Streams the image bytes straight
 * through rather than buffering as JSON.
 */

export const dynamic = 'force-dynamic'

const BASE_URL = (process.env.DICOM_EXPORT_V2_URL ?? '').replace(/\/$/, '')

export async function GET(req, { params }) {
  if (!BASE_URL) {
    return new Response('DICOM_EXPORT_V2_URL not configured', { status: 503 })
  }
  const { instanceId } = await params
  try {
    const upstream = await fetch(`${BASE_URL}/api/dicom-thumbnail/${encodeURIComponent(instanceId)}`)
    const buf = await upstream.arrayBuffer()
    return new Response(buf, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') ?? 'image/png',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (e) {
    return new Response('thumbnail proxy error: ' + e.message, { status: 502 })
  }
}
