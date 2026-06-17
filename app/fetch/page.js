'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import BASE from '@/lib/basepath'
import { tealToolbar, sdrcLogoStyle, labitInvertedStyle } from '@/lib/theme'
import WaSendModal from '@/components/WaSendModal'
import LinkStudyModal from '@/components/LinkStudyModal'

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

function _scanType(result) {
  const prefix = result?.storage_prefix ?? ''
  if (prefix.startsWith('raw-totalbody') || result?.scan_type === 'total_body') return 'total_body'
  return 'osteo'
}

// ── Styles ────────────────────────────────────────────────────────────────────

const navBtn = {
  background: 'rgba(255,255,255,0.15)', color: '#fff', textDecoration: 'none',
  padding: '6px 14px', borderRadius: 5, fontSize: 12, fontWeight: 600,
  border: '1px solid rgba(255,255,255,0.25)',
}

const dateInput = {
  background: C.card, border: `1px solid ${C.border}`, borderRadius: 4,
  color: C.white, fontSize: 11, padding: '3px 5px', outline: 'none', colorScheme: 'dark',
}


// ── Main page ─────────────────────────────────────────────────────────────────

export default function FetchStudiesPage() {
  const todayStr = new Date().toISOString().slice(0, 10)

  // List
  const [recent,      setRecent]      = useState([])
  const [recentSt,    setRecentSt]    = useState('idle')
  const [recentErr,   setRecentErr]   = useState('')
  const [lastFetched, setLastFetched] = useState(null)
  const [dateFrom,    setDateFrom]    = useState(todayStr)
  const [dateTo,      setDateTo]      = useState(todayStr)
  const [mdbQ,        setMdbQ]        = useState('')
  const [offline,     setOffline]     = useState(false)
  const [bmdOffline,  setBmdOffline]  = useState(false)

  // Selection + upload
  const [selected,      setSelected]      = useState(null)
  const [xpsTyped,      setXpsTyped]      = useState([])   // [{path, name, type}]
  const [xpsLoading,    setXpsLoading]    = useState(false)
  const [uploadLog,     setUploadLog]     = useState([])
  const [uploadingType, setUploadingType] = useState(null) // null | 'osteo' | 'total_body'
  const [doneTypes,     setDoneTypes]     = useState(new Set())
  const [dbMrns,        setDbMrns]        = useState(new Map())

  // Modals
  const [linkOpen,     setLinkOpen]     = useState(false)
  const [archiveOpen,  setArchiveOpen]  = useState(false)
  const [archiveAvail, setArchiveAvail] = useState(null)
  const [waOpen,       setWaOpen]       = useState(false)
  const [waMrn,        setWaMrn]        = useState(null)
  const [waName,       setWaName]       = useState('')

  const logEnd = useRef(null)

  // Load DB mrns on mount
  useEffect(() => {
    fetch(`${BASE}/api/collector/db-mrns`)
      .then(r => r.ok ? r.json() : { by_mrn: {} }).catch(() => ({ by_mrn: {} }))
      .then(d => setDbMrns(new Map(Object.entries(d.by_mrn ?? {}))))
  }, [])

  // Check archive on mount
  useEffect(() => {
    fetch(`${BASE}/api/collector/archive/status`)
      .then(r => r.json()).then(d => setArchiveAvail(d))
      .catch(() => setArchiveAvail({ available: false, reason: 'Sidecar offline' }))
  }, [])

  // Auto-load today on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { gather(todayStr, todayStr) }, [])

  // Fetch XPS when patient selected
  useEffect(() => {
    if (!selected) { setXpsTyped([]); return }
    const pid = selected.patient?.patient_id
    if (!pid) return
    setXpsLoading(true)
    setUploadLog([])
    setDoneTypes(new Set())
    setUploadingType(null)
    fetch(`${BASE}/api/collector/xps/${pid}`)
      .then(r => r.json())
      .then(d => { setXpsTyped(d.xps_typed ?? []); setXpsLoading(false) })
      .catch(() => setXpsLoading(false))
  }, [selected])

  useEffect(() => {
    logEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [uploadLog.length])

  const gather = useCallback(async (from, to) => {
    setSelected(null)
    setXpsTyped([])
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
        if (detail.bmd_offline || res.status === 503) setBmdOffline(true)
        else setOffline(true)
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

  const doUpload = useCallback(async (pid, xpsPaths, scanTypeOverride) => {
    setUploadingType(scanTypeOverride)
    setUploadLog([`Starting ${scanTypeOverride === 'total_body' ? 'Total Body' : 'Osteo'} upload…`])
    try {
      const res = await fetch(`${BASE}/api/collector/upload/${pid}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xps_paths: xpsPaths, scan_type_override: scanTypeOverride }),
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
            if (evt.msg)   setUploadLog(l => [...l, evt.msg])
            if (evt.done)  {
              setDoneTypes(s => new Set([...s, scanTypeOverride]))
              setDbMrns(s => new Map([...s, [pid, scanTypeOverride]]))
              setUploadLog(l => [...l, '✓ Done'])
            }
            if (evt.error) setUploadLog(l => [...l, `✗ ${evt.error}`])
          } catch {}
        }
      }
    } catch (e) {
      setUploadLog(l => [...l, `✗ ${e.message}`])
    } finally {
      setUploadingType(null)
    }
  }, [])

  const mdbFiltered = mdbQ
    ? recent.filter(p => {
        const ql = mdbQ.toLowerCase()
        return (p.patient?.patient_id ?? '').toLowerCase().includes(ql)
            || (p.patient?.name ?? '').toLowerCase().includes(ql)
      })
    : recent

  const selPid  = selected?.patient?.patient_id ?? ''
  const selName = `${selected?.patient?.title ?? ''} ${selected?.patient?.name ?? ''}`.trim()
  const selInDb = selected?.exists_in_db ?? false

  return (
    <div style={{ position: 'fixed', inset: 0, background: C.dark, fontFamily: 'system-ui, sans-serif', color: C.white, display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={tealToolbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${BASE}/sdrc-logo.png`} alt="SDRC" style={sdrcLogoStyle} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${BASE}/labit-logo-inverted.png`} alt="Labit" style={labitInvertedStyle} />
          <span style={{ color: '#B2DFDB', fontSize: 12, letterSpacing: 1, borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: 12 }}>Data Collector</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href={`${BASE}/`}     style={navBtn}>← Hub</a>
          <a href={`${BASE}/list`} style={navBtn}>📋 Patient List</a>
        </div>
      </div>

      {/* Two-panel body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── LEFT PANEL: date-filtered list ─────────────────────────────── */}
        <div style={{ width: 400, flexShrink: 0, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', background: '#0a1624' }}>

          {/* Header: search + date range + gather */}
          <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: C.lt, textTransform: 'uppercase', letterSpacing: .8, marginBottom: 8 }}>
              MDB Browser
            </div>
            <input
              value={mdbQ}
              onChange={e => setMdbQ(e.target.value)}
              placeholder="Search MRN or name…"
              style={{ width: '100%', background: C.card, border: `1px solid ${C.border}`, borderRadius: 5, padding: '7px 11px', color: C.white, fontSize: 12, outline: 'none', boxSizing: 'border-box', marginBottom: 8 }}
            />
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ fontSize: 11, color: C.gray, display: 'flex', alignItems: 'center', gap: 3 }}>
                From
                <input type="date" value={dateFrom} max={dateTo || todayStr}
                  onChange={e => { setDateFrom(e.target.value); e.target.blur() }} style={dateInput} />
              </label>
              <label style={{ fontSize: 11, color: C.gray, display: 'flex', alignItems: 'center', gap: 3 }}>
                To
                <input type="date" value={dateTo} min={dateFrom} max={todayStr}
                  onChange={e => { setDateTo(e.target.value); e.target.blur() }} style={dateInput} />
              </label>
              <Btn
                label={recentSt === 'loading' ? '…' : '⟳'}
                bg={C.teal} bold
                disabled={recentSt === 'loading'}
                onClick={() => gather(dateFrom, dateTo)}
              />
            </div>
            <div style={{ marginTop: 6, fontSize: 10, color: C.gray }}>
              {recentSt === 'loading' && 'Scanning MDB…'}
              {recentSt === 'done'    && `${mdbFiltered.length} of ${recent.length} scan(s)${lastFetched ? ` · ${new Date(lastFetched).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : ''}`}
              {recentSt === 'error'   && <span style={{ color: C.amber }}>{bmdOffline ? '⚠ BMD PC unreachable' : `Error: ${recentErr}`}</span>}
              {offline && !bmdOffline && <span style={{ color: '#f59e0b' }}> · API offline</span>}
              {recentSt === 'done' && (
                <span style={{ marginLeft: 10 }}>
                  <span style={{ color: '#4ade80' }}>● Uploaded</span>
                  {'  '}
                  <span style={{ color: '#3a4a5a' }}>● Not uploaded</span>
                </span>
              )}
            </div>
          </div>

          {/* Patient list */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {recentSt === 'loading' && (
              <div style={{ color: C.gray, textAlign: 'center', padding: 30, fontSize: 12 }}>Scanning MDB…</div>
            )}
            {recentSt === 'done' && mdbFiltered.length === 0 && (
              <div style={{ color: C.gray, textAlign: 'center', padding: 30, fontSize: 12 }}>
                {mdbQ ? 'No matches.' : 'No patients in this date range.'}
              </div>
            )}
            {mdbFiltered.map(info => {
              const ip       = info.patient ?? {}
              const ipid     = ip.patient_id ?? ''
              const iname    = `${ip.title ?? ''} ${ip.name ?? ''}`.trim() || '—'
              const iuploaded= info.exists_in_db
              const isel     = selected?.patient?.patient_id === ipid && selected?.scan_date === info.scan_date
              const icomps   = info.scan_components ?? []
              const iType    = info.mdb_scan_type ?? 'osteo'
              const tagColor = iType === 'total_body' && !info.has_osteo ? C.purple : C.teal
              const key      = `${ipid}-${info.scan_date}`

              return (
                <div
                  key={key}
                  onClick={() => { setSelected(info); setUploadLog([]) }}
                  style={{
                    padding: '8px 14px', cursor: 'pointer',
                    borderBottom: `1px solid #0f2030`,
                    background: isel ? '#1a3a55' : 'transparent',
                    fontSize: 12,
                  }}
                  onMouseEnter={e => { if (!isel) e.currentTarget.style.background = '#0f2030' }}
                  onMouseLeave={e => { if (!isel) e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '14px 74px 1fr 78px', gap: 8, alignItems: 'center' }}>
                    <div style={{ color: iuploaded ? '#4ade80' : '#2a3a4a', fontSize: 9 }}>●</div>
                    <div style={{ color: C.lt, fontFamily: 'monospace', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ipid}</div>
                    <div style={{ color: isel ? C.white : C.lt, fontWeight: isel ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{iname}</div>
                    <div style={{ color: C.gray, fontSize: 10, textAlign: 'right' }}>{fmtDateShort(info.scan_date)}</div>
                  </div>
                  {icomps.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, marginTop: 4, paddingLeft: 22, flexWrap: 'wrap' }}>
                      {icomps.map(c => {
                        const col = c === 'Total Body' ? C.purple : C.teal
                        return (
                          <span key={c} style={{
                            background: col + '18', border: `1px solid ${col}44`,
                            color: col, borderRadius: 2, padding: '0 5px',
                            fontSize: 9, fontWeight: 600, letterSpacing: 0.3,
                          }}>{c}</span>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Bottom toolbar */}
          <div style={{ borderTop: `1px solid ${C.border}`, padding: '8px 14px', flexShrink: 0, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Btn label="🗄️ Archive" bg="transparent"
              textColor={archiveAvail?.available ? '#90CAF9' : C.gray}
              border={archiveAvail?.available ? '#90CAF9' : '#2a3a4a'}
              disabled={!archiveAvail?.available}
              title={archiveAvail?.available ? 'Link archived MDB study as trend data' : (archiveAvail?.reason ?? (archiveAvail?.archives?.length ? 'Archive files not accessible' : 'Checking…'))}
              onClick={() => setArchiveOpen(true)} />
            <Btn label="🔗 Link Older" bg="transparent"
              textColor={recent.length > 0 ? C.pink : C.gray}
              border={recent.length > 0 ? C.pink : '#2a3a4a'}
              disabled={recent.length === 0}
              onClick={() => setLinkOpen(true)} />
          </div>
        </div>

        {/* ── RIGHT PANEL: selected patient detail ────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>

          {bmdOffline && (
            <div style={{ marginBottom: 16, background: '#2a1400', border: `1px solid ${C.amber}`, borderLeft: `4px solid ${C.amber}`, borderRadius: 6, padding: '12px 16px' }}>
              <div style={{ color: C.amber, fontWeight: 700, fontSize: 13 }}>⚠ BMD PC unreachable</div>
              <div style={{ color: '#ffcc80', fontSize: 12, marginTop: 4 }}>Turn on the GE Lunar scanner PC and click ⟳ to retry.</div>
            </div>
          )}

          {!selected ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60%', color: C.gray, fontSize: 13 }}>
              {recentSt === 'done' ? 'Select a patient from the list' : ''}
            </div>
          ) : (
            <SelectedDetail
              info={selected}
              xpsTyped={xpsTyped}
              xpsLoading={xpsLoading}
              inDb={selInDb}
              uploadingType={uploadingType}
              doneTypes={doneTypes}
              uploadLog={uploadLog}
              logEnd={logEnd}
              onUpload={(xpsPaths, scanTypeOverride) => doUpload(selPid, xpsPaths, scanTypeOverride)}
              onWa={() => { setWaMrn(selPid); setWaName(selName); setWaOpen(true) }}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      {archiveOpen && (
        <LinkStudyModal
          currentPids={new Set(recent.map(p => p.patient?.patient_id).filter(Boolean))}
          onClose={() => setArchiveOpen(false)}
          archiveMode
        />
      )}
      {linkOpen && (
        <LinkStudyModal
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


// ── Selected patient detail (right panel) ─────────────────────────────────────

function SelectedDetail({ info, xpsTyped, xpsLoading, inDb, uploadingType, doneTypes, uploadLog, logEnd, onUpload, onWa }) {
  const p           = info.patient ?? {}
  const pid         = p.patient_id ?? ''
  const name        = `${p.title ?? ''} ${p.name ?? ''}`.trim() || pid
  const mdbScanType = info.mdb_scan_type ?? 'osteo'
  const hasOsteo    = !!info.has_osteo
  const hasTb       = !!info.has_total_body
  const busy        = uploadingType !== null

  const [xpsWarn, setXpsWarn] = useState(null) // { forType, msg }

  // Clear warning when XPS list refreshes (new patient selected)
  useEffect(() => { setXpsWarn(null) }, [xpsTyped])

  function handleOsteo() {
    setXpsWarn(null)
    const matched = xpsTyped.filter(x => x.type === 'osteo').map(x => x.path)
    // XPS files exist but none are osteo-compatible — block and warn
    if (matched.length === 0 && xpsTyped.length > 0) {
      setXpsWarn({ forType: 'osteo', msg: 'No compatible Osteo XPS found. Please export the spine / femur scan from the BMD PC first.' })
      return
    }
    // No XPS at all → MDB-only upload (images skipped) — valid
    onUpload(matched, 'osteo')
  }

  function handleTb() {
    setXpsWarn(null)
    const matched = xpsTyped.filter(x => x.type === 'total_body').map(x => x.path)
    if (matched.length === 0 && xpsTyped.length > 0) {
      setXpsWarn({ forType: 'total_body', msg: 'No compatible Total Body XPS found. Please export the total body scan from the BMD PC first.' })
      return
    }
    onUpload(matched, 'total_body')
  }

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '20px 24px', maxWidth: 680 }}>

      {/* Patient header */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 17 }}>{name}</div>
        <div style={{ fontSize: 12, color: C.gray, marginTop: 3 }}>
          MRN: <strong style={{ color: C.lt, fontFamily: 'monospace' }}>{pid}</strong>
          {'  ·  '}
          Scan: {fmtDate(info.scan_date)}
          {inDb && <span style={{ color: '#4ade80', marginLeft: 12, fontWeight: 600 }}>✓ In Supabase</span>}
        </div>
        <ScanBadges components={info.scan_components ?? []} mdbScanType={mdbScanType} />
      </div>

      <div style={{ borderTop: `1px solid ${C.border}`, marginBottom: 14 }} />

      {/* XPS files */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, color: C.gray, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .8, marginBottom: 6 }}>XPS Files</div>
        {xpsLoading ? (
          <div style={{ color: C.gray, fontSize: 12 }}>Checking…</div>
        ) : xpsTyped.length > 0 ? (
          xpsTyped.map((x, i) => {
            const tc = x.type === 'total_body' ? C.purple : x.type === 'osteo' ? C.teal : C.gray
            const tl = x.type === 'total_body' ? 'Total Body' : x.type === 'osteo' ? 'Osteo' : 'Unknown'
            return (
              <div key={i} style={{ color: C.cyan, fontSize: 12, marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                ✓ {x.name}
                <span style={{ background: tc + '22', border: `1px solid ${tc}55`, color: tc, borderRadius: 2, padding: '0 5px', fontSize: 9, fontWeight: 700, letterSpacing: 0.3 }}>{tl}</span>
              </div>
            )
          })
        ) : (
          <div style={{ color: '#f59e0b', fontSize: 12 }}>⚠ No XPS files found — MDB data only</div>
        )}
      </div>

      {/* Upload log */}
      {uploadLog.length > 0 && (
        <div style={{ background: '#080e18', borderRadius: 4, padding: '6px 10px', maxHeight: 130, overflowY: 'auto', fontSize: 11, fontFamily: 'monospace', marginBottom: 14 }}>
          {uploadLog.map((msg, i) => (
            <div key={i} style={{ color: msg.startsWith('✗') ? '#ef9a9a' : '#80DEEA', lineHeight: 1.7 }}>{msg}</div>
          ))}
          <div ref={logEnd} />
        </div>
      )}

      {/* XPS mismatch warning */}
      {xpsWarn && (
        <div style={{ background: '#2a1400', border: `1px solid #E65100`, borderLeft: `3px solid #E65100`, borderRadius: 4, padding: '8px 12px', marginBottom: 12, fontSize: 11, color: '#ffcc80' }}>
          ⚠ {xpsWarn.msg}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {hasOsteo && (
          <Btn
            label={uploadingType === 'osteo' ? '🦴 Uploading…' : doneTypes.has('osteo') ? '🦴 ✓ Osteo' : inDb ? '🦴 ↻ Osteo' : '🦴 Upload Osteo'}
            bg={doneTypes.has('osteo') ? '#166534' : '#0f4a36'}
            border={doneTypes.has('osteo') ? '#4ade80' : undefined}
            disabled={busy || xpsLoading}
            onClick={handleOsteo}
            bold
          />
        )}
        {hasTb && (
          <Btn
            label={uploadingType === 'total_body' ? '📊 Uploading…' : doneTypes.has('total_body') ? '📊 ✓ Total Body' : inDb ? '📊 ↻ Total Body' : '📊 Upload Total Body'}
            bg={doneTypes.has('total_body') ? '#4a1d96' : '#2d1b69'}
            border={doneTypes.has('total_body') ? '#a78bfa' : undefined}
            disabled={busy || xpsLoading}
            onClick={handleTb}
            bold
          />
        )}
        {!hasOsteo && !hasTb && (
          <Btn
            label={busy ? 'Uploading…' : '↑ Upload'}
            bg="#166534"
            disabled={busy || xpsLoading}
            onClick={() => onUpload(xpsTyped.map(x => x.path), 'osteo')}
            bold
          />
        )}
        {(inDb || doneTypes.size > 0) && (
          <Btn label="📱 WA" bg="#1a5c2a" textColor="#4ade80" onClick={onWa} />
        )}
      </div>
    </div>
  )
}


// ── Scan component badges ─────────────────────────────────────────────────────

function ScanBadges({ components, mdbScanType }) {
  if (!components || components.length === 0) return null
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
      {components.map(c => {
        const color = c === 'Total Body' ? C.purple : C.teal
        return (
          <span key={c} style={{
            background: color + '22', border: `1px solid ${color}66`,
            color, borderRadius: 3, padding: '1px 7px',
            fontSize: 10, fontWeight: 600, letterSpacing: 0.4,
          }}>{c}</span>
        )
      })}
    </div>
  )
}


// ── Button ────────────────────────────────────────────────────────────────────

function Btn({ label, bg, textColor, border, href, onClick, disabled, title, bold, style: extra }) {
  const s = {
    background:     disabled ? '#1a2a3a' : bg,
    color:          disabled ? '#4a6a8a' : (textColor ?? C.white),
    border:         border ? `1px solid ${border}` : 'none',
    borderRadius:   4,
    padding:        '5px 12px',
    fontSize:       11,
    fontWeight:     bold ? 700 : 500,
    cursor:         disabled ? 'not-allowed' : 'pointer',
    textDecoration: 'none',
    display:        'inline-block',
    whiteSpace:     'nowrap',
    opacity:        disabled ? 0.5 : 1,
    ...extra,
  }
  if (href && !disabled)
    return <a href={href} target="_blank" rel="noopener noreferrer" style={s} title={title}>{label}</a>
  return <button onClick={disabled ? undefined : onClick} style={s} title={title}>{label}</button>
}
