'use client'

import { useState } from 'react'

function normalizePhoneDisplay(raw) {
  const d = raw.replace(/\D/g, '')
  if (d.length === 10) return `+91 ${d.slice(0,5)} ${d.slice(5)}`
  if (d.startsWith('91') && d.length === 12) return `+91 ${d.slice(2,7)} ${d.slice(7)}`
  return raw
}

export default function WaSendModal({ mrn, scanType = 'osteo', patientName = '', onClose }) {
  const [phone,  setPhone]  = useState('')
  const [name,   setName]   = useState(patientName)
  const [type,   setType]   = useState(scanType)
  const [busy,   setBusy]   = useState(false)
  const [result, setResult] = useState(null)

  const send = async () => {
    if (!phone.trim()) return
    setBusy(true)
    setResult(null)
    try {
      const res  = await fetch('/api/wa-send', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ phone, mrn, scanType: type, patientName: name }),
      })
      const data = await res.json()
      setResult(res.ok ? { ok: true, pdfUrl: data.pdfUrl } : { error: data.error ?? 'Send failed' })
    } catch (e) {
      setResult({ error: e.message })
    } finally {
      setBusy(false)
    }
  }

  const overlay = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999,
  }
  const card = {
    background: '#0D1B2A', border: '1px solid #1e3a5a', borderRadius: 10,
    width: 420, padding: 28, fontFamily: 'system-ui, sans-serif', color: '#fff',
  }
  const inp = {
    width: '100%', background: '#1a2f45', border: '1px solid #1e3a5a',
    borderRadius: 5, padding: '8px 12px', color: '#fff', fontSize: 13,
    outline: 'none', boxSizing: 'border-box', marginTop: 6,
  }
  const lbl = {
    display: 'block', color: '#9E9E9E', fontSize: 11,
    fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginTop: 16,
  }

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={card}>

        <div style={{ fontWeight: 700, fontSize: 15, color: '#4ade80', marginBottom: 20 }}>
          📱 Send Report via WhatsApp
        </div>

        {result ? (
          <div style={{ textAlign: 'center', padding: '12px 0 4px' }}>
            <div style={{ fontSize: 40 }}>{result.ok ? '✅' : '❌'}</div>
            <div style={{ fontWeight: 700, marginTop: 12, color: result.ok ? '#4ade80' : '#f87171' }}>
              {result.ok ? 'Sent successfully' : 'Send failed'}
            </div>
            {result.ok && (
              <div style={{ color: '#9E9E9E', fontSize: 12, marginTop: 6 }}>
                Report dispatched to {normalizePhoneDisplay(phone)}
              </div>
            )}
            {result.error && (
              <div style={{ color: '#fca5a5', fontSize: 12, marginTop: 8 }}>{result.error}</div>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 24 }}>
              {result.ok && (
                <button
                  onClick={() => { setResult(null); setPhone('') }}
                  style={{ padding: '7px 16px', borderRadius: 5, fontSize: 12, fontWeight: 600, background: '#0D7377', color: '#fff', border: 'none', cursor: 'pointer' }}
                >
                  Send Another
                </button>
              )}
              <button
                onClick={onClose}
                style={{ padding: '7px 16px', borderRadius: 5, fontSize: 12, fontWeight: 600, background: 'transparent', color: '#9E9E9E', border: '1px solid #1e3a5a', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <>
            <span style={lbl}>Patient Name</span>
            <input
              style={inp} value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Full name as on report"
            />

            <span style={lbl}>Mobile Number</span>
            <input
              style={inp} value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="9949099249  or  919949099249"
              onKeyDown={e => e.key === 'Enter' && send()}
            />

            <span style={lbl}>Report Type</span>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              {[
                ['osteo',     '🦴 Bone Density'],
                ['totalbody', '🧬 Total Body'],
              ].map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setType(val)}
                  style={{
                    flex: 1, padding: '8px 0', borderRadius: 5, fontSize: 12,
                    fontWeight: 600, cursor: 'pointer',
                    border:      `1px solid ${type === val ? '#0D7377' : '#1e3a5a'}`,
                    background:  type === val ? '#0d3a3c' : '#1a2f45',
                    color:       type === val ? '#80DEEA' : '#9E9E9E',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <div style={{ color: '#3a5a7a', fontSize: 10, marginTop: 10, fontFamily: 'monospace' }}>
              PDF → /api/pdf?mrn={mrn}&type={type}&lh=1
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <button
                onClick={send}
                disabled={busy || !phone.trim()}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 5, fontSize: 13,
                  fontWeight: 700, cursor: busy || !phone.trim() ? 'not-allowed' : 'pointer',
                  background: busy || !phone.trim() ? '#1a3a2a' : '#1a5c2a',
                  color:      busy || !phone.trim() ? '#4a7a5a' : '#4ade80',
                  border: 'none',
                }}
              >
                {busy ? 'Sending…' : '📤 Send'}
              </button>
              <button
                onClick={onClose}
                style={{ padding: '9px 20px', borderRadius: 5, fontSize: 13, fontWeight: 600, background: 'transparent', color: '#9E9E9E', border: '1px solid #1e3a5a', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
