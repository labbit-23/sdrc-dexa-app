import { getServiceClient } from '@/lib/supabase'

export async function POST(req) {
  try {
    const { scan_id, source_patient_id, target_patient_id, correct_patient_id } = await req.json()

    if (!source_patient_id || !target_patient_id || !correct_patient_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const sb = getServiceClient()
    const duplicate_patient_id = correct_patient_id === source_patient_id ? target_patient_id : source_patient_id

    // Relink all scans from duplicate to correct patient
    const { error: relinkError } = await sb
      .from('bmd_scans')
      .update({ patient_id: correct_patient_id })
      .eq('patient_id', duplicate_patient_id)

    if (relinkError) {
      return Response.json({ error: `Consolidation failed: ${relinkError.message}` }, { status: 500 })
    }

    // Disable duplicate patient (mark as inactive)
    const { error: disableError } = await sb
      .from('bmd_patients')
      .update({ is_active: false })
      .eq('id', duplicate_patient_id)

    if (disableError && !disableError.message.includes('is_active')) {
      console.warn('Could not disable patient - column may not exist:', disableError)
    }

    // Now link the scan to trend type
    const { data: existingScan } = await sb
      .from('bmd_scans')
      .select('scan_type')
      .eq('id', scan_id)
      .single()

    const trendType = existingScan?.scan_type?.includes('_trend')
      ? existingScan.scan_type
      : `${existingScan?.scan_type ?? 'osteo'}_trend`

    const { error: linkError } = await sb
      .from('bmd_scans')
      .update({ scan_type: trendType })
      .eq('id', scan_id)

    if (linkError) {
      return Response.json({ error: linkError.message }, { status: 500 })
    }

    return Response.json({
      ok: true,
      message: `Consolidated duplicate records and linked scan to correct patient`
    })
  } catch (e) {
    console.error('Consolidation error:', e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
