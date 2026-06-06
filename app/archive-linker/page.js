'use client'

import { useState, useEffect, useRef } from 'react'
import BASE from '@/lib/basepath'
import { formatScanDate, formatScanDateTime } from '@/lib/format-date'

const C = {
  dark:   '#0D1B2A',
  card:   '#1a2f45',
  teal:   '#0D7377',
  green:  '#2E7D32',
  amber:  '#E65100',
  red:    '#B71C1C',
  purple: '#6a1b9a',
  white:  '#FFFFFF',
  gray:   '#9E9E9E',
  lt:     '#B0BEC5',
  cyan:   '#4FC3F7',
  pink:   '#E91E8C',
  border: '#1e3a5a',
  optimal: '#00D9FF',
  elevated: '#FB923C',
}

// Extract initials from name (handles titles like Mr, Dr, etc)
function extractInitials(name) {
  if (!name) return []
  const parts = name
    .split(/\s+/)
    .map(p => p.trim())
    .filter(p => p && !['mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr'].includes(p.toLowerCase()))
  return parts.map(p => p[0].toUpperCase()).filter(Boolean)
}

// Calculate name similarity score based on common initials
function nameMatchScore(name1, name2) {
  const initials1 = extractInitials(name1)
  const initials2 = extractInitials(name2)
  if (initials1.length === 0 || initials2.length === 0) return 0

  const common = initials1.filter(i => initials2.includes(i)).length
  const maxPossible = Math.max(initials1.length, initials2.length)
  const score = Math.round((common / maxPossible) * 100)

  return { score, common, initials1, initials2 }
}

// Check if names are similar enough to link (at least 2 common initials)
function canLink(name1, name2) {
  const match = nameMatchScore(name1, name2)
  return match.common >= 2
}

function Btn({ label, bg, textColor = '#fff', border = 'none', onClick, disabled = false, bold = false, style = {} }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '6px 14px',
        borderRadius: 5,
        fontSize: 12,
        fontWeight: bold ? 700 : 600,
        background: disabled ? '#4a5568' : bg,
        color: disabled ? '#9ca3af' : textColor,
        border: `1px solid ${border}`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style,
      }}
    >
      {label}
    </button>
  )
}

function PatientRow({ patient, onLink, onUnlink }) {
  const patientName = patient.name ?? '—'
  const mrn = patient.patient_id ?? '—'
  const lastScanDate = patient.last_scan_date
  const [linkedScans, setLinkedScans] = useState([])
  const [loadingScans, setLoadingScans] = useState(true)

  useEffect(() => {
    fetch(`${BASE}/api/linked-scans?patient_id=${mrn}`)
      .then(r => r.json())
      .then(scans => {
        const list = Array.isArray(scans) ? scans : (scans?.data || [])
        console.log(`Linked scans for ${mrn}:`, list)
        setLinkedScans(list)
        setLoadingScans(false)
      })
      .catch(e => {
        console.error('Linked scans error:', e)
        setLoadingScans(false)
      })
  }, [mrn])

  const formatDate = (iso) => {
    if (!iso) return '—'
    const [y, m, d] = iso.slice(0, 10).split('-')
    return `${d}/${m}/${y}`
  }

  return (
    <div style={{
      background: C.card,
      border: `1px solid ${C.border}`,
      borderRadius: 6,
      padding: '12px 14px',
      marginBottom: 10,
      display: 'grid',
      gridTemplateColumns: '100px 1fr 120px 1fr auto',
      gap: 12,
      alignItems: 'start',
    }}>
      <div>
        <div style={{ fontSize: 11, color: C.gray }}>MRN</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.white, fontFamily: 'monospace' }}>{mrn}</div>
      </div>

      <div>
        <div style={{ fontSize: 11, color: C.gray }}>Patient</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.white }}>{patientName}</div>
      </div>

      <div>
        <div style={{ fontSize: 11, color: C.gray }}>Last Scan</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.optimal, fontFamily: 'monospace' }}>{formatDate(lastScanDate)}</div>
      </div>

      <div>
        <div style={{ fontSize: 11, color: C.gray }}>Linked Scans</div>
        {loadingScans ? (
          <div style={{ fontSize: 12, color: C.gray }}>Loading…</div>
        ) : linkedScans.length > 0 ? (
          <div style={{ fontSize: 12, color: C.lt, marginTop: 4 }}>
            {linkedScans.map((scan) => (
              <div key={scan.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 6, paddingBottom: 4, borderBottom: `1px solid ${C.border}` }}>
                <span style={{ flex: 1, fontFamily: 'monospace', fontSize: 11 }}>🔗 {formatDate(scan.scan_date)} · {scan.scan_type}</span>
                <button
                  onClick={() => onUnlink(scan)}
                  style={{
                    fontSize: 10,
                    background: 'transparent',
                    color: C.gray,
                    border: 'none',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    whiteSpace: 'nowrap',
                  }}
                >
                  unlink
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: C.gray }}>No linked scans</div>
        )}
      </div>

      <Btn label="🔗 Link" bg={C.teal} onClick={() => onLink(patient)} />
    </div>
  )
}

