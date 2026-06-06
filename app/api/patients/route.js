import { getServiceClient } from '@/lib/supabase'

const TREND_TYPES = new Set(['total_body_trend', 'osteo_trend'])

export async function GET(req) {
  try {
    const sb = getServiceClient()

    const { data: patients, error: pErr } = await sb
      .from('bmd_patients')
      .select('id, mrn, patient_id, first_name, last_name, dob, gender, height_cm, weight_kg, physician')
      .order('patient_id', { ascending: true })

    if (pErr) {
      return Response.json({ error: pErr.message }, { status: 500 })
    }

    // Get all scans to find last_scan_date per patient
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

    // Transform to match expected format
    const transformed = (patients || []).map(p => ({
      ...p,
      name: `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim(),
      last_scan_date: latest[p.id] || null,
    }))

    return Response.json(transformed)
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
