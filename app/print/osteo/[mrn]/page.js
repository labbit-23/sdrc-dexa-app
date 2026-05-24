'use client'

import { useState, useEffect } from 'react'
import WaSendModal from '@/components/WaSendModal'
import BASE from '@/lib/basepath'

function PdfBtn({ href, label, bg, faint }) {
  const [busy, setBusy] = useState(false)
  const download = () => {
    setBusy(true)
    window.location.href = href
    setTimeout(() => setBusy(false), 8000)
  }
  return (
    <button
      onClick={download}
      disabled={busy}
      style={{
        padding: '5px 14px', borderRadius: 5, fontSize: 12, fontWeight: 700,
        background: busy ? '#6b7280' : bg, color: busy ? '#d1d5db' : (faint ?? '#fff'),
        border: 'none', cursor: busy ? 'default' : 'pointer', whiteSpace: 'nowrap',
      }}
    >
      {busy ? '⏳ Generating…' : label}
    </button>
  )
}

export default function PrintPreviewOsteo({ params }) {
  const { mrn } = params
  const [lh, setLh] = useState(false)
  const [waOpen, setWaOpen] = useState(false)

  const previewUrl = lh
    ? `${BASE}/render/osteo/${mrn}?lh=1&preview=1`
    : `${BASE}/render/osteo/${mrn}?preview=1`

  const pdfHref = lh
    ? `${BASE}/api/pdf?mrn=${mrn}&lh=1`
    : `${BASE}/api/pdf?mrn=${mrn}`

  const doPrint = () => {
    const win = window.open(previewUrl, '_blank')
    if (!win) return
    win.addEventListener('load', () => { setTimeout(() => { win.print() }, 400) })
  }

  useEffect(() => {
    const handler = e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault()
        doPrint()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lh])

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0D1B2A', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif' }}>

      <div style={{
        height: 48, background: '#0f2235', display: 'flex', alignItems: 'center',
        gap: 8, padding: '0 16px', flexShrink: 0, borderBottom: '1px solid #1a3a55',
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${BASE}/sdrc-logo.png`} alt="SDRC" style={{ height: 28, width: 'auto', background: 'rgba(255,255,255,0.92)', borderRadius: 4, padding: '2px 6px' }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${BASE}/labit-logo-inverted.png`} alt="Labit" style={{ height: 22, width: 'auto' }} />
        <span style={{ color: '#718096', fontSize: 11, borderLeft: '1px solid #1a3a55', paddingLeft: 8 }}>Bone Density Report · MRN {mrn}</span>
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

        <PdfBtn href={pdfHref} label="↓ PDF" bg={lh ? '#92400e' : '#0D7377'} faint={lh ? '#fef3c7' : '#fff'} />

        <button
          onClick={doPrint}
          style={{
            padding: '5px 18px', borderRadius: 5, fontSize: 12, fontWeight: 700,
            background: '#374151', color: '#e5e7eb', border: '1px solid #4a5568', cursor: 'pointer',
          }}
        >
          🖨 Print
        </button>

        <button
          onClick={() => setWaOpen(true)}
          style={{
            padding: '5px 14px', borderRadius: 5, fontSize: 12, fontWeight: 700,
            background: '#1a5c2a', color: '#4ade80',
            border: '1px solid #2d6a3f', cursor: 'pointer',
          }}
        >
          📱 WhatsApp
        </button>
      </div>

      <iframe
        key={previewUrl}
        src={previewUrl}
        style={{ flex: 1, border: 'none', width: '100%' }}
        title="Bone Density Report"
      />

      {waOpen && (
        <WaSendModal
          mrn={mrn}
          scanType="osteo"
          onClose={() => setWaOpen(false)}
        />
      )}
    </div>
  )
}
