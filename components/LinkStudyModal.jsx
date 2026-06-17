'use client'
import { useState, useEffect } from 'react'
import BASE from '@/lib/basepath'

export default function LinkStudyModal({ currentPids, onClose, archiveMode = false }) {
  const [all, setAll] = useState([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const [selected, setSelected] = useState(null)
  const [confirm, setConfirm] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState(null)


  const listUrl = archiveMode ? `${BASE}/api/collector/archive/all?max_count=500` : `${BASE}/api/collector/all?max_count=200`
  const trendBase = archiveMode ? `${BASE}/api/collector/archive/trend` : `${BASE}/api/collector/trend`

  useEffect(() => {
    fetch(listUrl)
      .then(r => r.json())
      .then(data => {
        const arr = Array.isArray(data) ? data : (data?.patients ?? data?.data ?? [])
        setAll(arr)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [listUrl])

  const filtered = q
    ? all.filter(p => {
        const ql = q.toLowerCase()
        return (p.patient?.patient_id ?? '').toLowerCase().includes(ql) ||
               (p.patient?.name ?? '').toLowerCase().includes(ql)
      })
    : all

  const matches = filtered.filter(p => currentPids.has(p.patient?.patient_id))
  const others = filtered.filter(p => !currentPids.has(p.patient?.patient_id))

  const doLink = async (scanType) => {
    const pid = selected.patient?.patient_id
    const mdb = selected.archive_label
    const url = mdb ? `${trendBase}/${pid}?mdb=${encodeURIComponent(mdb)}` : `${trendBase}/${pid}`
    setUploading(true)
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scan_type: scanType }),
      })
      const data = await res.json()
      setResult({ ok: data.ok, pid, scanType })
    } catch (e) {
      setResult({ ok: false, pid: selected.patient?.patient_id, scanType, error: e.message })
    } finally {
      setUploading(false)
    }
  }

  const fmtDateShort = (iso) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  }

  const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }
  const modal = { background: '#fff', borderRadius: 8, width: 500, maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }

  if (result) {
    return (
      <div style={overlay}>
        <div style={{ ...modal, width: 400, padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 40 }}>{result.ok ? '✓' : '✗'}</div>
          <div style={{ fontSize: 14, fontWeight: 700, marginTop: 12, color: result.ok ? '#4ade80' : '#f87171' }}>
            {result.ok ? 'Linked successfully' : 'Link failed'}
          </div>
          <div style={{ color: '#6b7280', fontSize: 12, marginTop: 8 }}>
            {result.pid} → {result.scanType}
            {result.error && <div style={{ color: '#f87171', marginTop: 6 }}>{result.error}</div>}
          </div>
          <button onClick={onClose} style={{ marginTop: 20, padding: '6px 16px', background: '#0D7377', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 600, cursor: 'pointer' }}>
            Close
          </button>
        </div>
      </div>
    )
  }

  if (confirm && selected) {
    const p = selected.patient ?? {}
    const nm = `${p.title ?? ''} ${p.name ?? ''}`.trim()
    return (
      <div style={overlay}>
        <div style={{ ...modal, width: 400, padding: 28 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#0D7377', marginBottom: 16 }}>Confirm Link</div>
          <div style={{ background: '#f5f7fa', borderRadius: 6, padding: '12px 16px', fontSize: 12, lineHeight: 1.8, marginBottom: 20 }}>
            <div><span style={{ color: '#6b7280', width: 70, display: 'inline-block' }}>Name</span> <strong>{nm}</strong></div>
            <div><span style={{ color: '#6b7280', width: 70, display: 'inline-block' }}>MRN</span> {p.patient_id}</div>
            <div><span style={{ color: '#6b7280', width: 70, display: 'inline-block' }}>Scan</span> {fmtDateShort(selected.scan_date)}</div>
            {selected.archive_label && <div><span style={{ color: '#6b7280', width: 70, display: 'inline-block' }}>Archive</span> <span style={{ color: '#0D7377', fontWeight: 600 }}>{selected.archive_label}</span></div>}
          </div>
          <div style={{ color: '#6b7280', fontSize: 11, marginBottom: 14 }}>
            Historical data will be linked as trend records — no images required.
          </div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            {(selected?.has_osteo === true) && (
              <button onClick={() => doLink('osteo_trend')} disabled={uploading} style={{ flex: 1, padding: '6px 10px', background: '#0D7377', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 600, cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.6 : 1 }}>
                🦴 Bone Density
              </button>
            )}
            {(selected?.has_total_body === true) && (
              <button onClick={() => doLink('total_body_trend')} disabled={uploading} style={{ flex: 1, padding: '6px 10px', background: '#166534', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 600, cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.6 : 1 }}>
                📊 Total Body
              </button>
            )}
          </div>
          {uploading && <div style={{ color: '#0D7377', fontSize: 11, marginBottom: 10 }}>Linking…</div>}
          <button onClick={() => setConfirm(false)} style={{ padding: '6px 16px', background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: 4, fontWeight: 600, cursor: 'pointer', width: '100%' }}>
            ← Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <div style={{ background: '#0D7377', color: '#fff', padding: '14px 18px', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {archiveMode ? '🗄️ Link Archived Study' : '🔗 Link Older Study'}
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', padding: 0 }}>✕</button>
        </div>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid #e5eaf0', flexShrink: 0 }}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search MRN or name…" autoFocus
            style={{ width: '100%', background: '#f5f7fa', border: '1px solid #e5eaf0', borderRadius: 5, padding: '7px 12px', color: '#374151', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ padding: '6px 14px', color: '#6b7280', fontSize: 11, flexShrink: 0 }}>
          {loading ? 'Loading…' : `${filtered.length} patient(s)`}
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {matches.length > 0 && (
            <>
              <div style={{ padding: '6px 14px', background: '#f0f4f8', color: '#0D7377', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Current list match</div>
              {matches.map(info => <ModalPatientRow key={info.patient?.patient_id} info={info} highlight selected={selected?.patient?.patient_id === info.patient?.patient_id} onClick={() => setSelected(info)} onDoubleClick={() => { setSelected(info); setConfirm(true) }} />)}
            </>
          )}
          {showAll && others.length > 0 && (
            <>
              {matches.length > 0 && <div style={{ padding: '6px 14px', background: '#f0f4f8', color: '#6b7280', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>All patients</div>}
              {others.map(info => <ModalPatientRow key={info.patient?.patient_id} info={info} selected={selected?.patient?.patient_id === info.patient?.patient_id} onClick={() => setSelected(info)} onDoubleClick={() => { setSelected(info); setConfirm(true) }} />)}
            </>
          )}
          {!showAll && others.length > 0 && matches.length > 0 && (
            <div style={{ padding: 12, textAlign: 'center' }}>
              <button onClick={() => setShowAll(true)} style={{ padding: '6px 14px', background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                Load all {others.length} patients →
              </button>
            </div>
          )}
          {!loading && filtered.length === 0 && <div style={{ color: '#6b7280', textAlign: 'center', padding: 40, fontSize: 12 }}>No patients found</div>}
        </div>
        <div style={{ padding: '10px 14px', borderTop: '1px solid #e5eaf0', display: 'flex', gap: 10, flexShrink: 0 }}>
          <button onClick={() => setConfirm(true)} disabled={!selected} style={{ flex: 1, padding: '6px 12px', background: selected ? '#0D7377' : '#e5e7eb', color: selected ? '#fff' : '#9ca3af', border: 'none', borderRadius: 4, fontWeight: 600, cursor: selected ? 'pointer' : 'not-allowed' }}>
            Select & Confirm →
          </button>
          <button onClick={onClose} style={{ flex: 1, padding: '6px 12px', background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: 4, fontWeight: 600, cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

function ModalPatientRow({ info, highlight, selected, onClick, onDoubleClick }) {
  const p = info.patient ?? {}
  const pid = p.patient_id ?? '?'
  const name = `${p.title ?? ''} ${p.name ?? ''}`.trim() || '—'
  const label = info.archive_label

  return (
    <div onClick={onClick} onDoubleClick={onDoubleClick}
      style={{ display: 'grid', gridTemplateColumns: '90px 1fr 50px 100px' + (label ? ' 90px' : ''), gap: 8, padding: '8px 14px', cursor: 'pointer', borderBottom: '1px solid #f0f4f8', background: selected ? '#f0fdf4' : 'transparent', fontSize: 12 }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = '#f9fafb' }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = selected ? '#f0fdf4' : 'transparent' }}
    >
      <div style={{ color: highlight ? '#0D7377' : '#9ca3af', fontFamily: 'monospace', fontSize: 11 }}>{pid}</div>
      <div style={{ color: highlight ? '#374151' : '#9ca3af', fontWeight: highlight ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
      <div style={{ color: '#6b7280', fontSize: 11 }}>{(p.gender || '').charAt(0).toUpperCase()}</div>
      <div style={{ color: '#6b7280', fontSize: 11 }}>
        {info.scan_date ? new Date(info.scan_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
      </div>
      {label && <div style={{ color: '#0D7377', fontSize: 10, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>}
    </div>
  )
}
