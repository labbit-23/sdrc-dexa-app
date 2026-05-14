/**
 * Supabase data-fetch helpers for osteo scans.
 * Used by the render route and the patient list page.
 */

import { getServiceClient } from './supabase.js'

/**
 * Fetch the most recent osteo scan for a given MRN.
 * Returns null if not found.
 *
 * @param {string} mrn
 * @returns {Promise<object|null>}
 */
export async function fetchLatestOsteoScan(mrn) {
  const sb = getServiceClient()

  // Two queries to avoid self-hosted PostgREST implicit-join issues
  const { data: pat } = await sb
    .from('bmd_patients')
    .select('id, mrn, first_name, last_name, dob, gender, height_cm, weight_kg, physician')
    .eq('mrn', mrn)
    .limit(1)
    .single()
  if (!pat) return null

  const { data, error } = await sb
    .from('bmd_scans')
    .select('id, scan_date, scan_type, image_paths, raw_json')
    .eq('patient_id', pat.id)
    .eq('scan_type', 'osteo')
    .order('scan_date', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) return null

  // The JSONB image_paths column returns {} from supabase-js on self-hosted PostgREST
  // when the value was stored as a JSON string scalar instead of a JSONB object.
  // Fall back to listing Storage directly so images always load.
  let imagePaths = data.image_paths
  if (typeof imagePaths === 'string') {
    try { imagePaths = JSON.parse(imagePaths) } catch { imagePaths = {} }
  }
  const isEmpty = !imagePaths || Object.keys(imagePaths).length === 0
  if (isEmpty) {
    imagePaths = await _findOsteoImagesInStorage(sb, mrn)
  }

  return { ...data, image_paths: imagePaths, bmd_patients: pat }
}

/**
 * List raw-osteo/{mrn}/ in Storage, find the latest timestamp folder that
 * contains scan images, and return { spine, left_femur, right_femur } paths.
 * Used as a fallback when the image_paths JSONB column is empty.
 *
 * @param {object} sb  - Supabase service client
 * @param {string} mrn
 * @returns {Promise<object>}
 */
async function _findOsteoImagesInStorage(sb, mrn) {
  const BUCKET = 'raw-osteo'
  const { data: folders } = await sb.storage.from(BUCKET).list(mrn, {
    sortBy: { column: 'name', order: 'desc' },
  })
  for (const folder of (folders || [])) {
    if (!folder.name) continue
    const { data: files } = await sb.storage.from(BUCKET).list(`${mrn}/${folder.name}`)
    const names = new Set((files || []).map(f => f.name))
    if (names.has('img_spine.png')) {
      const prefix = `${BUCKET}/${mrn}/${folder.name}`
      return {
        spine:       `${prefix}/img_spine.png`,
        left_femur:  names.has('img_left_femur.png')  ? `${prefix}/img_left_femur.png`  : null,
        right_femur: names.has('img_right_femur.png') ? `${prefix}/img_right_femur.png` : null,
      }
    }
  }
  return {}
}

/**
 * Build signed image URLs for the three scan images.
 * Missing images return empty string.
 *
 * @param {object|null} imagePaths  - { spine, left_femur, right_femur } Storage paths
 * @returns {Promise<{spine_url, left_femur_url, right_femur_url}>}
 */
export function buildImageUrls(imagePaths) {
  if (!imagePaths) return { spine_url: '', left_femur_url: '', right_femur_url: '' }
  // Handle rows where image_paths was stored as a JSON string (legacy)
  if (typeof imagePaths === 'string') {
    try { imagePaths = JSON.parse(imagePaths) } catch { return { spine_url: '', left_femur_url: '', right_femur_url: '' } }
  }

  // Proxy through /api/img so the browser only talks to the Next.js server
  // (Supabase Storage is only reachable server-side, not from the browser via Tailscale)
  function proxyUrl(storagePath) {
    if (!storagePath) return ''
    return `/api/img?p=${encodeURIComponent(storagePath)}`
  }

  return {
    spine_url:             proxyUrl(imagePaths.spine),
    left_femur_url:        proxyUrl(imagePaths.left_femur),
    right_femur_url:       proxyUrl(imagePaths.right_femur),
    // Overlay images (mutool-rendered, ROI lines baked in) — fall back to strip image if absent
    spine_overlay_url:       proxyUrl(imagePaths.spine_overlay       || imagePaths.spine),
    left_femur_overlay_url:  proxyUrl(imagePaths.left_femur_overlay  || imagePaths.left_femur),
    right_femur_overlay_url: proxyUrl(imagePaths.right_femur_overlay || imagePaths.right_femur),
  }
}

/**
 * Return all osteo scans for a patient (for trend report).
 *
 * @param {string} mrn
 * @returns {Promise<object[]>}
 */
