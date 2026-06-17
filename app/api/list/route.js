/**
 * GET /api/list?page=0&q=
 * Paginated patient list, 20 per page, ordered by most recent scan date.
 * When q is provided, searches name/MRN in Supabase and returns flat results.
 */

import { NextResponse }      from 'next/server'
import { getServiceClient }  from '@/lib/supabase.js'

export const dynamic = 'force-dynamic'

const PAGE_SIZE  = 20
const TREND_TYPES = new Set(['osteo_trend', 'total_body_trend'])
const OSTEO_TYPES = new Set(['osteo', 'spine_only', 'spine_femur', 'dual_femur'])
const TB_TYPES    = new Set(['total_body'])

function buildRows(patients, scans) {
  const byPatient = {}
  for (const s of scans) {
    if (TREND_TYPES.has(s.scan_type)) continue
    if (!byPatient[s.patient_id]) byPatient[s.patient_id] = []
    byPatient[s.patient_id].push(s)
  }
  return patients
    .map(p => {
      const ps = byPatient[p.id] ?? []
      if (!ps.length) return null
      const sorted = [...ps].sort((a, b) => b.scan_date.localeCompare(a.scan_date))
      const types  = [...new Set(ps.map(s => s.scan_type))]
      return {
        mrn:            p.mrn,
        name:           `${p.last_name || ''} ${p.first_name || ''}`.trim(),
        dob:            p.dob  ?? '',
        gender:         p.gender ?? '',
        last_scan_date: sorted[0].scan_date,
        scan_count:     ps.length,
        scan_types:     types,
        has_osteo:      types.some(t => OSTEO_TYPES.has(t)),
        has_total_body: types.some(t => TB_TYPES.has(t)),
        scans:          sorted,  // Include individual scans sorted by date (newest first)
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.last_scan_date.localeCompare(a.last_scan_date))
}

export async function GET(req) {
  const sb   = getServiceClient()
  const page = Math.max(0, parseInt(req.nextUrl.searchParams.get('page') ?? '0'))
  const q    = (req.nextUrl.searchParams.get('q') ?? '').trim()

  try {
    if (q) {
      // Search mode: ilike on patients → fetch their scans
      const { data: patients, error: pErr } = await sb
        .from('bmd_patients')
        .select('id, mrn, first_name, last_name, dob, gender')
        .not('mrn', 'is', null)
        .or(`mrn.ilike.%${q}%,last_name.ilike.%${q}%,first_name.ilike.%${q}%`)
        .limit(100)

      if (pErr || !patients?.length) return NextResponse.json({ patients: [], total: 0, pages: 0 })

      const { data: scans } = await sb
        .from('bmd_scans')
        .select('patient_id, scan_date, scan_type')
        .in('patient_id', patients.map(p => p.id))

      const rows = buildRows(patients, scans ?? [])
      return NextResponse.json({ patients: rows, total: rows.length, pages: 1, page: 0 })
    }

    // Paginated mode: aggregate latest scan per patient, then page through
    // Fetch lightweight scan index (patient_id + scan_date only)
    const { data: allScans } = await sb
      .from('bmd_scans')
      .select('patient_id, scan_date, scan_type')

    // Aggregate: max scan_date per patient (excluding trends)
    const latest = {}
    for (const s of allScans ?? []) {
      if (TREND_TYPES.has(s.scan_type)) continue
      if (!latest[s.patient_id] || s.scan_date > latest[s.patient_id]) {
        latest[s.patient_id] = s.scan_date
      }
    }

    const sorted   = Object.keys(latest).sort((a, b) => latest[b].localeCompare(latest[a]))
    const total    = sorted.length
    const pages    = Math.max(1, Math.ceil(total / PAGE_SIZE))
    const pageIds  = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

    if (!pageIds.length) return NextResponse.json({ patients: [], total, pages, page })

    const [{ data: patients }, { data: scans }] = await Promise.all([
      sb.from('bmd_patients')
        .select('id, mrn, first_name, last_name, dob, gender')
        .in('id', pageIds),
      sb.from('bmd_scans')
        .select('patient_id, scan_date, scan_type')
        .in('patient_id', pageIds),
    ])

    const rows = buildRows(patients ?? [], scans ?? [])
    return NextResponse.json({ patients: rows, total, pages, page })

  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
