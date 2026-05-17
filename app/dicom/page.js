'use client'

import { useState, useEffect } from 'react'
import BASE from '@/lib/basepath'

const DICOM_URL = process.env.NEXT_PUBLIC_DICOM_SEND_URL ?? ''

const C = {
  bg:     '#f0f4f8',
  white:  '#ffffff',
  teal:   '#0D7377',
  purple: '#6a1b9a',
  border: '#d0dce8',
  gray:   '#6b7280',
  lt:     '#374151',
  dark:   '#1a1a2e',
  green:  '#166534',
  greenBg:'#dcfce7',
  greenTx:'#16a34a',
  red:    '#991b1b',
  redBg:  '#fee2e2',
  redTx:  '#dc2626',
  amber:  '#92400e',
  amberBg:'#fef3c7',
  amberTx:'#d97706',
  card:   '#ffffff',
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function fmtDate(s) {
  if (!s) return '—'
  try {
    return new Date(s).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return s }
}

export default function DicomDashboard() {
  const [date,        setDate]        = useState(todayStr())
  const [studies,     setStudies]     = useState([])
  const [studyLoad,   setStudyLoad]   = useState('idle')  // idle | loading | done | error
  const [studyErr,    setStudyErr]    = useState('')
  const [sending,     setSending]     = useState({})      // accession → 'sending'|'ok'|'err'
  const [sendErr,     setSendErr]     = useState({})      // accession → error string
  const [phoneMap,    setPhoneMap]    = useState({})      // accession → phone

  // Manual send form
  const [manAcc,      setManAcc]      = useState('')
  const [manPhone,    setManPhone]    = useState('')
  const [manSending,  setManSending]  = useState(false)
  const [manResult,   setManResult]   = useState(null)   // {ok, error}

  const loadStudies = async () => {
    setStudyLoad('loading')
    setStudyErr('')
    try {
      const d = date.replace(/-/g, '')
      const res = await fetch(`${DICOM_URL}/studies?date=${d}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setStudies(Array.isArray(data) ? data : (data.studies ?? []))
      setStudyLoad('done')
    } catch (e) {
      setStudyErr(e.message)
      setStudyLoad('error')
    }
  }

  const sendStudy = async (accession) => {
    const phone = (phoneMap[accession] ?? '').trim()
    if (!phone) return
    setSending(s => ({ ...s, [accession]: 'sending' }))
    setSendErr(e => ({ ...e, [accession]: '' }))
    try {
      const res = await fetch(`${DICOM_URL}/manualsend/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accession, phone }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail ?? body.error ?? `HTTP ${res.status}`)
      }
      setSending(s => ({ ...s, [accession]: 'ok' }))
    } catch (e) {
      setSending(s => ({ ...s, [accession]: 'err' }))
      setSendErr(err => ({ ...err, [accession]: e.message }))
    }
  }

  const manualSend = async () => {
    if (!manAcc.trim() || !manPhone.trim()) return
    setManSending(true)
    setManResult(null)
    try {
      const res = await fetch(`${DICOM_URL}/manualsend/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accession: manAcc.trim(), phone: manPhone.trim() }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail ?? body.error ?? `HTTP ${res.status}`)
      }
      setManResult({ ok: true })
    } catch (e) {
      setManResult({ ok: false, error: e.message })
    } finally {
      setManSending(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{
        background: C.purple, height: 52,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img
            src="https://www.sdrc.in/assets/sdrc-logo-full.png" alt="SDRC"
            style={{ height: 32, background: 'rgba(255,255,255,0.92)', borderRadius: 4, padding: '2px 6px' }}
          />
          <span style={{ color: '#e9d5ff', fontSize: 12, letterSpacing: 1 }}>DICOM Dashboard</span>
        </div>
        <a
          href={`${BASE}/`}
          style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', textDecoration: 'none', padding: '6px 14px', borderRadius: 5, fontSize: 12, fontWeight: 600, border: '1px solid rgba(255,255,255,0.25)' }}
        >
          ← Hub
        </a>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px', display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20, alignItems: 'start' }}>

        {/* LEFT: Study browser */}
        <div>
          <div style={{ background: C.card, borderRadius: 10, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            <div style={{ borderBottom: `1px solid ${C.border}`, padding: '14px 18px', background: '#f8fafc' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: C.dark, marginBottom: 10 }}>
                📡 Studies by Date
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  style={{ padding: '7px 10px', borderRadius: 5, border: `1px solid ${C.border}`, fontSize: 13, color: C.dark, outline: 'none', background: '#fff' }}
                />
                <button
                  onClick={loadStudies}
                  disabled={studyLoad === 'loading'}
                  style={{
                    padding: '7px 20px', borderRadius: 5, fontSize: 13, fontWeight: 700,
                    background: studyLoad === 'loading' ? '#9ca3af' : C.purple, color: '#fff',
                    border: 'none', cursor: studyLoad === 'loading' ? 'default' : 'pointer',
                  }}
                >
                  {studyLoad === 'loading' ? 'Loading…' : 'Load Studies'}
                </button>
                {studyLoad === 'done' && (
                  <span style={{ color: C.gray, fontSize: 12 }}>{studies.length} study(ies) found</span>
                )}
              </div>
            </div>

            {studyLoad === 'error' && (
              <div style={{ margin: 16, padding: '12px 16px', background: C.redBg, border: `1px solid #fca5a5`, borderRadius: 6 }}>
                <div style={{ color: C.redTx, fontWeight: 700, fontSize: 13 }}>Failed to load studies</div>
                <div style={{ color: C.redTx, fontSize: 12, marginTop: 4 }}>{studyErr}</div>
                <div style={{ color: '#9f1239', fontSize: 11, marginTop: 4 }}>
                  Is the DICOM bridge running at {DICOM_URL || '(NEXT_PUBLIC_DICOM_SEND_URL not set)'}?
                </div>
              </div>
            )}

            {studyLoad === 'idle' && (
              <div style={{ padding: 40, textAlign: 'center', color: C.gray, fontSize: 13 }}>
                Select a date and click Load Studies
              </div>
            )}

            {studyLoad === 'done' && studies.length === 0 && (
              <div style={{ padding: 40, textAlign: 'center', color: C.gray, fontSize: 13 }}>
                No studies found for {date}
              </div>
            )}

            {studies.map((study, idx) => {
              const acc  = study.accession ?? study.AccessionNumber ?? `study-${idx}`
              const desc = study.description ?? study.StudyDescription ?? '—'
              const pid  = study.patient_id  ?? study.PatientID       ?? '—'
              const name = study.patient_name ?? study.PatientName    ?? '—'
              const dt   = study.date_time ?? study.StudyDate ?? ''
              const st   = sending[acc]
              const phone = phoneMap[acc] ?? ''

              return (
                <div
                  key={acc}
                  style={{
                    padding: '14px 18px',
                    borderBottom: `1px solid ${C.border}`,
                    background: st === 'ok' ? '#f0fdf4' : '#fff',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: C.dark }}>{name}</div>
                      <div style={{ fontSize: 12, color: C.gray, marginTop: 2 }}>
                        MRN: <strong style={{ color: C.lt }}>{pid}</strong>
                        {' · '}Accession: <span style={{ fontFamily: 'monospace', color: C.lt }}>{acc}</span>
                      </div>
                      <div style={{ fontSize: 12, color: C.gray, marginTop: 1 }}>
                        {desc}{dt ? ` · ${fmtDate(dt)}` : ''}
                      </div>
                    </div>
                    {st === 'ok' && (
                      <span style={{ background: C.greenBg, color: C.greenTx, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                        ✓ Sent
                      </span>
                    )}
                  </div>

                  {st !== 'ok' && (
                    <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        value={phone}
                        onChange={e => setPhoneMap(m => ({ ...m, [acc]: e.target.value }))}
                        placeholder="Mobile number…"
                        style={{
                          flex: 1, padding: '6px 10px', borderRadius: 5,
                          border: `1px solid ${C.border}`, fontSize: 12, outline: 'none', color: C.dark,
                        }}
                      />
                      <button
                        onClick={() => sendStudy(acc)}
                        disabled={!phone.trim() || st === 'sending'}
                        style={{
                          padding: '6px 16px', borderRadius: 5, fontSize: 12, fontWeight: 700,
                          background: !phone.trim() || st === 'sending' ? '#9ca3af' : '#16a34a',
                          color: '#fff', border: 'none',
                          cursor: !phone.trim() || st === 'sending' ? 'default' : 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {st === 'sending' ? 'Sending…' : '📱 WhatsApp'}
                      </button>
                    </div>
                  )}

                  {st === 'err' && (
                    <div style={{ marginTop: 6, color: C.redTx, fontSize: 11 }}>
                      ✗ {sendErr[acc]}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* RIGHT: Manual send */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: C.card, borderRadius: 10, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            <div style={{ background: '#1a5c2a', padding: '14px 18px' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#4ade80' }}>📱 Manual WhatsApp Send</div>
              <div style={{ color: '#86efac', fontSize: 11, marginTop: 2 }}>
                Send any study report directly by accession number
              </div>
            </div>
            <div style={{ padding: '18px 18px' }}>
              {manResult?.ok ? (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <div style={{ fontSize: 32 }}>✅</div>
                  <div style={{ color: C.greenTx, fontWeight: 700, fontSize: 14, marginTop: 8 }}>Sent successfully</div>
                  <div style={{ color: C.gray, fontSize: 12, marginTop: 4 }}>{manAcc} → {manPhone}</div>
                  <button
                    onClick={() => { setManResult(null); setManAcc(''); setManPhone('') }}
                    style={{ marginTop: 14, padding: '6px 20px', borderRadius: 5, fontSize: 12, fontWeight: 600, background: C.teal, color: '#fff', border: 'none', cursor: 'pointer' }}
                  >
                    Send Another
                  </button>
                </div>
              ) : (
                <>
                  <label style={{ display: 'block', color: C.gray, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 5 }}>
                    Accession Number
                  </label>
                  <input
                    value={manAcc}
                    onChange={e => setManAcc(e.target.value)}
                    placeholder="e.g. SDRC2026001234"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 5, border: `1px solid ${C.border}`, fontSize: 13, outline: 'none', color: C.dark, boxSizing: 'border-box', marginBottom: 14 }}
                  />

                  <label style={{ display: 'block', color: C.gray, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 5 }}>
                    Mobile Number
                  </label>
                  <input
                    value={manPhone}
                    onChange={e => setManPhone(e.target.value)}
                    placeholder="9949099249  or  919949099249"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 5, border: `1px solid ${C.border}`, fontSize: 13, outline: 'none', color: C.dark, boxSizing: 'border-box', marginBottom: 14 }}
                  />

                  {manResult?.error && (
                    <div style={{ background: C.redBg, border: `1px solid #fca5a5`, borderRadius: 5, padding: '8px 12px', marginBottom: 12, color: C.redTx, fontSize: 12 }}>
                      ✗ {manResult.error}
                    </div>
                  )}

                  <button
                    onClick={manualSend}
                    disabled={manSending || !manAcc.trim() || !manPhone.trim()}
                    style={{
                      width: '100%', padding: '9px 0', borderRadius: 5, fontSize: 13, fontWeight: 700,
                      background: manSending || !manAcc.trim() || !manPhone.trim() ? '#9ca3af' : '#16a34a',
                      color: '#fff', border: 'none',
                      cursor: manSending || !manAcc.trim() || !manPhone.trim() ? 'default' : 'pointer',
                    }}
                  >
                    {manSending ? '⏳ Sending…' : '📤 Send Report'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Info card */}
          <div style={{ background: C.card, borderRadius: 10, border: `1px solid ${C.border}`, padding: '14px 18px' }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: C.gray, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 10 }}>
              Bridge Status
            </div>
            <div style={{ fontSize: 12, color: C.lt, lineHeight: 2 }}>
              <div><span style={{ color: C.gray }}>Endpoint </span><span style={{ fontFamily: 'monospace', fontSize: 11 }}>{DICOM_URL || '(not configured)'}</span></div>
            </div>
            {!DICOM_URL && (
              <div style={{ marginTop: 10, background: C.amberBg, borderRadius: 5, padding: '8px 10px', fontSize: 11, color: C.amberTx }}>
                Set <code>NEXT_PUBLIC_DICOM_SEND_URL</code> in .env.local
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
