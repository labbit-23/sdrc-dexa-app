import { getServiceClient } from '@/lib/supabase'
import { readFileSync } from 'fs'
import { computeReportData } from '@/lib/bmd-compute'

export async function POST(req) {
  try {
    const { scan_id, source, patient_id, scan_type, archive_label, archive_path } = await req.json()

    if (!patient_id || !scan_type) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const sb = getServiceClient()

    // Get patient by patient_id (MRN)
    const { data: patient, error: patError } = await sb
      .from('bmd_patients')
      .select('id')
      .eq('patient_id', patient_id)
      .single()

    if (patError || !patient) {
      return Response.json({ error: 'Patient not found' }, { status: 404 })
    }

    if (source === 'supabase') {
      // Link existing Supabase scan to this patient
      // Get existing scan + source patient info
      const { data: existingScan, error: scanError } = await sb
        .from('bmd_scans')
        .select('scan_type, patient_id')
        .eq('id', scan_id)
        .single()

      if (scanError || !existingScan) {
        return Response.json({ error: 'Scan not found' }, { status: 404 })
      }

      // Get source and target patient records for consolidation check
      const { data: sourcePatient } = await sb
        .from('bmd_patients')
        .select('id, patient_id, first_name, last_name, dob')
        .eq('id', existingScan.patient_id)
        .single()

      // Check if consolidation needed (same MRN but different patient records)
      const needsConsolidation = sourcePatient &&
        sourcePatient.patient_id === patient_id &&
        sourcePatient.id !== patient.id

      if (needsConsolidation) {
        // RETURN consolidation info - user must manually confirm which is correct
        return Response.json({
          needsConsolidation: true,
          sourcePatient: {
            id: sourcePatient.id,
            name: `${sourcePatient.first_name ?? ''} ${sourcePatient.last_name ?? ''}`.trim(),
            mrn: sourcePatient.patient_id,
            dob: sourcePatient.dob,
          },
          targetPatient: {
            id: patient.id,
            mrn: patient_id,
          },
          message: 'Two patient records found with same MRN. Choose which is correct to consolidate.'
        })
      }

      // Normal linking (no consolidation needed)
      const trendType = existingScan.scan_type.includes('_trend')
        ? existingScan.scan_type
        : `${existingScan.scan_type}_trend`

      const { error: updateError } = await sb
        .from('bmd_scans')
        .update({
          patient_id: patient.id,
          scan_type: trendType,
        })
        .eq('id', scan_id)

      if (updateError) {
        return Response.json({ error: updateError.message }, { status: 500 })
      }

      return Response.json({ ok: true, message: `Linked Supabase scan to patient ${patient_id}` })
    } else if (source === 'mdb_archive') {
      // Import from MDB archive and link
      try {
        // Read MDB file (could be JSON or text)
        let mdbData = readFileSync(archive_path, 'utf8')

        // Parse JSON (handle double-encoding)
        let parsed = mdbData
        for (let i = 0; i < 2 && typeof parsed === 'string'; i++) {
          try { parsed = JSON.parse(parsed) } catch { break }
        }

        if (!parsed || typeof parsed !== 'object') {
          return Response.json({ error: 'Could not parse MDB file' }, { status: 400 })
        }

        // Extract scan_date and scan_type from MDB data
        const snap = parsed.mdb_snapshot ?? {}
        const examRow = snap.exams?.[0]
        const scanDate = examRow?._acq_dt ?? new Date().toISOString()
        const scanDateOnly = scanDate.slice(0, 10) // YYYY-MM-DD for date matching

        // Check if patient already has a scan on this date
        const { data: existingScans } = await sb
          .from('bmd_scans')
          .select('id, scan_date')
          .eq('patient_id', patient.id)
          .or(`scan_date.gte.${scanDateOnly}T00:00:00,scan_date.lt.${scanDateOnly}T23:59:59`)

        if (existingScans && existingScans.length > 0) {
          return Response.json({
            error: `Patient already has a scan on ${scanDateOnly}. Cannot link to avoid duplicate data and ROI confusion.`,
            existingDate: scanDateOnly,
            status: 'duplicate_date'
          }, { status: 400 })
        }

        // Auto-detect scan type from MDB (same logic as Fetch Studies)
        const storagePrefix = parsed.storage_prefix ?? ''
        const detectedType = storagePrefix.startsWith('raw-totalbody') || parsed.scan_type === 'total_body'
          ? 'total_body'
          : 'osteo'

        // Convert to trend type
        const trendType = `${detectedType}_trend`

        // Insert with actual MDB data
        const { error: insertError } = await sb
          .from('bmd_scans')
          .insert({
            patient_id: patient.id,
            scan_date: scanDate,
            scan_type: trendType,
            raw_json: JSON.stringify(parsed),
            image_paths: [],
          })

        if (insertError) {
          return Response.json({ error: insertError.message }, { status: 500 })
        }

        return Response.json({ ok: true, message: `Imported and linked MDB archive (${scanDate}) to patient ${patient_id}` })
      } catch (e) {
        return Response.json({ error: `Failed to read MDB file: ${e.message}` }, { status: 400 })
      }
    }

    return Response.json({ error: 'Invalid source' }, { status: 400 })
  } catch (e) {
    console.error('Link scan error:', e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
