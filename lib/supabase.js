import { createClient } from '@supabase/supabase-js'

const url     = process.env.NEXT_PUBLIC_SUPABASE_URL
const anon    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const service = process.env.SUPABASE_SERVICE_KEY

/** Browser / RSC client (anon key — read-only) */
export const supabase = createClient(url, anon)

/** Server-only client (service role — full access). Call inside server components / routes. */
export function getServiceClient() {
  return createClient(url, service)
}

// ── Storage helpers ────────────────────────────────────────────────────────

const RAW_BUCKET = 'raw-osteo'

/**
 * Return a signed URL (1 hour) for a private raw-osteo Storage object.
 * storagePath example: "raw-osteo/MRN123/20260513T103000Z/img_spine.png"
 *
 * @param {string} storagePath
 * @returns {Promise<string>}
 */
export async function signedImageUrl(storagePath) {
  const sb = getServiceClient()
  // storagePath includes the bucket prefix — strip it for the API call
  const objectPath = storagePath.replace(/^raw-osteo\//, '')
  const { data, error } = await sb.storage
    .from(RAW_BUCKET)
    .createSignedUrl(objectPath, 3600)
  if (error || !data) throw new Error(`Cannot sign URL for ${storagePath}: ${error?.message}`)
  return data.signedUrl
}
