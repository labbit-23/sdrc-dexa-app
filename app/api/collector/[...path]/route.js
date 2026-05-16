/**
 * Thin proxy to the local FastAPI collector sidecar (localhost:7437).
 * Handles GET and POST; transparently forwards SSE streams for /upload/*.
 */

const SIDECAR = 'http://127.0.0.1:7437'

async function proxy(req, { params }) {
  const path = (await params).path.join('/')
  const url  = new URL(`${SIDECAR}/${path}`)

  // Forward query params
  req.nextUrl.searchParams.forEach((v, k) => url.searchParams.set(k, v))

  const isPost = req.method === 'POST'
  const body   = isPost ? await req.text() : undefined

  let upstream
  try {
    upstream = await fetch(url.toString(), {
      method:  req.method,
      headers: isPost ? { 'Content-Type': 'application/json' } : {},
      body,
      // Needed to stream the SSE response body without buffering
      duplex: 'half',
    })
  } catch (e) {
    return new Response(
      JSON.stringify({ error: 'Collector API offline', detail: e.message }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const contentType = upstream.headers.get('Content-Type') ?? 'application/json'

  return new Response(upstream.body, {
    status:  upstream.status,
    headers: {
      'Content-Type':      contentType,
      'Cache-Control':     'no-cache, no-store',
      'X-Accel-Buffering': 'no',        // tell nginx not to buffer SSE
    },
  })
}

export const GET  = proxy
export const POST = proxy
