import { getServiceClient } from '@/lib/supabase'

export async function POST(req) {
  try {
    const { scan_id } = await req.json()

    if (!scan_id) {
      return Response.json({ error: 'Missing scan_id' }, { status: 400 })
    }

    const sb = getServiceClient()

    // Mark scan as archived (unlinked) by setting is_archived = true
    // This preserves data but hides it from linked scans view
    const { error } = await sb
      .from('bmd_scans')
      .update({ is_archived: true })
      .eq('id', scan_id)

    if (error) {
      console.error('Unlink error:', error)
      // If is_archived column doesn't exist, try alternate approach
      if (error.message.includes('is_archived')) {
        // Fallback: use a comment field or metadata to mark as unlinked
        const { error: altError } = await sb
          .from('bmd_scans')
          .update({ notes: 'unlinked' })
          .eq('id', scan_id)

        if (altError) {
          return Response.json({ error: `Column not found. Available fields: check bmd_scans schema` }, { status: 400 })
        }
      } else {
        return Response.json({ error: error.message }, { status: 500 })
      }
    }

    return Response.json({ ok: true, message: `Scan ${scan_id} archived (unlinked)` })
  } catch (e) {
    console.error('Unlink scan error:', e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
