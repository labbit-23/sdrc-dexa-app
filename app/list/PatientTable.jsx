'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import BASE from '@/lib/basepath'
import LinkStudyModal from '@/components/LinkStudyModal'

const SCAN_BADGE = {
  spine_only:  { label: 'AP Spine',   bg: '#e0f2fe', color: '#0369a1' },
  spine_femur: { label: 'Spine+Hip',  bg: '#e0f2fe', color: '#0369a1' },
  dual_femur:  { label: 'Dual Femur', bg: '#e0f2fe', color: '#0369a1' },
  osteo:       { label: 'Osteo',      bg: '#e0f2fe', color: '#0369a1' },
  total_body:  { label: 'Total Body', bg: '#f0fdf4', color: '#166534' },
}

function ScanBadge({ type }) {
  const b = SCAN_BADGE[type] ?? { label: type, bg: '#f3f4f6', color: '#374151' }
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 10,
      fontSize: 11, fontWeight: 600, background: b.bg, color: b.color, marginRight: 4 }}>
      {b.label}
    </span>
  )
}

function fmtDate(d) {
  if (!d) return '—'
  const [y, m, day] = d.slice(0, 10).split('-')
  return `${day}/${m}/${y}`
}

function fmtDateShort(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function fmtDob(dob, gender) {
  if (!dob) return gender || '—'
  const age = Math.floor((Date.now() - new Date(dob)) / (365.25 * 24 * 3600 * 1000))
  const g = gender ? gender[0].toUpperCase() : ''
  return `${g ? g + ', ' : ''}${age}y`
}

function sectionFor(dateStr) {
  if (!dateStr) return 'Older'
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const d     = new Date(dateStr + 'T00:00:00')
  const days  = Math.floor((today - d) / 86400000)
  if (days === 0) return 'Today'
  if (days <= 7)  return 'This Week'
  if (days <= 30) return 'This Month'
  return 'Older'
}

const SECTION_ORDER = ['Today', 'This Week', 'This Month', 'Older']

function groupBySections(patients) {
  const groups = {}
  for (const p of patients) {
    const s = sectionFor(p.last_scan_date)
    if (!groups[s]) groups[s] = []
    groups[s].push(p)
  }
  // Sort each section by latest study timestamp (descending)
  for (const s in groups) {
    groups[s].sort((a, b) => (b.last_scan_date || '').localeCompare(a.last_scan_date || ''))
  }
  return SECTION_ORDER.filter(s => groups[s]?.length).map(s => ({ label: s, rows: groups[s] }))
}

function PatientRow({ p, idx, onArchiveClick }) {
  // Each scan (type+date) is its own row
  const scans = (p.scans ?? []).sort((a, b) => b.scan_date.localeCompare(a.scan_date))

  return (
    <>
      {scans.map((scan, i) => {
        const isFirst = i === 0
        const scanDate = scan.scan_date.split('T')[0]
        const isOsteo = OSTEO_TYPES.has(scan.scan_type)
        const isTb = TB_TYPES.has(scan.scan_type)
        const rowIdx = idx * 100 + i

        return (
          <tr key={`${p.mrn}-${scan.scan_date}-${scan.scan_type}`} style={{ background: rowIdx % 2 === 0 ? '#fff' : '#f8fafc' }}>
            {isFirst ? (
              <>
                <td style={{ ...td, fontWeight: 600, rowSpan: scans.length }}>{p.name || '—'}</td>
                <td style={{ ...td, fontFamily: 'monospace', fontSize: 12, rowSpan: scans.length }}>{p.mrn}</td>
                <td style={{ ...td, color: '#6b7280', rowSpan: scans.length }}>{fmtDob(p.dob, p.gender)}</td>
              </>
            ) : null}
            <td style={td}><ScanBadge type={scan.scan_type} /></td>
            <td style={td}>{fmtDateShort(scan.scan_date)}</td>
            <td style={{ ...td, textAlign: 'right' }}>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                {isOsteo && <Link href={`/report/osteo/${p.mrn}?date=${scanDate}`} style={btn('#0D7377')}>Osteo</Link>}
                {isTb && <Link href={`/report/totalbody/${p.mrn}?date=${scanDate}`} style={btn('#166534')}>Total Body</Link>}
                {isFirst && <button onClick={() => onArchiveClick(p)} style={{ ...btn('#666666'), cursor: 'pointer' }}>🗄️</button>}
              </div>
            </td>
          </tr>
        )
      })}
    </>
  )
}

const OSTEO_TYPES = new Set(['osteo', 'spine_only', 'spine_femur', 'dual_femur'])
const TB_TYPES = new Set(['total_body'])

function TableHead() {
  return (
    <thead>
      <tr style={{ background: '#e5eaf0', color: '#374151' }}>
        <th style={th}>Patient</th>
        <th style={th}>MRN</th>
        <th style={th}>Age / Sex</th>
        <th style={th}>Type</th>
        <th style={th}>Date</th>
        <th style={{ ...th, textAlign: 'right' }}>Report</th>
      </tr>
    </thead>
  )
}

export default function PatientTable() {
  const [q,           setQ]           = useState('')
  const [patients,    setPatients]    = useState([])
  const [total,       setTotal]       = useState(0)
  const [pages,       setPages]       = useState(1)
  const [page,        setPage]        = useState(0)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [archivePatient, setArchivePatient] = useState(null)
  const timerRef = useRef(null)

  const fetchPage = useCallback(async (p, search) => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ page: p })
      if (search) params.set('q', search)
      const res  = await fetch(`${BASE}/api/list?${params}`)
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setPatients(json.patients ?? [])
      setTotal(json.total ?? 0)
      setPages(json.pages ?? 1)
      setPage(json.page ?? p)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchPage(0, '') }, [fetchPage])

  useEffect(() => {
    clearTimeout(timerRef.current)
    if (!q.trim()) { fetchPage(0, ''); return }
    timerRef.current = setTimeout(() => fetchPage(0, q.trim()), 300)
    return () => clearTimeout(timerRef.current)
  }, [q, fetchPage])

  const isSearching = q.trim().length > 0
  const sections    = !isSearching ? groupBySections(patients) : null

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: '#6b7280' }}>
          {loading ? 'Loading…' : isSearching
            ? `${patients.length} result${patients.length !== 1 ? 's' : ''}`
            : `${total} patient${total !== 1 ? 's' : ''} · page ${page + 1} of ${pages}`}
        </div>
        <input
          type="search"
          placeholder="Search name or MRN…"
          value={q}
          onChange={e => setQ(e.target.value)}
          style={{ padding: '7px 12px', borderRadius: 6, border: '1px solid #d1d5db',
            fontSize: 13, width: 240, outline: 'none' }}
        />
      </div>

      {error && <p style={{ color: '#b91c1c' }}>Error: {error}</p>}

      {!loading && patients.length === 0 && (
        <p style={{ color: '#6b7280' }}>{q ? 'No matches.' : 'No scans uploaded yet.'}</p>
      )}

      {!isSearching && sections?.map(({ label, rows }) => (
        <div key={label} style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.08em', color: '#6b7280', marginBottom: 6, paddingLeft: 2 }}>
            {label}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <TableHead />
            <tbody>{rows.map((p, i) => <PatientRow key={p.mrn} p={p} idx={i} onArchiveClick={() => { setArchivePatient(p); setArchiveOpen(true) }} />)}</tbody>
          </table>
        </div>
      ))}

      {isSearching && patients.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <TableHead />
          <tbody>{patients.map((p, i) => <PatientRow key={p.mrn} p={p} idx={i} onArchiveClick={() => { setArchivePatient(p); setArchiveOpen(true) }} />)}</tbody>
        </table>
      )}

      {!isSearching && pages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 12, marginTop: 24 }}>
          <button onClick={() => fetchPage(0, '')}         disabled={page === 0 || loading}        style={pgBtn(page === 0 || loading)}>«</button>
          <button onClick={() => fetchPage(page - 1, '')}  disabled={page === 0 || loading}        style={pgBtn(page === 0 || loading)}>‹ Prev</button>
          <span style={{ fontSize: 13, color: '#374151' }}>Page {page + 1} of {pages}</span>
          <button onClick={() => fetchPage(page + 1, '')}  disabled={page >= pages - 1 || loading} style={pgBtn(page >= pages - 1 || loading)}>Next ›</button>
          <button onClick={() => fetchPage(pages - 1, '')} disabled={page >= pages - 1 || loading} style={pgBtn(page >= pages - 1 || loading)}>»</button>
        </div>
      )}

      {archiveOpen && archivePatient && (
        <LinkStudyModal
          currentPids={new Set([archivePatient.mrn])}
          onClose={() => { setArchiveOpen(false); setArchivePatient(null); fetchPage(page, q) }}
          archiveMode={true}
        />
      )}
    </>
  )
}

const th    = { padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 12 }
const td    = { padding: '10px 12px', borderBottom: '1px solid #e5eaf0', color: '#374151', verticalAlign: 'middle' }
const btn   = bg => ({ padding: '4px 10px', borderRadius: 4, fontSize: 11,
  background: bg, color: '#fff', textDecoration: 'none', fontWeight: 600 })
const pgBtn = disabled => ({
  padding: '6px 14px', borderRadius: 5, fontSize: 13, fontWeight: 600,
  cursor: disabled ? 'default' : 'pointer',
  background: disabled ? '#e5e7eb' : '#0D7377',
  color: disabled ? '#9ca3af' : '#fff', border: 'none',
})