export async function fetchAllOsteoScans(mrn) {
  const sb = getServiceClient()

  const { data: pat } = await sb
    .from('bmd_patients')
    .select('id, mrn, first_name, last_name, dob, gender, height_cm, weight_kg, physician')
    .eq('mrn', mrn)
    .limit(1)
    .single()
  if (!pat) return []

  const { data, error } = await sb
    .from('bmd_scans')
    .select('id, scan_date, scan_type, image_paths, raw_json')
    .eq('patient_id', pat.id)
    .eq('scan_type', 'osteo')
    .order('scan_date', { ascending: true })

  if (error || !data) return []
  return data.map(s => ({ ...s, bmd_patients: pat }))
}

/**
 * Fetch the most recent total_body scan for a given MRN.
 *
 * @param {string} mrn
 * @returns {Promise<object|null>}
 */
export async function fetchLatestTotalbodyScan(mrn) {
  const sb = getServiceClient()

  const { data: pat } = await sb
    .from('bmd_patients')
    .select('id, mrn, first_name, last_name, dob, gender, height_cm, weight_kg, physician')
    .eq('mrn', mrn)
    .limit(1)
    .single()
  if (!pat) return null

  const { data, error } = await sb
    .from('bmd_scans')
    .select('id, scan_date, scan_type, image_paths, raw_json')
    .eq('patient_id', pat.id)
    .eq('scan_type', 'total_body')
    .order('scan_date', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) return null
  return { ...data, bmd_patients: pat }
}

/**
 * Build signed image URLs for a total body scan's images.
 * Keys: fat_lean, fat_gradient, bone, composite.
 *
 * @param {object|null} imagePaths
 * @returns {Promise<object>}
 */
export function buildTotalbodyImageUrls(imagePaths) {
  if (!imagePaths) return {}
  if (typeof imagePaths === 'string') {
    try { imagePaths = JSON.parse(imagePaths) } catch { return {} }
  }
  const keys = ['fat_lean', 'fat_gradient', 'bone', 'composite']
  const result = {}
  for (const key of keys) {
    if (imagePaths[key]) result[`${key}_url`] = `/api/img?p=${encodeURIComponent(imagePaths[key])}`
  }
  return result
}

/**
 * List all patients with at least one osteo scan.
 * Returns [{mrn, name, last_scan_date, scan_count}]
 *
 * @returns {Promise<Array<{mrn:string, name:string, last_scan_date:string, scan_count:number}>>}
 */
/**
 * List all patients who have scans of a given type.
 *
 * @param {'osteo'|'total_body'|'any'} [scanType='any']
 * @returns {Promise<Array<{mrn, name, last_scan_date, scan_count, scan_types}>>}
 */
export async function listPatients(scanType = 'any') {
  const sb = getServiceClient()

  const { data: patients, error: pErr } = await sb
    .from('bmd_patients')
    .select('id, mrn, first_name, last_name')
    .not('mrn', 'is', null)
    .order('last_name')

  if (pErr || !patients) return []

  const { data: scans, error: sErr } = await sb
    .from('bmd_scans')
    .select('patient_id, scan_date, scan_type')

  const allScans = sErr ? [] : (scans ?? [])

  // Group scans by patient uuid
  const byPatient = {}
  for (const s of allScans) {
    if (!byPatient[s.patient_id]) byPatient[s.patient_id] = []
    byPatient[s.patient_id].push(s)
  }

  return patients
    .map(p => {
      let patScans = byPatient[p.id] ?? []
      if (scanType !== 'any') patScans = patScans.filter(s => s.scan_type === scanType)
      if (!patScans.length) return null
      const sorted = [...patScans].sort((a, b) => b.scan_date.localeCompare(a.scan_date))
      const types  = [...new Set(patScans.map(s => s.scan_type))]
      return {
        mrn:            p.mrn,
        name:           `${p.last_name} ${p.first_name}`.trim(),
        last_scan_date: sorted[0]?.scan_date ?? '',
        scan_count:     patScans.length,
        scan_types:     types,
      }
    })
    .filter(Boolean)
}

/** @deprecated Use listPatients('osteo') */
export async function listOsteoPatients() {
  const sb = getServiceClient()
  const { data, error } = await sb
    .from('bmd_patients')
    .select(`mrn, first_name, last_name, bmd_scans ( scan_date )`)
    .not('mrn', 'is', null)
    .eq('bmd_scans.scan_type', 'osteo')
    .order('last_name')

  if (error || !data) return []

  return data
    .filter(p => p.bmd_scans?.length)
    .map(p => {
      const scans  = p.bmd_scans ?? []
      const sorted = [...scans].sort((a, b) => b.scan_date.localeCompare(a.scan_date))
      return {
        mrn:            p.mrn,
        name:           `${p.last_name} ${p.first_name}`.trim(),
        last_scan_date: sorted[0]?.scan_date ?? '',
        scan_count:     scans.length,
      }
    })
}
