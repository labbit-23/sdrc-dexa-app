/**
 * Fetch the latest osteo scan for a patient from Supabase,
 * and return signed image URLs from Storage.
 *
 * Used by:
 *   /bmd/render/osteo/[mrn]  — HTML render route
 *   /api/pdf                 — Puppeteer PDF generation
 */

import type { RawOsteoData } from './osteo-types'
import { getServiceClient, signedImageUrl } from './supabase'

export type ScanRow = {
  id:           string
  scan_date:    string
  scan_type:    string
  image_paths:  Record<string, string> | null
  raw_json:     RawOsteoData
  bmd_patients: {
    id:         string
    mrn:        string
    first_name: string
    last_name:  string
    dob:        string
    gender:     string
    height_cm:  number
    weight_kg:  number
    physician:  string
  }
}

/**
 * Fetch the most recent osteo scan for a given MRN.
 * Returns null if not found.
 */
export async function fetchLatestOsteoScan(mrn: string): Promise<ScanRow | null> {
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
  return data as unknown as ScanRow
}

/**
 * Build signed image URLs for the three scan images stored in raw-osteo bucket.
 * Falls back gracefully — missing images return empty string.
 */
export async function buildImageUrls(
  imagePaths: Record<string, string> | null,
): Promise<{ spine_url: string; left_femur_url: string; right_femur_url: string }> {
  if (!imagePaths) return { spine_url: '', left_femur_url: '', right_femur_url: '' }

  async function safe(key: string): Promise<string> {
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
 */
export async function fetchAllOsteoScans(mrn: string): Promise<ScanRow[]> {
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
  return data as unknown as ScanRow[]
}

/**
 * List all patients who have at least one osteo scan.
 * Returns [{mrn, name, last_scan_date, scan_count}]
 */
export async function listOsteoPatients(): Promise<
  Array<{ mrn: string; name: string; last_scan_date: string; scan_count: number }>
> {
  const sb = getServiceClient()

  const { data, error } = await sb
    .from('bmd_patients')
    .select(`
      mrn, first_name, last_name,
      bmd_scans ( scan_date )
    `)
    .not('mrn', 'is', null)
    .eq('bmd_scans.scan_type', 'osteo')
    .order('last_name')

  if (error || !data) return []

  return (data as any[])
    .filter(p => p.bmd_scans?.length)
    .map(p => {
      const scans: { scan_date: string }[] = p.bmd_scans || []
      const sorted = [...scans].sort((a, b) => b.scan_date.localeCompare(a.scan_date))
      return {
        mrn:            p.mrn,
        name:           `${p.last_name} ${p.first_name}`.trim(),
        last_scan_date: sorted[0]?.scan_date ?? '',
        scan_count:     scans.length,
      }
    })
}