function LinkArchiveModal({ patient, allArchives, onClose, onLink, onUnlink }) {
  const [searchQ, setSearchQ] = useState('')
  const [filtered, setFiltered] = useState([])
  const [modalPage, setModalPage] = useState(0)
  const [selectedArchive, setSelectedArchive] = useState(null)
  const [scanType, setScanType] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [linking, setLinking] = useState(false)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [needsConsolidation, setNeedsConsolidation] = useState(null)
  const [consolidationChoice, setConsolidationChoice] = useState(null)
  const [mdbPreview, setMdbPreview] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const patientName = patient.name ?? '—'
  const patientMrn = patient.patient_id
  const patientLastScanDate = patient.last_scan_date
  const modalPageSize = 20

  // Fetch matching archives only (by name/MRN similarity)
  useEffect(() => {
    setModalPage(0) // Reset pagination when search changes

    if (!searchQ.trim()) {
      // No custom search: use allArchives prop
      const filtered = allArchives.filter(a => a.scan_date?.slice(0, 10) !== patientLastScanDate?.slice(0, 10))
      setFiltered(filtered)
      return
    }

    // Custom search: query for matches
    setLoading(true)
    const params = new URLSearchParams()
    params.set('q', searchQ)
    params.set('limit', '200')
    params.set('sort_by', 'scan_date')
    params.set('sort_order', 'desc')

    fetch(`${BASE}/api/archive-scans?${params}`)
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : (data?.data || [])
        // Exclude patient's current scan date
        const filtered = list.filter(a => a.scan_date?.slice(0, 10) !== patientLastScanDate?.slice(0, 10))
        setFiltered(filtered)
        setLoading(false)
      })
      .catch(e => {
        console.error('Search error:', e)
        setLoading(false)
      })
  }, [searchQ, allArchives, patientLastScanDate])

  const sameNameMrn = filtered.filter(a => a.patient?.patient_id === patientMrn)
  const similarName = filtered.filter(a => a.patient?.patient_id !== patientMrn && canLink(patientName, a.patient?.name ?? ''))
  const others = filtered.filter(a => !sameNameMrn.includes(a) && !similarName.includes(a))

  const doLink = async () => {
    if (!selectedArchive) return
    setLinking(true)
    try {
      // Link via Supabase endpoint (scan_type auto-detected)
      const res = await fetch(`${BASE}/api/link-scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scan_id: selectedArchive.id,
          source: selectedArchive.source,
          patient_id: patientMrn,
          archive_label: selectedArchive.archive_label,
          archive_path: selectedArchive.archive_path,
        }),
      })
      const data = await res.json()

      // Check if consolidation is needed
      if (data.needsConsolidation) {
        setNeedsConsolidation(data)
        setLinking(false)
        return
      }

      if (data.ok) {
        setResult({ ok: true, archive: selectedArchive.archive_label || `Scan ${selectedArchive.scan_date}` })
        setTimeout(() => onLink(), 2000)
      } else {
        setResult({ ok: false, error: data.error || 'Link failed' })
      }
    } catch (e) {
      setResult({ ok: false, error: e.message })
    } finally {
      setLinking(false)
    }
  }

  const overlay = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  }

  const modal = {
    background: C.dark,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    width: 700,
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  }

  if (result) {
    return (
      <div style={overlay}>
        <div style={{ ...modal, width: 400, padding: 32, textAlign: 'center', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 40 }}>{result.ok ? '✓' : '✗'}</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginTop: 12, color: result.ok ? C.optimal : C.elevated }}>
            {result.ok ? 'Linked successfully' : 'Link failed'}
          </div>
          <div style={{ color: C.gray, fontSize: 13, marginTop: 8 }}>
            {result.ok ? `${result.archive} linked to ${patientName}` : result.error}
          </div>
          <Btn label="Close" bg={C.teal} onClick={onClose} style={{ marginTop: 20 }} />
        </div>
      </div>
    )
  }

  if (confirming && selectedArchive) {
    // Load MDB preview if MDB archive
    if (selectedArchive.source === 'mdb_archive' && !mdbPreview && !previewLoading) {
      setPreviewLoading(true)
      fetch(`${BASE}/api/preview-mdb`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archive_path: selectedArchive.archive_path }),
      })
        .then(r => r.json())
        .then(data => {
          setMdbPreview(data)
          setPreviewLoading(false)
        })
        .catch(e => {
          setMdbPreview({ error: e.message })
          setPreviewLoading(false)
        })
    }


    const archiveName = selectedArchive.patient?.name ?? '—'
    const match = selectedArchive.patient ? nameMatchScore(patientName, archiveName) : { score: 0, common: 0 }
    const nameMatchPercent = match.score
    const isMdb = selectedArchive.source === 'mdb_archive'
    const scanDate = isMdb ? mdbPreview?.scan_date : selectedArchive.scan_date
    const scanType = isMdb ? mdbPreview?.trend_type : selectedArchive.scan_type

    return (
      <div style={overlay}>
        <div style={{ ...modal, width: 480, padding: 28 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: C.teal, marginBottom: 16 }}>Confirm Link</div>

          {isMdb && mdbPreview?.error && (
            <div style={{ background: '#7c2d12', border: '1px solid #ea580c', borderRadius: 6, padding: 12, marginBottom: 16, fontSize: 12, color: '#fed7aa' }}>
              🚨 Error reading MDB: {mdbPreview.error}
            </div>
          )}

          {nameMatchPercent < 90 && !isMdb && (
            <div style={{ background: nameMatchPercent < 70 ? '#7c2d12' : '#92400e', border: `1px solid ${nameMatchPercent < 70 ? '#ea580c' : '#f59e0b'}`, borderRadius: 6, padding: 12, marginBottom: 16, fontSize: 12, color: nameMatchPercent < 70 ? '#fed7aa' : '#fef3c7' }}>
              {nameMatchPercent < 70 ? '🚨' : '⚠️'} Name match: {nameMatchPercent}% - Is this the same person?
              <div style={{ fontSize: 11, marginTop: 4, opacity: 0.9 }}>Existing: {patientName} → Archive: {archiveName}</div>
            </div>
          )}

          <div style={{ background: C.card, borderRadius: 6, padding: '12px 16px', fontSize: 13, lineHeight: 2, marginBottom: 20 }}>
            <div><span style={{ color: C.gray, width: 100, display: 'inline-block' }}>Patient</span> <strong>{patientName}</strong> ({patientMrn})</div>
            {!isMdb && <div><span style={{ color: C.gray, width: 100, display: 'inline-block' }}>Archive</span> <strong>{archiveName}</strong></div>}
            {isMdb && <div><span style={{ color: C.gray, width: 100, display: 'inline-block' }}>File</span> <strong>{selectedArchive.archive_label}</strong></div>}
            {isMdb && selectedArchive.mdb_source && <div><span style={{ color: C.gray, width: 100, display: 'inline-block' }}>Source</span> {selectedArchive.mdb_source}</div>}
            <div><span style={{ color: C.gray, width: 100, display: 'inline-block' }}>Scan Date</span> <strong>{previewLoading ? 'Loading…' : formatScanDateTime(scanDate)}</strong></div>
            <div><span style={{ color: C.gray, width: 100, display: 'inline-block' }}>Type</span> <strong>{scanType || (previewLoading ? 'Loading…' : '—')}</strong></div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <Btn label="Confirm Link" bg={C.teal} disabled={linking || previewLoading} onClick={() => { setScanType('auto'); doLink(); }} bold />
            <Btn label="← Back" bg="transparent" textColor={C.gray} border={C.border} onClick={() => { setConfirming(false); setMdbPreview(null); }} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={{ background: C.teal, padding: '12px 18px', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>🔗 Link Archive to {patientName}</div>
            <div style={{ color: '#B2DFDB', fontSize: 11, marginTop: 2 }}>Select archive scan to link as trend history</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#B2DFDB', fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <input
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            placeholder="Search by name or MRN…"
            autoFocus
            style={{
              width: '100%',
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 5,
              padding: '7px 12px',
              color: C.white,
              fontSize: 13,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ padding: '4px 14px', color: C.gray, fontSize: 11, flexShrink: 0 }}>
          {filtered.length} archive(s) · MRN {patientMrn} · {(() => {
            const sources = []
            const supabase = filtered.filter(a => a.source === 'supabase').length
            const machine = filtered.filter(a => a.source === 'mdb_machine').length

            if (supabase > 0) sources.push(`Supabase (${supabase})`)
            if (machine > 0) sources.push(`Machine MDB (${machine})`)

            // Group archive MDBs by source
            const archiveMdbs = filtered.filter(a => a.source === 'mdb_archive')
            const archivesBySource = {}
            archiveMdbs.forEach(a => {
              const src = a.mdb_source || 'Archive'
              archivesBySource[src] = (archivesBySource[src] || 0) + 1
            })
            Object.entries(archivesBySource).forEach(([src, count]) => {
              sources.push(`${src} (${count})`)
            })

            return sources.length > 0 ? 'Sources: ' + sources.join(', ') : 'Sources: None'
          })()}
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {sameNameMrn.length > 0 && (
            <>
              <div style={{ padding: '6px 14px', background: '#0a1624', color: C.optimal, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                Exact MRN Match
              </div>
              {sameNameMrn.map(a => (
                <ArchiveRow key={a.id} archive={a} selected={selectedArchive?.id === a.id} onClick={() => setSelectedArchive(a)} onDoubleClick={() => { setSelectedArchive(a); setConfirming(true) }} />
              ))}
            </>
          )}

          {similarName.length > 0 && (
            <>
              <div style={{ padding: '6px 14px', background: '#0a1624', color: C.cyan, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                Name Similarity Match
              </div>
              {similarName.map(a => {
                const match = nameMatchScore(patientName, a.patient?.name ?? '')
                return (
                  <ArchiveRow key={a.id} archive={a} match={match} selected={selectedArchive?.id === a.id} onClick={() => setSelectedArchive(a)} onDoubleClick={() => { setSelectedArchive(a); setConfirming(true) }} />
                )
              })}
            </>
          )}

          {others.length > 0 && (
            <>
              <div style={{ padding: '6px 14px', background: '#0a1624', color: C.gray, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                All Archives
              </div>
              {others.map(a => (
                <ArchiveRow key={a.id} archive={a} selected={selectedArchive?.id === a.id} onClick={() => setSelectedArchive(a)} onDoubleClick={() => { setSelectedArchive(a); setConfirming(true) }} />
              ))}
            </>
          )}

          {filtered.length === 0 && <div style={{ color: C.gray, textAlign: 'center', padding: 40 }}>No archives found</div>}
        </div>

        <div style={{ padding: '10px 14px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 10, flexShrink: 0 }}>
          <Btn label="Select & Confirm →" bg={C.pink} disabled={!selectedArchive} onClick={() => setConfirming(true)} bold />
          <Btn label="Cancel" bg="transparent" textColor={C.gray} border={C.border} onClick={onClose} />
        </div>
      </div>
    </div>
  )
}

function ArchiveRow({ archive, match, selected, onClick, onDoubleClick }) {
  const archiveName = archive.patient?.name ?? '—'
  const mrn = archive.patient?.patient_id ?? '—'
  const scanType = archive.scan_type ?? 'unknown'

  const formatScanDate = (iso) => {
    if (!iso) return '—'
    try {
      const dt = new Date(iso)
      return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    } catch {
      return iso
    }
  }

  return (
    <div
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      style={{
        display: 'grid',
        gridTemplateColumns: '100px 1fr 80px 100px',
        gap: 8,
        padding: '8px 14px',
        cursor: 'pointer',
        borderBottom: `1px solid #0f2030`,
        background: selected ? '#1a3a55' : 'transparent',
        fontSize: 12,
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = '#0f2030' }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent' }}
    >
      <div style={{ color: C.lt, fontFamily: 'monospace', fontSize: 11 }}>{mrn}</div>
      <div style={{ color: C.white, fontWeight: selected ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {archiveName}
        {match && <span style={{ color: C.cyan, fontSize: 10, marginLeft: 6 }}>({match.score}%)</span>}
      </div>
      <div style={{ color: C.gray, fontSize: 11 }}>{scanType}</div>
      <div style={{ color: C.optimal, fontWeight: 600, fontSize: 11, fontFamily: 'monospace' }}>{formatScanDate(archive.scan_date)}</div>
    </div>
  )
}

export default function ArchiveLinkerPage() {
  const [patients, setPatients] = useState([])
  const [archives, setArchives] = useState([])
  const [archivePage, setArchivePage] = useState(0)
  const [archiveLimit, setArchiveLimit] = useState(20)
  const [archiveMeta, setArchiveMeta] = useState({})
  const [loading, setLoading] = useState(true)
  const [linkingPatient, setLinkingPatient] = useState(null)
  const [searchQ, setSearchQ] = useState('')

  useEffect(() => {
    // Fetch patients and potential archives for linking
    Promise.all([
      fetch(`${BASE}/api/patients`).then(r => r.json()).catch(e => { console.error('Patients fetch error:', e); return [] }),
      fetch(`${BASE}/api/archive-scans?page=${archivePage}&limit=${archiveLimit}&sort_by=scan_date&sort_order=desc`).then(r => r.json()).catch(e => { console.error('Archives fetch error:', e); return {} }),
    ]).then(([patientsList, archivesData]) => {
      const pList = Array.isArray(patientsList) ? patientsList : (patientsList?.data || [])
      const aList = Array.isArray(archivesData) ? archivesData : (archivesData?.data || [])
      const meta = archivesData?.page !== undefined ? archivesData : {}

      // Sort by last_scan_date descending (newest first)
      const sorted = pList.sort((a, b) => {
        const dateA = a.last_scan_date || ''
        const dateB = b.last_scan_date || ''
        return dateB.localeCompare(dateA)
      })

      setPatients(sorted)
      setArchives(aList)
      setArchiveMeta(meta)
      setLoading(false)
    })
  }, [archivePage, archiveLimit])

  const filtered = searchQ
    ? patients.filter(p => {
        const ql = searchQ.toLowerCase()
        return (p.patient_id ?? '').toLowerCase().includes(ql) || (p.name ?? '').toLowerCase().includes(ql)
      })
    : patients

  const handleLink = () => {
    setLinkingPatient(null)
    // Refresh patients to show new links
    fetch(`${BASE}/api/patients`).then(r => r.json()).then(pList => {
      const pArray = Array.isArray(pList) ? pList : (pList?.data || [])
      setPatients(pArray)
    }).catch(e => console.error('Error refreshing patients:', e))
  }

  const handleUnlink = async (scan) => {
    const formatDateTime = (iso) => {
      if (!iso) return '—'
      const dt = new Date(iso)
      const date = dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      const time = dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      return `${date} at ${time}`
    }

    const confirmed = window.confirm(
      `Unlink this scan?\n\n` +
      `Date: ${formatDateTime(scan.scan_date)}\n` +
      `Type: ${scan.scan_type}\n\n` +
      `(Marks as archived - data preserved)`
    )
    if (!confirmed) return

    try {
      const res = await fetch(`${BASE}/api/unlink-scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scan_id: scan.id }),
      })
      const data = await res.json()
      if (data.ok) {
        alert('Scan unlinked (archived)')
        // Refresh patients to show updated linked scans
        setPatients([...patients])
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (e) {
      alert(`Failed to unlink: ${e.message}`)
    }
  }

  const page = {
    background: C.dark,
    color: C.white,
    minHeight: '100vh',
    padding: '20px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  }

  return (
    <div style={page}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>🔗 Archive Linker</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: 13, color: C.gray }}>Link historical scans to patients for trend analysis</p>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <input
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            placeholder="Search by patient name or MRN…"
            autoFocus
            style={{
              flex: 1,
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 5,
              padding: '10px 14px',
              color: C.white,
              fontSize: 13,
              outline: 'none',
            }}
          />
          <div style={{ color: C.gray, fontSize: 12, padding: '10px 14px', whiteSpace: 'nowrap' }}>
            {loading ? 'Loading…' : `${filtered.length} patient(s)`}
          </div>
        </div>

        {/* Archive pagination controls */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, fontSize: 12, color: C.gray }}>
          <span>Archives: Page {archivePage + 1} · Limit</span>
          <select
            value={archiveLimit}
            onChange={e => { setArchiveLimit(parseInt(e.target.value)); setArchivePage(0) }}
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 4,
              padding: '4px 8px',
              color: C.white,
              cursor: 'pointer',
            }}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <div style={{ flex: 1 }} />
          <Btn
            label="← Prev"
            bg={archivePage > 0 ? C.teal : '#4a5568'}
            disabled={archivePage === 0}
            onClick={() => setArchivePage(p => Math.max(0, p - 1))}
          />
          <Btn
            label="Next →"
            bg={archiveMeta.total >= archiveLimit ? C.teal : '#4a5568'}
            disabled={(archiveMeta.total ?? 0) < archiveLimit}
            onClick={() => setArchivePage(p => p + 1)}
          />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: C.gray, padding: 40 }}>Loading patients and archives…</div>
        ) : (
          <div>
            {filtered.map(patient => (
              <PatientRow
                key={patient.patient_id}
                patient={patient}
                onLink={() => setLinkingPatient(patient)}
                onUnlink={handleUnlink}
              />
            ))}
            {filtered.length === 0 && <div style={{ textAlign: 'center', color: C.gray, padding: 40 }}>No patients found</div>}
          </div>
        )}
      </div>

      {linkingPatient && (
        <LinkArchiveModal
          patient={linkingPatient}
          allArchives={archives}
          onClose={() => setLinkingPatient(null)}
          onLink={handleLink}
          onUnlink={handleUnlink}
        />
      )}
    </div>
  )
}
