'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import BASE from '@/lib/basepath'
import WaSendModal from '@/components/WaSendModal'

const C = {
  dark:    '#0D1B2A',
  card:    '#1a2f45',
  teal:    '#0D7377',
  green:   '#2E7D32',
  amber:   '#E65100',
  red:     '#B71C1C',
  purple:  '#6a1b9a',
  white:   '#FFFFFF',
  gray:    '#9E9E9E',
  lt:      '#B0BEC5',
  cyan:    '#4FC3F7',
  pink:    '#E91E8C',
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

function basename(p) { return (p || '').split(/[\\/]/).pop() }

// Derive scan type string from upload result (storage_prefix or scan_type field)
function _scanType(result) {
  const prefix = result?.storage_prefix ?? ''
  if (prefix.startsWith('raw-totalbody') || result?.scan_type === 'total_body') return 'total_body'
  return 'osteo'
}

export default function FetchStudiesPage() {
  // Recent studies (right panel)
  const [recent,     setRecent]     = useState([])
  const [recentSt,   setRecentSt]   = useState('idle')  // idle | loading | done | error
  const [recentErr,  setRecentErr]  = useState('')
  const [uploaded,   setUploaded]   = useState(() => new Map()) // mrn → scanType
  const [uploading,  setUploading]  = useState(() => new Set())
  const [progress,   setProgress]   = useState({})
  const [offline,    setOffline]    = useState(false)
  const [bmdOffline, setBmdOffline] = useState(false)
  const [lastFetched,setLastFetched]= useState(null)  // ISO timestamp

  // Date-range pickers (default: today)
  const todayStr = new Date().toISOString().slice(0, 10)
  const [dateFrom, setDateFrom] = useState(todayStr)
  const [dateTo,   setDateTo]   = useState(todayStr)

  // MDB browser (left panel)
  const [mdbAll,     setMdbAll]     = useState([])
  const [dbMrns,     setDbMrns]     = useState(new Map()) // mrn → scanType
  const [mdbQ,       setMdbQ]       = useState('')
  const [mdbLoading, setMdbLoading] = useState(true)
  const [selected,   setSelected]   = useState(null)
  const [xpsFiles,   setXpsFiles]   = useState([])
  const [xpsLoading, setXpsLoading] = useState(false)
  const [mdbProgress,setMdbProgress]= useState([])
  const [mdbUploading,setMdbUploading]=useState(false)
  const [mdbDone,    setMdbDone]    = useState(false)

  // Link older study modal
  const [linkOpen,    setLinkOpen]   = useState(false)
  const [archiveOpen, setArchiveOpen]= useState(false)
  const [archiveAvail,setArchiveAvail]=useState(null)

  // WA modal
  const [waOpen,     setWaOpen]     = useState(false)
  const [waMrn,      setWaMrn]      = useState(null)
  const [waName,     setWaName]     = useState('')

  const mdbLogEnd = useRef(null)

  // Load MDB all patients + DB mrns on mount
  useEffect(() => {
    Promise.all([
      fetch(`${BASE}/api/collector/all?max_count=500`).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`${BASE}/api/collector/db-mrns`).then(r => r.ok ? r.json() : { by_mrn: {} }).catch(() => ({ by_mrn: {} })),
    ]).then(([patients, dbData]) => {
      setMdbAll(Array.isArray(patients) ? patients : [])
      setDbMrns(new Map(Object.entries(dbData.by_mrn ?? {})))
      setMdbLoading(false)
    })
  }, [])

  // Check archive availability
  useEffect(() => {
    fetch(`${BASE}/api/collector/archive/status`)
      .then(r => r.json())
      .then(d => setArchiveAvail(d))
      .catch(() => setArchiveAvail({ available: false, reason: 'Sidecar offline' }))
  }, [])

  // When MDB patient selected, fetch XPS
  useEffect(() => {
    if (!selected) { setXpsFiles([]); return }
    const pid = selected.patient?.patient_id
    if (!pid) return
    setXpsLoading(true)
    setMdbProgress([])
    setMdbDone(false)
    fetch(`${BASE}/api/collector/xps/${pid}`)
      .then(r => r.json())
      .then(d => { setXpsFiles(d.xps_files ?? []); setXpsLoading(false) })
      .catch(() => setXpsLoading(false))
  }, [selected])

  useEffect(() => {
    mdbLogEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mdbProgress.length])

  const gather = useCallback(async (from, to) => {
    setRecentSt('loading')
    setOffline(false)
    setBmdOffline(false)
    const params = new URLSearchParams()
    if (from) params.set('date_from', from)
    if (to)   params.set('date_to',   to)
    try {
      const res = await fetch(`${BASE}/api/collector/recent?${params}`)
      if (!res.ok) {
        let detail = {}
        try { const b = await res.json(); detail = b.detail ?? b } catch {}
        if (detail.bmd_offline || res.status === 503) { setBmdOffline(true) }
        else { setOffline(true) }
        setRecentErr(detail.error ?? res.statusText)
        setRecentSt('error')
        return
      }
      const data = await res.json()
      setRecent(data)
      setRecentSt('done')
      setLastFetched(new Date().toISOString())
    } catch (e) {
      setOffline(true)
      setRecentErr(e.message)
      setRecentSt('error')
    }
  }, [])

  const uploadPatient = useCallback(async (pid, xpsPaths, fromMdb = false) => {
    const addLine = msg => setProgress(p => ({ ...p, [pid]: [...(p[pid] ?? []), msg] }))
    if (fromMdb) {
      setMdbUploading(true)
      setMdbProgress(['Starting upload…'])
    } else {
      setUploading(u => new Set([...u, pid]))
      setProgress(p => ({ ...p, [pid]: ['Starting upload…'] }))
    }

    try {
      const res = await fetch(`${BASE}/api/collector/upload/${pid}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xps_paths: xpsPaths }),
      })
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n'); buf = lines.pop()
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const evt = JSON.parse(line.slice(6))
            if (fromMdb) {
              if (evt.msg)   setMdbProgress(p => [...p, evt.msg])
              if (evt.done)  { const st = _scanType(evt.result); setMdbDone(true); setDbMrns(s => new Map([...s, [pid, st]])); setUploaded(u => new Map([...u, [pid, st]])); setMdbProgress(p => [...p, '✓ Done']) }
              if (evt.error) setMdbProgress(p => [...p, `✗ ${evt.error}`])
            } else {
              if (evt.msg)   addLine(evt.msg)
              if (evt.done)  { const st = _scanType(evt.result); setUploaded(u => new Map([...u, [pid, st]])); setDbMrns(s => new Map([...s, [pid, st]])); addLine('✓ Done') }
              if (evt.error) addLine(`✗ ${evt.error}`)
            }
          } catch {}
        }
      }
    } catch (e) {
      if (fromMdb) setMdbProgress(p => [...p, `✗ ${e.message}`])
      else setProgress(p => ({ ...p, [pid]: [...(p[pid] ?? []), `✗ ${e.message}`] }))
    } finally {
      if (fromMdb) setMdbUploading(false)
      else setUploading(u => { const n = new Set(u); n.delete(pid); return n })
    }
  }, [])

  const mdbFiltered = mdbQ
    ? mdbAll.filter(p => {
        const ql = mdbQ.toLowerCase()
        return (p.patient?.patient_id ?? '').toLowerCase().includes(ql)
            || (p.patient?.name ?? '').toLowerCase().includes(ql)
      })
    : mdbAll

  const selPid    = selected?.patient?.patient_id ?? ''
  const selName   = `${selected?.patient?.title ?? ''} ${selected?.patient?.name ?? ''}`.trim()
  const selInDb   = dbMrns.has(selPid)
  const selUpd    = uploaded.has(selPid) || mdbDone
  const selScanType = uploaded.get(selPid) ?? dbMrns.get(selPid) ?? 'osteo'

  return (
    <div style={{ position: 'fixed', inset: 0, background: C.dark, fontFamily: 'system-ui, sans-serif', color: C.white, display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ background: C.teal, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img src="https://www.sdrc.in/assets/sdrc-logo-full.png" alt="SDRC" style={{ height: 32, background: 'rgba(255,255,255,0.92)', borderRadius: 4, padding: '2px 6px' }} />
          <span style={{ color: '#B2DFDB', fontSize: 12, letterSpacing: 1 }}>Data Collector</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href={`${BASE}/`} style={{ background: 'rgba(255,255,255,0.15)', color: C.white, textDecoration: 'none', padding: '6px 14px', borderRadius: 5, fontSize: 12, fontWeight: 600, border: '1px solid rgba(255,255,255,0.25)' }}>
            ← Hub
          </a>
          <a href={`${BASE}/list`} style={{ background: 'rgba(255,255,255,0.15)', color: C.white, textDecoration: 'none', padding: '6px 14px', borderRadius: 5, fontSize: 12, fontWeight: 600, border: '1px solid rgba(255,255,255,0.25)' }}>
            📋 Patient List
          </a>
        </div>
      </div>

      {/* Two-panel body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* LEFT PANEL: MDB Browser */}
        <div style={{ width: 400, flexShrink: 0, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', background: '#0a1624' }}>
          <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: C.lt, textTransform: 'uppercase', letterSpacing: .8, marginBottom: 8 }}>
              MDB Browser
            </div>
            <input
              value={mdbQ}
              onChange={e => setMdbQ(e.target.value)}
              placeholder="Search MRN or name…"
              style={{ width: '100%', background: C.card, border: `1px solid ${C.border}`, borderRadius: 5, padding: '7px 11px', color: C.white, fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
            />
            <div style={{ marginTop: 5, display: 'flex', gap: 14 }}>
              <span style={{ fontSize: 10, color: C.gray }}>
                {mdbLoading ? 'Loading MDB…' : `${mdbFiltered.length} patient(s)`}
              </span>
              <span style={{ fontSize: 10, color: '#2E7D32' }}>● In DB</span>
              <span style={{ fontSize: 10, color: '#3a4a5a' }}>● Not uploaded</span>
            </div>
          </div>

          {/* Patient list */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {mdbFiltered.map(info => {
              const ip         = info.patient ?? {}
              const ipid       = ip.patient_id ?? ''
              const iname      = `${ip.title ?? ''} ${ip.name ?? ''}`.trim() || '—'
              const iinDb      = dbMrns.has(ipid)
              const isel       = selected?.patient?.patient_id === ipid
              const icomponents= info.scan_components ?? []
              const iScanType  = info.mdb_scan_type ?? 'osteo'
              const tagColor   = iScanType === 'total_body' ? C.purple : C.teal
              return (
                <div
                  key={ipid}
                  onClick={() => { setSelected(info); setMdbDone(false); setMdbProgress([]) }}
                  style={{
                    padding: '7px 14px', cursor: 'pointer',
                    borderBottom: `1px solid #0f2030`,
                    background: isel ? '#1a3a55' : 'transparent',
                    fontSize: 12,
                  }}
                  onMouseEnter={e => { if (!isel) e.currentTarget.style.background = '#0f2030' }}
                  onMouseLeave={e => { if (!isel) e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '14px 74px 1fr 80px', gap: 8, alignItems: 'center' }}>
                    <div style={{ color: iinDb ? '#4ade80' : '#2a3a4a', fontSize: 9 }}>●</div>
                    <div style={{ color: C.lt, fontFamily: 'monospace', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ipid}</div>
                    <div style={{ color: isel ? C.white : C.lt, fontWeight: isel ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{iname}</div>
                    <div style={{ color: C.gray, fontSize: 10, textAlign: 'right' }}>{fmtDateShort(info.scan_date)}</div>
                  </div>
                  {icomponents.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, marginTop: 3, paddingLeft: 22 }}>
                      {icomponents.map(c => (
                        <span key={c} style={{
                          background: tagColor + '18', border: `1px solid ${tagColor}44`,
                          color: tagColor, borderRadius: 2, padding: '0 5px',
                          fontSize: 9, fontWeight: 600, letterSpacing: 0.3,
                        }}>{c}</span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
            {!mdbLoading && mdbFiltered.length === 0 && (
              <div style={{ color: C.gray, textAlign: 'center', padding: 30, fontSize: 12 }}>No patients found</div>
            )}
          </div>

          {/* Selected patient actions */}
          {selected && (
            <div style={{ borderTop: `1px solid ${C.border}`, padding: 14, flexShrink: 0, background: '#0d1f35' }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{selName || selPid}</div>
              <div style={{ fontSize: 11, color: C.gray, marginBottom: 4 }}>
                MRN: <span style={{ color: C.lt }}>{selPid}</span>
                {' · '}Scan: {fmtDateShort(selected.scan_date)}
                {selInDb && <span style={{ color: '#4ade80', marginLeft: 8 }}>✓ In DB</span>}
              </div>
              <ScanBadges components={selected.scan_components ?? []} mdbScanType={selected.mdb_scan_type ?? 'osteo'} />
              <div style={{ marginBottom: 4 }} />

              {/* XPS status */}
              <div style={{ fontSize: 11, color: C.gray, marginBottom: 8 }}>
                {xpsLoading ? 'Checking XPS…' : xpsFiles.length > 0
                  ? xpsFiles.map((x, i) => <div key={i} style={{ color: C.cyan }}>✓ {basename(x)}</div>)
                  : <span style={{ color: '#f59e0b' }}>⚠ No XPS (MDB data only)</span>
                }
              </div>

              {/* Upload log */}
              {mdbProgress.length > 0 && (
                <div style={{ background: '#080e18', borderRadius: 4, padding: '5px 8px', maxHeight: 70, overflowY: 'auto', fontSize: 10, fontFamily: 'monospace', marginBottom: 8 }}>
                  {mdbProgress.map((msg, i) => (
                    <div key={i} style={{ color: msg.startsWith('✗') ? '#ef9a9a' : '#80DEEA', lineHeight: 1.7 }}>{msg}</div>
                  ))}
                  <div ref={mdbLogEnd} />
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {!selUpd && (
                  <Btn
                    label={mdbUploading ? 'Uploading…' : selInDb ? '↻ Refresh' : '↑ Upload'}
                    bg={selInDb ? '#92400e' : '#166534'}
                    disabled={mdbUploading}
                    onClick={() => uploadPatient(selPid, xpsFiles, true)}
                  />
                )}
                {selUpd && <span style={{ color: '#4ade80', fontSize: 11, fontWeight: 700 }}>✓ Uploaded</span>}
                {(selInDb || selUpd) && (
                  <>
                    {selScanType !== 'total_body' && <Btn label="🦴 Osteo"     bg={C.teal}   href={`${BASE}/report/osteo/${selPid}`} />}
                    {selScanType === 'total_body' && <Btn label="📊 Total Body" bg={C.purple} href={`${BASE}/report/totalbody/${selPid}`} />}
                    <Btn label="📱 WA" bg="#1a5c2a" textColor="#4ade80" onClick={() => { setWaMrn(selPid); setWaName(selName); setWaOpen(true) }} />
                  </>
                )}
              </div>
            </div>
          )}

          {/* Bottom toolbar */}
          <div style={{ borderTop: `1px solid ${C.border}`, padding: '8px 14px', flexShrink: 0, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Btn
              label="🗄️ Archive"
              bg="transparent"
              textColor={archiveAvail?.available ? '#90CAF9' : C.gray}
              border={archiveAvail?.available ? '#90CAF9' : '#2a3a4a'}
              disabled={!archiveAvail?.available}
              title={archiveAvail?.available ? 'Link archived MDB study as trend data' : (archiveAvail?.reason ?? 'Checking…')}
              onClick={() => setArchiveOpen(true)}
            />
            <Btn
              label="🔗 Link Older"
              bg="transparent"
              textColor={recent.length > 0 ? C.pink : C.gray}
              border={recent.length > 0 ? C.pink : '#2a3a4a'}
              disabled={recent.length === 0}
              onClick={() => setLinkOpen(true)}
            />
          </div>
        </div>

        {/* RIGHT PANEL: Recent studies */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Toolbar */}
          <div style={{ padding: '10px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
            {/* Date range pickers */}
            <label style={{ fontSize: 11, color: C.gray, display: 'flex', alignItems: 'center', gap: 4 }}>
              From
              <input
                type="date"
                value={dateFrom}
                max={dateTo || todayStr}
                onChange={e => setDateFrom(e.target.value)}
                style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 4, color: C.white, fontSize: 11, padding: '4px 6px', outline: 'none', colorScheme: 'dark' }}
              />
            </label>
            <label style={{ fontSize: 11, color: C.gray, display: 'flex', alignItems: 'center', gap: 4 }}>
              To
              <input
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                max={todayStr}
                onChange={e => setDateTo(e.target.value)}
                style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 4, color: C.white, fontSize: 11, padding: '4px 6px', outline: 'none', colorScheme: 'dark' }}
              />
            </label>
            <Btn
              label={recentSt === 'loading' ? '… Scanning' : '⟳ Gather Data'}
              bg={C.teal}
              disabled={recentSt === 'loading'}
              onClick={() => gather(dateFrom, dateTo)}
              bold
            />
            <span style={{ fontSize: 11, color: C.gray }}>
              {recentSt === 'done'    && `${recent.length} patient(s)${lastFetched ? ` · fetched ${new Date(lastFetched).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : ''}`}
              {recentSt === 'loading' && 'Scanning MDB…'}
              {recentSt === 'idle'    && 'Choose a date range and click Gather Data'}
              {recentSt === 'error'   && (bmdOffline ? '⚠ BMD PC unreachable' : `Error: ${recentErr}`)}
            </span>
            {offline && !bmdOffline && (
              <span style={{ color: '#f59e0b', fontSize: 11, fontWeight: 600 }}>
                ⚠ Collector API offline
              </span>
            )}
          </div>

          {/* BMD offline banner */}
          {bmdOffline && (
            <div style={{ margin: '12px 14px 0', background: '#2a1400', border: `1px solid ${C.amber}`, borderLeft: `4px solid ${C.amber}`, borderRadius: 6, padding: '12px 16px' }}>
              <div style={{ color: C.amber, fontWeight: 700, fontSize: 13 }}>⚠ BMD PC unreachable (192.168.134.55)</div>
              <div style={{ color: '#ffcc80', fontSize: 12, marginTop: 4 }}>Turn on the GE Lunar scanner PC and try Gather Data again.</div>
            </div>
          )}

          {/* Patient cards */}
          <div style={{ overflowY: 'auto', flex: 1, padding: '8px 10px 40px' }}>
            {recentSt === 'idle' && (
              <div style={{ color: C.gray, textAlign: 'center', padding: 60, fontSize: 13 }}>
                {offline
                  ? 'Start the collector: pm2 start ecosystem.config.js'
                  : 'Select a date range above and click ⟳ Gather Data to read the MDB.'
                }
              </div>
            )}
            {recentSt === 'done' && recent.length === 0 && !offline && !bmdOffline && (
              <div style={{ color: C.gray, textAlign: 'center', padding: 60, fontSize: 13 }}>
                No patients found for this date range.
              </div>
            )}

            {recent.map(info => (
              <RecentCard
                key={info.patient?.patient_id}
                info={info}
                uploaded={uploaded.has(info.patient?.patient_id)}
                isUploading={uploading.has(info.patient?.patient_id)}
                progressLog={progress[info.patient?.patient_id] ?? []}
                inDb={dbMrns.has(info.patient?.patient_id)}
                scanType={uploaded.get(info.patient?.patient_id) ?? dbMrns.get(info.patient?.patient_id) ?? 'osteo'}
                onUpload={uploadPatient}
                onUploaded={(pid, st) => { setUploaded(u => new Map([...u, [pid, st]])); setDbMrns(s => new Map([...s, [pid, st]])) }}
                onWa={(mrn, name) => { setWaMrn(mrn); setWaName(name); setWaOpen(true) }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      {archiveOpen && (
        <LinkOlderStudyModal
          currentPids={new Set(recent.map(p => p.patient?.patient_id).filter(Boolean))}
          onClose={() => setArchiveOpen(false)}
          archiveMode
        />
      )}
      {linkOpen && (
        <LinkOlderStudyModal
          currentPids={new Set(recent.map(p => p.patient?.patient_id).filter(Boolean))}
          onClose={() => setLinkOpen(false)}
        />
      )}
      {waOpen && waMrn && (
        <WaSendModal
          mrn={waMrn}
          patientName={waName}
          scanType="osteo"
          onClose={() => { setWaOpen(false); setWaMrn(null) }}
        />
      )}
    </div>
  )
}


// ── Scan component badge ──────────────────────────────────────────────────────

function ScanBadges({ components, mdbScanType }) {
  if (!components || components.length === 0) return null
  const color = mdbScanType === 'total_body' ? C.purple : C.teal
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
      {components.map(c => (
        <span key={c} style={{
          background: color + '22', border: `1px solid ${color}66`,
          color, borderRadius: 3, padding: '1px 7px',
          fontSize: 10, fontWeight: 600, letterSpacing: 0.4,
        }}>{c}</span>
      ))}
    </div>
  )
}

// ── Recent patient card ───────────────────────────────────────────────────────

function RecentCard({ info, uploaded, isUploading, progressLog, inDb, scanType, onUpload, onWa }) {
  const p          = info.patient ?? {}
  const pid        = p.patient_id ?? ''
  const name       = `${p.title ?? ''} ${p.name ?? ''}`.trim() || pid
  const xpsList    = info.xps_files ?? []
  const hasXps     = xpsList.length > 0
  const components = info.scan_components ?? []
  const mdbScanType= info.mdb_scan_type ?? 'osteo'
  const logEnd     = useRef(null)

  useEffect(() => {
    logEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [progressLog.length])

  let dotCol = '#B71C1C', cardBg = '#2a1010'
  if (uploaded)        { dotCol = '#4ade80'; cardBg = '#0a2a1a' }
  else if (isUploading){ dotCol = C.cyan;   cardBg = '#091e35' }
  else if (inDb)       { dotCol = '#f59e0b'; cardBg = '#1a1800' }
  else if (hasXps)     { dotCol = C.teal;   cardBg = C.card }

  const showActions = uploaded || inDb

  return (
    <div style={{ background: cardBg, border: `1px solid ${C.border}`, borderRadius: 6, margin: '4px 2px', padding: '10px 14px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '22px 1fr auto', gap: 10, alignItems: 'start' }}>

        {/* Status dot */}
        <div style={{ paddingTop: 2, fontSize: 16, color: dotCol, textAlign: 'center' }}>
          {uploaded ? '✓' : '●'}
        </div>

        {/* Patient info */}
        <div>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{name}</div>
          <div style={{ color: C.gray, fontSize: 11, marginTop: 2 }}>
            MRN: <strong style={{ color: C.lt }}>{pid}</strong>
            {' · '}Scan: {fmtDate(info.scan_date)}
          </div>
          {/* MDB scan components */}
          <ScanBadges components={components} mdbScanType={mdbScanType} />
          {inDb && !uploaded && (
            <div style={{ color: '#f59e0b', fontSize: 10, fontWeight: 600, marginTop: 4 }}>
              ⚠ Already in Supabase — re-upload only if data changed
            </div>
          )}
          {/* XPS */}
          <div style={{ marginTop: 4 }}>
            {uploaded ? (
              <span style={{ color: '#4ade80', fontSize: 11, fontWeight: 600 }}>Uploaded ✓</span>
            ) : hasXps ? (
              xpsList.map((x, i) => <span key={i} style={{ color: C.cyan, fontSize: 11, marginRight: 8 }}>✓ {basename(x)}</span>)
            ) : (
              <span style={{ color: '#f87171', fontSize: 11 }}>✗ XPS not found</span>
            )}
          </div>
        </div>

        {/* Actions column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-end', minWidth: 110 }}>
          {!uploaded && hasXps && (
            <Btn
              label={isUploading ? 'Uploading…' : '↑ Upload'}
              bg="#166534"
              disabled={isUploading}
              onClick={() => onUpload(pid, xpsList, false)}
              bold
            />
          )}
          {showActions && (
            <>
              {scanType !== 'total_body' && <Btn label="🦴 Osteo"     bg={C.teal}   href={`${BASE}/report/osteo/${pid}`} />}
              {scanType === 'total_body' && <Btn label="📊 Total Body" bg={C.purple} href={`${BASE}/report/totalbody/${pid}`} />}
              <Btn label="📱 WA" bg="#1a5c2a" textColor="#4ade80" onClick={() => onWa(pid, name)} />
            </>
          )}
        </div>
      </div>

      {/* Progress log */}
      {progressLog.length > 0 && (
        <div style={{ marginTop: 8, background: '#080e18', borderRadius: 4, padding: '5px 8px', maxHeight: 80, overflowY: 'auto', fontSize: 10, fontFamily: 'monospace' }}>
          {progressLog.map((msg, i) => (
            <div key={i} style={{ color: msg.startsWith('✗') ? '#ef9a9a' : '#80DEEA', lineHeight: 1.7 }}>{msg}</div>
          ))}
          <div ref={logEnd} />
        </div>
      )}
    </div>
  )
}


// ── Link Older Study modal ────────────────────────────────────────────────────

function LinkOlderStudyModal({ currentPids, onClose, archiveMode = false }) {
  const [all,       setAll]       = useState([])
  const [q,         setQ]         = useState('')
  const [loading,   setLoading]   = useState(true)
  const [selected,  setSelected]  = useState(null)
  const [confirm,   setConfirm]   = useState(false)
  const [uploading, setUploading] = useState(false)
  const [result,    setResult]    = useState(null)

  const listUrl  = archiveMode ? `${BASE}/api/collector/archive/all?max_count=500` : `${BASE}/api/collector/all?max_count=200`
  const trendBase= archiveMode ? `${BASE}/api/collector/archive/trend` : `${BASE}/api/collector/trend`

  useEffect(() => {
    fetch(listUrl).then(r => r.json()).then(data => { setAll(data); setLoading(false) }).catch(() => setLoading(false))
  }, [listUrl])

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
      const res  = await fetch(`${trendBase}/${pid}`, {
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

  const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }
  const modal   = { background: C.dark, border: `1px solid ${C.border}`, borderRadius: 8, width: 700, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }

  if (result) return (
    <div style={overlay}>
      <div style={{ ...modal, width: 400, padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 40 }}>{result.ok ? '✓' : '✗'}</div>
        <div style={{ fontSize: 16, fontWeight: 700, marginTop: 12, color: result.ok ? '#4ade80' : '#f87171' }}>
          {result.ok ? 'Linked successfully' : 'Link failed'}
        </div>
        <div style={{ color: C.gray, fontSize: 13, marginTop: 8 }}>
          {result.pid} → {result.scanType}
          {result.error && <div style={{ color: '#f87171', marginTop: 6 }}>{result.error}</div>}
        </div>
        <Btn label="Close" bg={C.teal} onClick={onClose} style={{ marginTop: 20 }} />
      </div>
    </div>
  )

  if (confirm && selected) {
    const p = selected.patient ?? {}
    const nm = `${p.title ?? ''} ${p.name ?? ''}`.trim()
    return (
      <div style={overlay}>
        <div style={{ ...modal, width: 440, padding: 28 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: C.teal, marginBottom: 16 }}>Confirm Link</div>
          <div style={{ background: C.card, borderRadius: 6, padding: '12px 16px', fontSize: 13, lineHeight: 2, marginBottom: 20 }}>
            <div><span style={{ color: C.gray, width: 70, display: 'inline-block' }}>Name</span> <strong>{nm}</strong></div>
            <div><span style={{ color: C.gray, width: 70, display: 'inline-block' }}>MRN</span> {p.patient_id}</div>
            <div><span style={{ color: C.gray, width: 70, display: 'inline-block' }}>Scan</span> {fmtDateShort(selected.scan_date)}</div>
          </div>
          <div style={{ color: C.lt, fontSize: 12, marginBottom: 14 }}>
            Their MDB data will be uploaded as trend history — no images required.
          </div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <Btn label="🦴 Bone Density"   bg={C.teal}   disabled={uploading} onClick={() => doLink('osteo_trend')} bold />
            <Btn label="🧬 Total Body"      bg={C.purple} disabled={uploading} onClick={() => doLink('total_body_trend')} bold />
          </div>
          {uploading && <div style={{ color: C.cyan, fontSize: 12 }}>Uploading…</div>}
          <Btn label="← Back" bg="transparent" textColor={C.gray} border={C.border} onClick={() => setConfirm(false)} />
        </div>
      </div>
    )
  }

  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={{ background: C.teal, padding: '12px 18px', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>
              {archiveMode ? '🗄️ Link Archived Study' : 'Link Older Study as Trend Data'}
            </div>
            <div style={{ color: '#B2DFDB', fontSize: 11, marginTop: 2 }}>
              MDB data uploads as trend history — no XPS needed
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#B2DFDB', fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search MRN or name…"
            autoFocus
            style={{ width: '100%', background: C.card, border: `1px solid ${C.border}`, borderRadius: 5, padding: '7px 12px', color: C.white, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ padding: '4px 14px', color: C.gray, fontSize: 11, flexShrink: 0 }}>
          {loading ? 'Loading MDB…' : `${filtered.length} patient(s)`}
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {matches.length > 0 && (
            <>
              <div style={{ padding: '4px 14px', background: '#0a1624', color: C.teal, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Current session match</div>
              {matches.map(info => <PatientRow key={info.patient?.patient_id} info={info} highlight selected={selected?.patient?.patient_id === info.patient?.patient_id} onClick={() => setSelected(info)} onDoubleClick={() => { setSelected(info); setConfirm(true) }} />)}
            </>
          )}
          {others.length > 0 && (
            <>
              {matches.length > 0 && <div style={{ padding: '4px 14px', background: '#0a1624', color: C.gray, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>All MDB patients</div>}
              {others.map(info => <PatientRow key={info.patient?.patient_id} info={info} selected={selected?.patient?.patient_id === info.patient?.patient_id} onClick={() => setSelected(info)} onDoubleClick={() => { setSelected(info); setConfirm(true) }} />)}
            </>
          )}
          {!loading && filtered.length === 0 && <div style={{ color: C.gray, textAlign: 'center', padding: 40 }}>No patients found</div>}
        </div>

        <div style={{ padding: '10px 14px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 10, flexShrink: 0 }}>
          <Btn label="Select & Confirm →" bg={C.pink} disabled={!selected} onClick={() => setConfirm(true)} bold />
          <Btn label="Cancel" bg="transparent" textColor={C.gray} border={C.border} onClick={onClose} />
        </div>
      </div>
    </div>
  )
}

function PatientRow({ info, highlight, selected, onClick, onDoubleClick }) {
  const p      = info.patient ?? {}
  const pid    = p.patient_id ?? '?'
  const name   = `${p.title ?? ''} ${p.name ?? ''}`.trim() || '—'
  const gender = (p.gender ?? '').slice(0, 1).toUpperCase() || '—'
  return (
    <div
      onClick={onClick} onDoubleClick={onDoubleClick}
      style={{ display: 'grid', gridTemplateColumns: '90px 1fr 50px 100px', gap: 8, padding: '8px 14px', cursor: 'pointer', borderBottom: `1px solid #0f2030`, background: selected ? '#1a3a55' : 'transparent', fontSize: 12 }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = '#0f2030' }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent' }}
    >
      <div style={{ color: highlight ? C.cyan : C.lt, fontFamily: 'monospace' }}>{pid}</div>
      <div style={{ color: highlight ? C.white : C.lt, fontWeight: highlight ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
      <div style={{ color: C.gray }}>{gender}</div>
      <div style={{ color: C.gray }}>{fmtDateShort(info.scan_date)}</div>
    </div>
  )
}


// ── Button ────────────────────────────────────────────────────────────────────

function Btn({ label, bg, textColor, border, href, onClick, disabled, title, bold, style: extra }) {
  const s = {
    background:  disabled ? '#1a2a3a' : bg,
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
    opacity:     disabled ? 0.5 : 1,
    ...extra,
  }
  if (href && !disabled)
    return <a href={href} target="_blank" rel="noopener noreferrer" style={s} title={title}>{label}</a>
  return <button onClick={disabled ? undefined : onClick} style={s} title={title}>{label}</button>
}
