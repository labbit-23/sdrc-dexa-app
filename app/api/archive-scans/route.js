import { getServiceClient } from '@/lib/supabase'
import fs from 'fs'

export async function GET(req) {
  try {
    const sb = getServiceClient()
    const page = Math.max(0, parseInt(req.nextUrl.searchParams.get('page') ?? '0'))
    const limit = Math.min(100, Math.max(10, parseInt(req.nextUrl.searchParams.get('limit') ?? '20')))
    const sortBy = req.nextUrl.searchParams.get('sort_by') ?? 'scan_date'
    const sortAsc = req.nextUrl.searchParams.get('sort_order') === 'asc'
    const patientId = req.nextUrl.searchParams.get('patient_id')
    const q = (req.nextUrl.searchParams.get('q') ?? '').trim()

    // Search mode: if query provided, search patients first
    if (q) {
      const { data: patients, error: pErr } = await sb
        .from('bmd_patients')
        .select('id, patient_id, first_name, last_name')
        .not('patient_id', 'is', null)
        .or(`patient_id.ilike.%${q}%,last_name.ilike.%${q}%,first_name.ilike.%${q}%`)
        .limit(100)

      if (pErr || !patients?.length) {
        return Response.json({
          data: [],
          page,
          limit,
          sort_by: sortBy,
          sort_order: sortAsc ? 'asc' : 'desc',
          total: 0,
          search: q,
        })
      }

      // Get all scans for matching patients
      const { data: supabaseScans, error } = await sb
        .from('bmd_scans')
        .select(`
          id,
          scan_date,
          scan_type,
          patient:bmd_patients(id, patient_id, first_name, last_name)
        `)
        .in('patient_id', patients.map(p => p.id))
        .order(sortBy, { ascending: sortAsc })

      if (error) {
        console.error('Supabase error:', error)
        return Response.json({ error: error.message }, { status: 500 })
      }

      const archives = (supabaseScans || []).map(s => ({
        id: s.id,
        scan_date: s.scan_date,
        scan_type: s.scan_type,
        source: 'supabase',
        patient: s.patient ? {
          patient_id: s.patient.patient_id,
          name: `${s.patient.first_name ?? ''} ${s.patient.last_name ?? ''}`.trim(),
        } : null,
      }))

      // Add Machine MDB if exists
      if (process.env.MDB_PATH) {
        try {
          if (fs.existsSync(process.env.MDB_PATH)) {
            archives.push({
              id: `mdb_machine_${process.env.MDB_PATH}`,
              scan_date: null,
              scan_type: 'total_body',
              source: 'mdb_machine',
              archive_label: 'lunar.mdb',
              archive_path: process.env.MDB_PATH,
              mdb_source: 'Machine MDB',
              patient: null,
            })
          }
        } catch (e) {
          console.log('Machine MDB error:', e.message)
        }
      }

      // Add archive MDBs if ENV paths exist
      if (process.env.ARCHIVE_MDB_PATH) {
        try {
          const archivePaths = process.env.ARCHIVE_MDB_PATH.split(',').filter(Boolean)
          archivePaths.forEach((archPath, idx) => {
            try {
              if (fs.existsSync(archPath)) {
                const filename = archPath.split('/').pop()
                archives.push({
                  id: `mdb_archive_${idx}_${archPath}`,
                  scan_date: null,
                  scan_type: 'total_body',
                  source: 'mdb_archive',
                  archive_label: filename,
                  archive_path: archPath,
                  mdb_source: `MDB Archive ${idx + 1}`,
                  patient: null,
                })
              }
            } catch (pathErr) {
              console.log(`Archive path not accessible: ${archPath}`)
            }
          })
        } catch (e) {
          console.log('Archive MDB error:', e.message)
        }
      }

      return Response.json({
        data: archives,
        page: 0,
        limit: archives.length,
        sort_by: sortBy,
        sort_order: sortAsc ? 'asc' : 'desc',
        total: archives.length,
        search: q,
      })
    }

    // Normal pagination mode
    let query = sb
      .from('bmd_scans')
      .select(`
        id,
        scan_date,
        scan_type,
        patient:bmd_patients(id, patient_id, first_name, last_name)
      `)

    // Filter options:
    if (patientId) {
      // Get scans for a specific patient (for viewing their linked archives)
      query = query.eq('patient_id', patientId)
    } else {
      // Get potential unlinked/older scans for archive linking
      // Exclude latest total_body per patient to avoid showing current scans
      query = query.neq('scan_type', 'total_body')
    }

    const { data: supabaseScans, error } = await query
      .order(sortBy, { ascending: sortAsc })
      .range(page * limit, (page + 1) * limit - 1)

    if (error) {
      console.error('Supabase error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    const archives = (supabaseScans || []).map(s => ({
      id: s.id,
      scan_date: s.scan_date,
      scan_type: s.scan_type,
      source: 'supabase',
      patient: s.patient ? {
        patient_id: s.patient.patient_id,
        name: `${s.patient.first_name ?? ''} ${s.patient.last_name ?? ''}`.trim(),
      } : null,
    }))

    return Response.json({
      data: archives,
      page,
      limit,
      sort_by: sortBy,
      sort_order: sortAsc ? 'asc' : 'desc',
      total: archives.length,
    })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
