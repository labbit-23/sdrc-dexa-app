/**
 * GET /api/tb-meta?mrn=MRN123
 *
 * Returns patient name, latest scan date, and symmetry flags for the
 * total-body report toolbar. Used to show the ROI warning banner and
 * build patient-friendly PDF filenames.
 */

import { NextResponse } from 'next/server'
import { fetchLatestTotalbodyScan } from '@/lib/fetch-scan.js'

const BILATERAL_LABELS = {
  51: 'left_arm', 52: 'left_leg', 53: 'left_trunk', 54: 'left_total',
  55: 'right_arm', 56: 'right_leg', 57: 'right_trunk', 58: 'right_total',
}

function computeSymmetry(raw) {
  const snap = raw?.mdb_snapshot
  const compEntries = Object.values(snap?.composition ?? {})
  if (!compEntries.length) return null

  const isTB = rows => rows.some(r => parseInt(r.label) === 7 && parseFloat(r.bone_mass || 0) > 0)
  const rows = compEntries.find(isTB) ?? compEntries[0]
  if (!rows) return null

  const b = {}
  for (const row of rows) {
    const key = BILATERAL_LABELS[parseInt(row.label)]
    if (!key) continue
    b[key] = {
      fat_g:  Math.round(Math.abs(parseFloat(row.fat_mass)  || 0)),
      lean_g: Math.round(Math.abs(parseFloat(row.lean_mass) || 0)),
      bone_g: Math.round(Math.abs(parseFloat(row.bone_mass) || 0)),
    }
  }
  if (!b.left_arm) return null

  const asym = (l, r) => { const mx = Math.max(l, r); return mx > 0 ? +((Math.abs(l - r) / mx * 100).toFixed(1)) : 0 }
  const sev = (pct, isArm) => { const [lo, hi] = isArm ? [15, 25] : [10, 15]; return pct >= hi ? 'red' : pct >= lo ? 'amber' : null }

  const flags = []
  const check = (lk, rk, label, isArm) => {
    const L = b[lk], R = b[rk]; if (!L || !R) return
    for (const [m, l, r] of [['lean', L.lean_g, R.lean_g], ['fat', L.fat_g, R.fat_g], ['bone', L.bone_g, R.bone_g]]) {
      const p = asym(l, r), s = sev(p, isArm)
      if (s) flags.push({ s, text: `${label} ${m} ${p}%` })
    }
  }
  check('left_arm', 'right_arm', 'arm', true)
  check('left_leg', 'right_leg', 'leg', false)
  check('left_trunk', 'right_trunk', 'trunk', false)

  if (!flags.length) return null
  return {
    level: flags.some(f => f.s === 'red') ? 'red' : 'amber',
    items: flags.map(f => f.text),
  }
}

function parseRaw(raw_json) {
  let raw = raw_json
  for (let i = 0; i < 2 && typeof raw === 'string'; i++) {
    try { raw = JSON.parse(raw) } catch { return null }
  }
  return typeof raw === 'object' && raw !== null ? raw : null
}

function safe(s) { return (s ?? '').replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '') }

export async function GET(req) {
  const mrn = req.nextUrl.searchParams.get('mrn')
  if (!mrn || !/^[\w-]+$/.test(mrn)) {
    return NextResponse.json({ error: 'Missing or invalid ?mrn= param' }, { status: 400 })
  }

  const scan = await fetchLatestTotalbodyScan(mrn)
  if (!scan) return NextResponse.json({ error: 'Scan not found' }, { status: 404 })

  const pat = scan.bmd_patients
  const firstName = pat?.first_name ?? ''
  const lastName  = pat?.last_name  ?? ''
  const name      = `${lastName} ${firstName}`.trim() || mrn
  const scanDate  = (scan.scan_date ?? '').slice(0, 10)
  const filename  = `${[safe(lastName), safe(firstName)].filter(Boolean).join('_') || safe(mrn)}_Body_Composition_${scanDate || 'unknown'}.pdf`

  const rawData  = parseRaw(scan.raw_json)
  const symmetry = rawData ? computeSymmetry(rawData) : null

  return NextResponse.json({ name, scan_date: scanDate, filename, symmetry })
}
