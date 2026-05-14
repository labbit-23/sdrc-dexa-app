import { createClient } from '@supabase/supabase-js'

const url     = process.env.NEXT_PUBLIC_SUPABASE_URL
const anon    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const service = process.env.SUPABASE_SERVICE_ROLE_KEY

/** Browser / RSC client (anon key — read-only) */
export const supabase = createClient(url, anon)

/** Server-only client (service role — full access). Call inside server components / routes. */
export function getServiceClient() {
  return createClient(url, service, {
    global: {
      // Disable Next.js data-cache for all Supabase fetches so list/report
      // pages always show fresh data (not stale cached rows).
      fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }),
    },
  })
}

// ── Storage helpers ────────────────────────────────────────────────────────

const KNOWN_BUCKETS = ['raw-osteo', 'raw-totalbody']

/**
 * Return a signed URL (1 hour) for a private Storage object.
 * storagePath example: "raw-osteo/MRN/ts/img_spine.png"
 *                   or "raw-totalbody/MRN/ts/img_fat_lean.png"
 *
 * @param {string} storagePath
 * @returns {Promise<string>}
 */
export async function signedImageUrl(storagePath) {
  const sb = getServiceClient()
  const bucket = KNOWN_BUCKETS.find(b => storagePath.startsWith(b + '/'))
  if (!bucket) throw new Error(`Unknown bucket for path: ${storagePath}`)
  const objectPath = storagePath.slice(bucket.length + 1)
  const { data, error } = await sb.storage
    .from(bucket)
    .createSignedUrl(objectPath, 3600)
  if (error || !data) throw new Error(`Cannot sign URL for ${storagePath}: ${error?.message}`)
  return data.signedUrl
}
