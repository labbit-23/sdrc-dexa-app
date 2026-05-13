/**
 * Supabase data-fetch helpers for osteo scans.
 * Used by the render route and the patient list page.
 */

import { getServiceClient, signedImageUrl } from './supabase.js'

/**
 * Fetch the most recent osteo scan for a given MRN.
 * Returns null if not found.
 *
 * @param {string} mrn
 * @returns {Promise<object|null>}
 */
export async function fetchLatestOsteoScan(mrn) {
  const sb = getServiceClient()
  const { data, error } = await sb
    .from('bmd_scans')
    .select(`
      id, scan_date, scan_type, image_paths, raw_json,
      bmd_patients ( id, mrn, first_name, last_name, dob, gender, height_cm, weight_kg, physician )
    `)
    .eq('scan_type', 'osteo')
    .eq('bmd_patients.mrn', mrn)
    .order('scan_date', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) return null
  return data
}

/**
 * Build signed image URLs for the three scan images.
 * Missing images return empty string.
 *
 * @param {object|null} imagePaths  - { spine, left_femur, right_femur } Storage paths
 * @returns {Promise<{spine_url, left_femur_url, right_femur_url}>}
 */
export async function buildImageUrls(imagePaths) {
  if (!imagePaths) return { spine_url: '', left_femur_url: '', right_femur_url: '' }

  async function safe(key) {
    const p = imagePaths[key]
    if (!p) return ''
    try { return await signedImageUrl(p) } catch { return '' }
  }

  const [spine_url, left_femur_url, right_femur_url] = await Promise.all([
    safe('spine'),
    safe('left_femur'),
    safe('right_femur'),
  ])
  return { spine_url, left_femur_url, right_femur_url }
}

/**
 * Return all osteo scans for a patient (for trend report).
 *
 * @param {string} mrn
 * @returns {Promise<object[]>}
 */
export async function fetchAllOsteoScans(mrn) {
  const sb = getServiceClient()
  const { data, error } = await sb
    .from('bmd_scans')
    .select(`
      id, scan_date, scan_type, image_paths, raw_json,
      bmd_patients ( id, mrn, first_name, last_name, dob, gender, height_cm, weight_kg, physician )
    `)
    .eq('scan_type', 'osteo')
    .eq('bmd_patients.mrn', mrn)
    .order('scan_date', { ascending: true })

  if (error || !data) return []
  return data
}

/**
 * List all patients with at least one osteo scan.
 * Returns [{mrn, name, last_scan_date, scan_count}]
 *
 * @returns {Promise<Array<{mrn:string, name:string, last_scan_date:string, scan_count:number}>>}
 */
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
