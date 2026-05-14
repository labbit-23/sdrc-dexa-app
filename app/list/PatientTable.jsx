'use client'
import { useState } from 'react'
import Link from 'next/link'

const SCAN_BADGE = {
  osteo:      { label: 'Osteo',      bg: '#e0f2fe', color: '#0369a1' },
  total_body: { label: 'Total Body', bg: '#f0fdf4', color: '#166534' },
}

function ScanBadge({ type }) {
  const b = SCAN_BADGE[type] ?? { label: type, bg: '#f3f4f6', color: '#374151' }
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 10,
      fontSize: 11, fontWeight: 600, background: b.bg, color: b.color, marginRight: 4,
    }}>
      {b.label}
    </span>
  )
}

function fmtDate(d) {
  if (!d) return '—'
  const s = d.slice(0, 10)
  const [y, m, day] = s.split('-')
  return `${day}/${m}/${y}`
}

function fmtDob(dob, gender) {
  if (!dob) return gender || '—'
  const age = Math.floor((Date.now() - new Date(dob)) / (365.25 * 24 * 3600 * 1000))
  const g = gender ? gender[0].toUpperCase() : ''
  return `${g ? g + ', ' : ''}${age}y`
}

export default function PatientTable({ patients }) {
  const [q, setQ] = useState('')

  const filtered = q.trim()
    ? patients.filter(p => {
        const s = q.toLowerCase()
        return (
          p.name.toLowerCase().includes(s) ||
          p.mrn.includes(s)
        )
      })
    : patients

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontSize: 15, color: '#374151', margin: 0 }}>
          {filtered.length} of {patients.length} patient{patients.length !== 1 ? 's' : ''}
        </h2>
        <input
          type="search"
          placeholder="Search name or MRN…"
          value={q}
          onChange={e => setQ(e.target.value)}
          style={{
            padding: '7px 12px', borderRadius: 6, border: '1px solid #d1d5db',
            fontSize: 13, width: 240, outline: 'none',
          }}
        />
      </div>

      {filtered.length === 0 ? (
        <p style={{ color: '#6b7280' }}>{q ? 'No matches.' : 'No scans uploaded yet.'}</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#e5eaf0', color: '#374151' }}>
              <th style={th}>#</th>
              <th style={th}>Patient</th>
              <th style={th}>MRN</th>
              <th style={th}>Age / Sex</th>
              <th style={th}>Scan Types</th>
              <th style={th}>Last Scan</th>
              <th style={{ ...th, textAlign: 'center' }}>Scans</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => (
              <tr key={p.mrn} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                <td style={{ ...td, color: '#9ca3af', fontSize: 11 }}>{i + 1}</td>
                <td style={{ ...td, fontWeight: 600 }}>{p.name || '—'}</td>
                <td style={{ ...td, fontFamily: 'monospace', fontSize: 12 }}>{p.mrn}</td>
                <td style={{ ...td, color: '#6b7280' }}>{fmtDob(p.dob, p.gender)}</td>
                <td style={td}>
                  {(p.scan_types ?? []).map(t => <ScanBadge key={t} type={t} />)}
                </td>
                <td style={td}>{fmtDate(p.last_scan_date)}</td>
                <td style={{ ...td, textAlign: 'center', color: '#6b7280' }}>{p.scan_count}</td>
                <td style={{ ...td, textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    {(p.scan_types ?? []).includes('osteo') && (
                      <Link href={`/bmd/report/osteo/${p.mrn}`} style={btn('#0D7377')}>Osteo</Link>
                    )}
                    {(p.scan_types ?? []).includes('total_body') && (
                      <Link href={`/bmd/report/totalbody/${p.mrn}`} style={btn('#166534')}>Total Body</Link>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}

const th  = { padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 12 }
const td  = { padding: '10px 12px', borderBottom: '1px solid #e5eaf0', color: '#374151', verticalAlign: 'middle' }
const btn = (bg) => ({
  padding: '4px 10px', borderRadius: 4, fontSize: 11,
  background: bg, color: '#fff', textDecoration: 'none', fontWeight: 600,
})
