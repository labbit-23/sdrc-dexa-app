'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  dark:    '#0D1B2A',
  card:    '#1a2f45',
  cardAlt: '#0a2a1a',
  teal:    '#0D7377',
  green:   '#2E7D32',
  amber:   '#E65100',
  red:     '#B71C1C',
  pink:    '#E91E8C',
  purple:  '#6a1b9a',
  white:   '#FFFFFF',
  gray:    '#9E9E9E',
  lt:      '#B0BEC5',
  cyan:    '#4FC3F7',
  border:  '#1e3a5a',
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function fmtDateShort(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function basename(p) {
  return (p || '').split(/[\\/]/).pop()
}


// ── Main page ─────────────────────────────────────────────────────────────────

export default function FetchStudiesPage() {
  const [patients,   setPatients]   = useState([])
  const [status,     setStatus]     = useState('Click Gather to scan MDB…')
  const [loading,    setLoading]    = useState(false)
  const [progress,   setProgress]   = useState({})   // pid → string[]
  const [uploaded,   setUploaded]   = useState(() => new Set())
  const [uploading,  setUploading]  = useState(() => new Set())
  const [linkOpen,   setLinkOpen]   = useState(false)
  const [offline,    setOffline]    = useState(false)
  const [bmdOffline, setBmdOffline] = useState(false)

  const gather = useCallback(async () => {
    setLoading(true)
    setStatus('Scanning MDB…')
    setOffline(false)
    setBmdOffline(false)
    try {
      const res = await fetch('/api/collector/recent')

      if (!res.ok) {
        // Try to parse a structured error from the sidecar
        let detail = {}
        try { const body = await res.json(); detail = body.detail ?? body } catch {}
        if (detail.bmd_offline || res.status === 503) {
          setBmdOffline(true)
          setStatus('BMD PC unreachable.')
        } else {
          setOffline(true)
          setStatus(`Collector error: ${detail.error ?? res.statusText}`)
        }
        return
      }

      const data = await res.json()
      setPatients(data)
      const missing = data.filter(p => p.xps_missing).length
      const inDb    = data.filter(p => p.exists_in_db).length
      setStatus(
        `${data.length} patient(s) — ${data.length - missing} with XPS, ${missing} missing` +
        (inDb ? `, ${inDb} already uploaded` : '') + '.',
      )
    } catch (e) {
      setOffline(true)
      setStatus(`Error: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { gather() }, [gather])

  const uploadPatient = useCallback(async (pid, xpsPaths) => {
    setUploading(u => new Set([...u, pid]))
    setProgress(p => ({ ...p, [pid]: ['Starting upload…'] }))

    const addLine = msg =>
      setProgress(p => ({ ...p, [pid]: [...(p[pid] ?? []), msg] }))

    try {
      const res = await fetch(`/api/collector/upload/${pid}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xps_paths: xpsPaths }),
      })

      const reader = res.body.getReader()
      const dec    = new TextDecoder()
      let   buf    = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop()            // keep partial line
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const evt = JSON.parse(line.slice(6))
            if (evt.msg)   addLine(evt.msg)
            if (evt.done)  { setUploaded(u => new Set([...u, pid])); addLine('✓ Done') }
            if (evt.error) addLine(`✗ ${evt.error}`)
          } catch { /* malformed SSE chunk */ }
        }
      }
    } catch (e) {
      addLine(`✗ ${e.message}`)
    } finally {
      setUploading(u => { const n = new Set(u); n.delete(pid); return n })
    }
  }, [])

  const currentPids = new Set(
    patients.map(p => p.patient?.patient_id).filter(Boolean),
  )

  return (
    <div style={{ minHeight: '100vh', background: C.dark, fontFamily: 'system-ui, sans-serif', color: C.white }}>

      {/* ── Header ── */}
      <div style={{ background: C.teal, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img src="https://www.sdrc.in/assets/sdrc-logo-full.png" alt="SDRC" style={{ height: 32, width: 'auto', borderRadius: 4, background: 'rgba(255,255,255,0.92)', padding: '2px 6px' }} />
          <span style={{ color: '#B2DFDB', fontSize: 12, letterSpacing: 1 }}>Data Collector</span>
        </div>
        <a href="/list" style={{ background: 'rgba(255,255,255,0.15)', color: C.white, textDecoration: 'none', padding: '6px 14px', borderRadius: 5, fontSize: 12, fontWeight: 600, border: '1px solid rgba(255,255,255,0.25)' }}>
          📋 Patient List
        </a>
      </div>

      {/* ── Toolbar ── */}
      <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${C.border}`, flexWrap: 'wrap' }}>
        <Btn
          label={loading ? '…  Scanning' : '⟳  Gather Data'}
          color={C.teal}
          disabled={loading}
          onClick={gather}
          bold
        />
        <Btn
          label="🔗  Link Older Study"
          color="transparent"
          textColor={C.pink}
          border={C.pink}
          onClick={() => setLinkOpen(true)}
        />
        {offline && (
          <span style={{ color: C.amber, fontSize: 12, fontWeight: 600 }}>
            ⚠ Collector API offline — is the sidecar running?
          </span>
        )}
        <span style={{ color: C.gray, fontSize: 12, marginLeft: 4 }}>{status}</span>
      </div>

      {/* ── BMD PC offline banner ── */}
      {bmdOffline && (
        <div style={{ margin: '12px 12px 0', background: '#2a1400', border: `1px solid ${C.amber}`, borderLeft: `4px solid ${C.amber}`, borderRadius: 6, padding: '14px 18px' }}>
          <div style={{ color: C.amber, fontWeight: 700, fontSize: 14 }}>
            ⚠ BMD PC is not reachable
          </div>
          <div style={{ color: '#ffcc80', fontSize: 13, marginTop: 6, lineHeight: 1.7 }}>
            The GE Lunar scanner PC (<strong>192.168.134.55</strong>) appears to be <strong>off or disconnected</strong>.
            <br />
            Please make sure the BMD PC is <strong>turned on</strong> and connected to the network, then click Gather Data again.
          </div>
        </div>
      )}

      {/* ── Column headers ── */}
      {patients.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 200px 300px', gap: 8, padding: '6px 18px 2px', color: C.gray, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
          <div />
          <div>Patient</div>
          <div>XPS Files</div>
          <div>Actions</div>
        </div>
      )}

      {/* ── Patient cards ── */}
      <div style={{ padding: '0 10px 40px' }}>
        {patients.length === 0 && !loading && !bmdOffline && (
          <div style={{ color: C.gray, textAlign: 'center', padding: 60, fontSize: 14 }}>
            {offline ? 'Start the collector sidecar: pm2 start ecosystem.config.js' : 'No patients found in MDB for the last 48 hours.'}
          </div>
        )}
        {patients.map(info => (
          <PatientCard
            key={info.patient?.patient_id}
            info={info}
            uploaded={uploaded.has(info.patient?.patient_id)}
            isUploading={uploading.has(info.patient?.patient_id)}
            progressLog={progress[info.patient?.patient_id] ?? []}
            onUpload={uploadPatient}
          />
        ))}
      </div>

      {/* ── Link Older Study modal ── */}
      {linkOpen && (
        <LinkOlderStudyModal
          currentPids={currentPids}
          onClose={() => setLinkOpen(false)}
        />
      )}
    </div>
  )
}


// ── Patient card ──────────────────────────────────────────────────────────────

function PatientCard({ info, uploaded, isUploading, progressLog, onUpload }) {
  const p       = info.patient ?? {}
  const pid     = p.patient_id ?? ''
  const name    = `${p.title ?? ''} ${p.name ?? ''}`.trim() || pid
  const xpsList = info.xps_files ?? []
  const hasXps  = xpsList.length > 0
  const inDb    = info.exists_in_db
  const logEnd  = useRef(null)

  useEffect(() => {
    logEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [progressLog.length])

  let dotCol = C.red;  let cardBg = '#2a1010'
  if (uploaded)    { dotCol = C.green; cardBg = C.cardAlt }
  else if (isUploading) { dotCol = C.cyan;  cardBg = '#091e35' }
  else if (hasXps) { dotCol = C.teal; cardBg = C.card }

  const showActions = uploaded || inDb

  return (
    <div style={{ background: cardBg, border: `1px solid ${C.border}`, borderRadius: 6, margin: '4px 2px', padding: '10px 14px', display: 'grid', gridTemplateColumns: '28px 1fr 200px 300px', gap: 10, alignItems: 'start' }}>

      {/* Status dot */}
      <div style={{ paddingTop: 3, fontSize: 18, color: dotCol, textAlign: 'center' }}>
        {uploaded ? '✓' : '●'}
      </div>

      {/* Patient info + progress log */}
      <div>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{name}</div>
        <div style={{ color: C.gray, fontSize: 11, marginTop: 2 }}>
          MRN: <strong style={{ color: C.lt }}>{pid}</strong>
          &nbsp;·&nbsp; Scan: {fmtDate(info.scan_date)}
        </div>
        {inDb && !uploaded && (
          <div style={{ color: C.amber, fontSize: 10, fontWeight: 600, marginTop: 3 }}>
            ⚠ Already in Supabase — re-upload only if data changed
          </div>
        )}

        {progressLog.length > 0 && (
          <div style={{ marginTop: 6, background: '#080e18', borderRadius: 4, padding: '5px 8px', maxHeight: 90, overflowY: 'auto', fontSize: 10, fontFamily: 'monospace' }}>
            {progressLog.map((msg, i) => (
              <div key={i} style={{ color: msg.startsWith('✗') ? '#ef9a9a' : '#80DEEA', lineHeight: 1.7 }}>
                {msg}
              </div>
            ))}
            <div ref={logEnd} />
          </div>
        )}
      </div>

      {/* XPS files */}
      <div style={{ paddingTop: 3 }}>
        {uploaded ? (
          <span style={{ color: C.green, fontSize: 12, fontWeight: 600 }}>Uploaded ✓</span>
        ) : hasXps ? (
          xpsList.map((x, i) => (
            <div key={i} style={{ color: C.cyan, fontSize: 11 }}>✓ {basename(x)}</div>
          ))
        ) : (
          <span style={{ color: C.red, fontSize: 12, fontWeight: 600 }}>✗ XPS not found</span>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, paddingTop: 2 }}>
        {!uploaded && hasXps && (
          <Btn
            label={isUploading ? 'Uploading…' : '↑ Upload'}
            color={C.green}
            disabled={isUploading}
            onClick={() => onUpload(pid, xpsList)}
          />
        )}

        {showActions && (
          <>
            <Btn label="📋 Osteo"      color={C.teal}   href={`/bmd/report/osteo/${pid}`} />
            <Btn label="📊 Total Body" color={C.purple} href={`/bmd/report/totalbody/${pid}`} />
            <Btn label="↓ Osteo PDF"   color="#374151"  href={`/api/pdf?mrn=${pid}`} />
            <Btn label="↓ Total PDF"   color="#374151"  href={`/api/pdf?mrn=${pid}&type=totalbody`} />
            <Btn
              label="📱 WhatsApp"
              color={C.gray}
              textColor="#555"
              disabled
              title="Coming soon — awaiting API docs"
            />
          </>
        )}
      </div>
    </div>
  )
}


// ── Link Older Study modal ────────────────────────────────────────────────────

function LinkOlderStudyModal({ currentPids, onClose }) {
  const [all,       setAll]       = useState([])
  const [q,         setQ]         = useState('')
  const [loading,   setLoading]   = useState(true)
  const [selected,  setSelected]  = useState(null)   // patient info dict
  const [confirm,   setConfirm]   = useState(false)  // show type-selector
  const [uploading, setUploading] = useState(false)
  const [result,    setResult]    = useState(null)   // {ok, pid, scanType, error}

  useEffect(() => {
    fetch('/api/collector/all?max_count=200')
      .then(r => r.json())
      .then(data => { setAll(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = q
    ? all.filter(p => {
        const ql = q.toLowerCase()
        return (p.patient?.patient_id ?? '').toLowerCase().includes(ql)
            || (p.patient?.name ?? '').toLowerCase().includes(ql)
      })
    : all

  const matches = filtered.filter(p => currentPids.has(p.patient?.patient_id))
  const others  = filtered.filter(p => !currentPids.has(p.patient?.patient_id))

  const doLink = async (scanType) => {
    const pid = selected.patient?.patient_id
    setUploading(true)
    try {
      const res  = await fetch(`/api/collector/trend/${pid}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scan_type: scanType }),
      })
      const data = await res.json()
      setResult({ ok: data.ok, pid, scanType })
    } catch (e) {
      setResult({ ok: false, pid, scanType, error: e.message })
    } finally {
      setUploading(false)
    }
  }

  const overlay = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 100,
  }
  const modal = {
    background: C.dark, border: `1px solid ${C.border}`,
    borderRadius: 8, width: 700, maxHeight: '85vh',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  }

  // Done state
  if (result) {
    return (
      <div style={overlay}>
        <div style={{ ...modal, width: 420, padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 40 }}>{result.ok ? '✓' : '✗'}</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginTop: 12, color: result.ok ? C.green : C.red }}>
            {result.ok ? 'Linked successfully' : 'Link failed'}
          </div>
          <div style={{ color: C.gray, fontSize: 13, marginTop: 8 }}>
            {result.pid} → {result.scanType}
            {result.error && <div style={{ color: C.red, marginTop: 6 }}>{result.error}</div>}
          </div>
          <Btn label="Close" color={C.teal} onClick={onClose} style={{ marginTop: 20 }} />
        </div>
      </div>
    )
  }

  // Confirm / type-selector state
  if (confirm && selected) {
    const p    = selected.patient ?? {}
    const name = `${p.title ?? ''} ${p.name ?? ''}`.trim()
    return (
      <div style={overlay}>
        <div style={{ ...modal, width: 440, padding: 28 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: C.teal, marginBottom: 16 }}>Confirm Link</div>
          <div style={{ background: C.card, borderRadius: 6, padding: '12px 16px', fontSize: 13, lineHeight: 2, marginBottom: 20 }}>
            <div><span style={{ color: C.gray, width: 70, display: 'inline-block' }}>Name</span> <strong>{name}</strong></div>
            <div><span style={{ color: C.gray, width: 70, display: 'inline-block' }}>MRN</span> {p.patient_id}</div>
            <div><span style={{ color: C.gray, width: 70, display: 'inline-block' }}>DOB</span> {String(p.dob ?? '').slice(0, 10) || '—'}</div>
            <div><span style={{ color: C.gray, width: 70, display: 'inline-block' }}>Gender</span> {p.gender ?? '—'}</div>
            <div><span style={{ color: C.gray, width: 70, display: 'inline-block' }}>Scan</span> {fmtDateShort(selected.scan_date)}</div>
          </div>
          <div style={{ color: C.lt, fontSize: 12, marginBottom: 16 }}>
            Confirm this is the <strong>same patient</strong> as in your current system.
            Their MDB data will be uploaded as trend history — no images required.
          </div>
          <div style={{ color: C.gray, fontSize: 11, marginBottom: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Link as:</div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <Btn label="🦴 Bone Density (Osteo)"     color={C.teal}   disabled={uploading} onClick={() => doLink('osteo_trend')}      bold />
            <Btn label="🧬 Total Body Composition"   color={C.purple} disabled={uploading} onClick={() => doLink('total_body_trend')} bold />
          </div>
          {uploading && <div style={{ color: C.cyan, fontSize: 12 }}>Uploading…</div>}
          <Btn label="← Back" color="transparent" textColor={C.gray} border={C.border} onClick={() => setConfirm(false)} />
        </div>
      </div>
    )
  }

  // Main list state
  return (
    <div style={overlay}>
      <div style={modal}>

        {/* Header */}
        <div style={{ background: C.teal, padding: '12px 18px', flexShrink: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Link Older Study as Trend Data</div>
          <div style={{ color: '#B2DFDB', fontSize: 11, marginTop: 2 }}>
            Select a historical patient — MDB data uploads without XPS or images
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search MRN or name…"
            style={{ width: '100%', background: C.card, border: `1px solid ${C.border}`, borderRadius: 5, padding: '7px 12px', color: C.white, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Status */}
        <div style={{ padding: '4px 14px', color: C.gray, fontSize: 11, flexShrink: 0 }}>
          {loading
            ? 'Searching MDB…'
            : `${matches.length ? `${matches.length} quick match(es) · ` : ''}${filtered.length} patient(s)`
          }
        </div>

        {/* List */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {matches.length > 0 && (
            <>
              <SectionHeader label="Current session — same patient" color={C.teal} />
              {matches.map(info => (
                <PatientRow
                  key={info.patient?.patient_id}
                  info={info}
                  highlight
                  selected={selected?.patient?.patient_id === info.patient?.patient_id}
                  onClick={() => setSelected(info)}
                  onDoubleClick={() => { setSelected(info); setConfirm(true) }}
                />
              ))}
            </>
          )}
          {others.length > 0 && (
            <>
              {matches.length > 0 && <SectionHeader label="All patients in MDB" color={C.gray} />}
              {others.map(info => (
                <PatientRow
                  key={info.patient?.patient_id}
                  info={info}
                  selected={selected?.patient?.patient_id === info.patient?.patient_id}
                  onClick={() => setSelected(info)}
                  onDoubleClick={() => { setSelected(info); setConfirm(true) }}
                />
              ))}
            </>
          )}
          {!loading && filtered.length === 0 && (
            <div style={{ color: C.gray, textAlign: 'center', padding: 40 }}>No patients found</div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '10px 14px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 10, flexShrink: 0 }}>
          <Btn
            label="Select & Confirm →"
            color={C.pink}
            disabled={!selected}
            onClick={() => setConfirm(true)}
            bold
          />
          <Btn label="Cancel" color="transparent" textColor={C.gray} border={C.border} onClick={onClose} />
        </div>
      </div>
    </div>
  )
}

function SectionHeader({ label, color }) {
  return (
    <div style={{ padding: '5px 14px', background: '#0a1624', color, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, borderTop: `1px solid ${C.border}` }}>
      {label}
    </div>
  )
}

function PatientRow({ info, highlight, selected, onClick, onDoubleClick }) {
  const p       = info.patient ?? {}
  const pid     = p.patient_id ?? '?'
  const name    = `${p.title ?? ''} ${p.name ?? ''}`.trim() || '—'
  const dob     = String(p.dob ?? '').slice(0, 10) || '—'
  const gender  = (p.gender ?? '').slice(0, 1).toUpperCase() || '—'
  const dateStr = fmtDateShort(info.scan_date)

  return (
    <div
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      style={{
        display: 'grid',
        gridTemplateColumns: '90px 1fr 100px 60px 110px',
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
      <div style={{ color: highlight ? C.cyan : C.lt,  fontFamily: 'monospace' }}>{pid}</div>
      <div style={{ color: highlight ? C.white : C.lt, fontWeight: highlight ? 600 : 400 }}>{name}</div>
      <div style={{ color: C.gray }}>{dob}</div>
      <div style={{ color: C.gray }}>{gender}</div>
      <div style={{ color: C.gray }}>{dateStr}</div>
    </div>
  )
}


// ── Shared button ─────────────────────────────────────────────────────────────

function Btn({ label, color, textColor, border, href, onClick, disabled, title, bold, style: extraStyle }) {
  const base = {
    background:  disabled ? '#1a2a3a' : color,
    color:       disabled ? '#4a6a8a' : (textColor ?? C.white),
    border:      border ? `1px solid ${border}` : 'none',
    borderRadius: 4,
    padding:     '5px 12px',
    fontSize:    11,
    fontWeight:  bold ? 700 : 500,
    cursor:      disabled ? 'not-allowed' : 'pointer',
    textDecoration: 'none',
    display:     'inline-block',
    whiteSpace:  'nowrap',
    opacity:     disabled ? 0.55 : 1,
    ...extraStyle,
  }
  if (href && !disabled) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" style={base} title={title}>
        {label}
      </a>
    )
  }
  return (
    <button onClick={disabled ? undefined : onClick} style={base} title={title}>
      {label}
    </button>
  )
}
