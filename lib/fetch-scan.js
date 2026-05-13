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
  // Handle rows where image_paths was stored as a JSON string (legacy)
  if (typeof imagePaths === 'string') {
    try { imagePaths = JSON.parse(imagePaths) } catch { return { spine_url: '', left_femur_url: '', right_femur_url: '' } }
  }

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
 * Fetch the most recent total_body scan for a given MRN.
 *
 * @param {string} mrn
 * @returns {Promise<object|null>}
 */
export async function fetchLatestTotalbodyScan(mrn) {
  const sb = getServiceClient()
  const { data, error } = await sb
    .from('bmd_scans')
    .select(`
      id, scan_date, scan_type, image_paths, raw_json,
      bmd_patients ( id, mrn, first_name, last_name, dob, gender, height_cm, weight_kg, physician )
    `)
    .eq('scan_type', 'total_body')
    .eq('bmd_patients.mrn', mrn)
    .order('scan_date', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) return null
  return data
}

/**
 * Build signed image URLs for a total body scan's images.
 * Keys: fat_lean, fat_gradient, bone, composite.
 *
 * @param {object|null} imagePaths
 * @returns {Promise<object>}
 */
export async function buildTotalbodyImageUrls(imagePaths) {
  if (!imagePaths) return {}
  const keys = ['fat_lean', 'fat_gradient', 'bone', 'composite']
  const result = {}
  await Promise.all(keys.map(async key => {
    const p = imagePaths[key]
    if (!p) return
    try { result[`${key}_url`] = await signedImageUrl(p) } catch { result[`${key}_url`] = '' }
  }))
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
