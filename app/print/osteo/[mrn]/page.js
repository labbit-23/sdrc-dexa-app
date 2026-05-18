'use client'

import { useState, useEffect, useRef } from 'react'
import BASE from '@/lib/basepath'

export default function PrintPreviewOsteo({ params }) {
  const { mrn } = params
  const [lh, setLh] = useState(false)
  const [dialog, setDialog] = useState(false)
  const iframeRef = useRef(null)

  const previewUrl = lh
    ? `${BASE}/render/osteo/${mrn}?lh=1&preview=1`
    : `${BASE}/render/osteo/${mrn}?preview=1`

  // Intercept Ctrl-P / Cmd-P
  useEffect(() => {
    const handler = e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault()
        setDialog(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const doPrint = (withLh) => {
    setDialog(false)
    const printUrl = withLh
      ? `${BASE}/render/osteo/${mrn}?lh=1&preview=1`
      : `${BASE}/render/osteo/${mrn}?preview=1`

    const win = window.open(printUrl, '_blank')
    if (!win) return
    win.addEventListener('load', () => {
      setTimeout(() => { win.print() }, 400)
    })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#4a5568', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif' }}>

      {/* Toolbar */}
      <div style={{
        height: 48, background: '#1a202c', display: 'flex', alignItems: 'center',
        gap: 10, padding: '0 16px', flexShrink: 0, borderBottom: '1px solid #2d3748',
      }}>
        <a href={`${BASE}/report/osteo/${mrn}`} style={{ color: '#a0aec0', fontSize: 12, textDecoration: 'none', padding: '5px 12px', borderRadius: 4, border: '1px solid #4a5568' }}>
          ← Report
        </a>
        <span style={{ color: '#718096', fontSize: 12, marginLeft: 4 }}>
          Print Preview · MRN {mrn}
        </span>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setLh(l => !l)}
          style={{
            padding: '5px 14px', borderRadius: 5, fontSize: 12, fontWeight: 600,
            background: lh ? '#fff3e0' : '#2d3748',
            color: lh ? '#b45309' : '#a0aec0',
            border: `1px solid ${lh ? '#f59e0b88' : '#4a5568'}`,
            cursor: 'pointer',
          }}
        >
          {lh ? '✕ Exit Letterhead' : '📄 Letterhead'}
        </button>
        <button
          onClick={() => setDialog(true)}
          style={{
            padding: '5px 18px', borderRadius: 5, fontSize: 12, fontWeight: 700,
            background: '#0D7377', color: '#fff', border: 'none', cursor: 'pointer',
          }}
        >
          🖨 Print…
        </button>
      </div>

      {/* Preview iframe */}
      <iframe
        ref={iframeRef}
        key={previewUrl}
        src={previewUrl}
        style={{ flex: 1, border: 'none', width: '100%' }}
        title="Print Preview"
      />

      {/* Plain / Letterhead dialog */}
      {dialog && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }}>
          <div style={{
            background: '#1a202c', border: '1px solid #2d3748', borderRadius: 10,
            padding: '28px 32px', minWidth: 320, textAlign: 'center',
          }}>
            <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Print report as…</div>
            <div style={{ color: '#718096', fontSize: 12, marginBottom: 24 }}>Choose layout for this print job</div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => doPrint(false)}
                style={{ flex: 1, padding: '10px 0', borderRadius: 6, fontSize: 13, fontWeight: 700, background: '#0D7377', color: '#fff', border: 'none', cursor: 'pointer' }}
              >
                📄 Plain
              </button>
              <button
                onClick={() => doPrint(true)}
                style={{ flex: 1, padding: '10px 0', borderRadius: 6, fontSize: 13, fontWeight: 700, background: '#92400e', color: '#fef3c7', border: 'none', cursor: 'pointer' }}
              >
                🏥 Letterhead
              </button>
            </div>
            <button
              onClick={() => setDialog(false)}
              style={{ marginTop: 14, color: '#718096', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
