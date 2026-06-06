import { readFileSync } from 'fs'

export async function POST(req) {
  try {
    const { archive_path } = await req.json()

    if (!archive_path) {
      return Response.json({ error: 'Missing archive_path' }, { status: 400 })
    }

    // Read MDB file
    let mdbData = readFileSync(archive_path, 'utf8')

    // Parse JSON (handle double-encoding)
    let parsed = mdbData
    for (let i = 0; i < 2 && typeof parsed === 'string'; i++) {
      try { parsed = JSON.parse(parsed) } catch { break }
    }

    if (!parsed || typeof parsed !== 'object') {
      return Response.json({ error: 'Could not parse MDB file' }, { status: 400 })
    }

    // Extract scan_date
    const snap = parsed.mdb_snapshot ?? {}
    const examRow = snap.exams?.[0]
    const scanDate = examRow?._acq_dt ?? null

    // Extract scan_type
    const storagePrefix = parsed.storage_prefix ?? ''
    const detectedType = storagePrefix.startsWith('raw-totalbody') || parsed.scan_type === 'total_body'
      ? 'total_body'
      : 'osteo'

    return Response.json({
      ok: true,
      scan_date: scanDate,
      scan_type: detectedType,
      trend_type: `${detectedType}_trend`
    })
  } catch (e) {
    return Response.json({ error: `Failed to preview MDB: ${e.message}` }, { status: 400 })
  }
}
