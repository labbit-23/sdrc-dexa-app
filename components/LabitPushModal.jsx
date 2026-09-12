'use client'

import { useState } from 'react'
import BASE from '@/lib/basepath'

export default function LabitPushModal({ mrn, scanType = 'osteo', patientName = '', onClose, lh = false, anonymize = false, date = '', tpl = '' }) {
  const [busy,   setBusy]   = useState(false)
  const [result, setResult] = useState(null)

  const push = async () => {
    setBusy(true)
    setResult(null)
    try {
      // Push exactly the report the operator is currently looking at — same
      // letterhead/anonymize/date/template as the preview iframe — so the PDF
      // sent to Labit is never a re-render that could differ from what was
      // visually confirmed before clicking push.
      const res  = await fetch(`${BASE}/api/labit-push`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ mrn, scanType, lh, anonymize, date, tpl }),
      })
      const data = await res.json()
      setResult(res.ok ? { ok: true, ...data } : { error: data.error ?? 'Push failed', detail: data.detail })
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
  const lbl = {
    display: 'block', color: '#9E9E9E', fontSize: 11,
    fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginTop: 16,
  }
  const val = { fontSize: 14, marginTop: 4, color: '#e5e7eb' }

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={card}>

        <div style={{ fontWeight: 700, fontSize: 15, color: '#4ade80', marginBottom: 20 }}>
          📤 Push Report to Labit
        </div>

        {result ? (
          <div style={{ textAlign: 'center', padding: '12px 0 4px' }}>
            <div style={{ fontSize: 40 }}>{result.ok ? '✅' : '❌'}</div>
            <div style={{ fontWeight: 700, marginTop: 12, color: result.ok ? '#4ade80' : '#f87171' }}>
              {result.ok ? (result.alreadyExists ? 'Already pushed' : 'Pushed to Labit') : 'Push failed'}
            </div>
            {result.ok && (
              <div style={{ color: '#9E9E9E', fontSize: 12, marginTop: 6 }}>
                Awaiting doctor approval in Labit. Delivery to the patient happens automatically from there once approved.
              </div>
            )}
            {result.error && (
              <div style={{ color: '#fca5a5', fontSize: 12, marginTop: 8 }}>{result.error}</div>
            )}
            {result.detail && (
              <div style={{ color: '#9E9E9E', fontSize: 10, marginTop: 4, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                {JSON.stringify(result.detail)}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 24 }}>
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
            <span style={lbl}>Patient</span>
            <div style={val}>{patientName || `MRN ${mrn}`}</div>

            <span style={lbl}>Report Type</span>
            <div style={val}>{scanType === 'totalbody' ? '🧬 Total Body' : '🦴 Bone Density'}</div>

            <div style={{ color: '#9E9E9E', fontSize: 11, marginTop: 18, lineHeight: 1.5 }}>
              Sends the report you're currently previewing to Labit for doctor approval.
              Make sure it looks correct before pushing — this does not go to the patient
              directly.
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <button
                onClick={push}
                disabled={busy}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 5, fontSize: 13,
                  fontWeight: 700, cursor: busy ? 'not-allowed' : 'pointer',
                  background: busy ? '#1a3a2a' : '#1a5c2a',
                  color:      busy ? '#4a7a5a' : '#4ade80',
                  border: 'none',
                }}
              >
                {busy ? 'Pushing…' : '📤 Push to Labit'}
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
