'use client'

import { useState, useEffect } from 'react'
import WaSendModal from '@/components/WaSendModal'
import BASE from '@/lib/basepath'
import { C, darkPage, darkToolbar, sdrcLogoStyle, labitInvertedStyle, toolbarLabel } from '@/lib/theme'

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

export default function PrintPreviewOsteo({ params, searchParams }) {
  const { mrn } = params
  const date = searchParams?.date || ''
  const [lh, setLh] = useState(false)
  const [waOpen, setWaOpen] = useState(false)

  const dateParam = date ? `&date=${date}` : ''
  const previewUrl = lh
    ? `${BASE}/render/osteo/${mrn}?lh=1&preview=1${dateParam}`
    : `${BASE}/render/osteo/${mrn}?preview=1${dateParam}`

  const pdfHref = lh
    ? `${BASE}/api/pdf?mrn=${mrn}&lh=1${dateParam}`
    : `${BASE}/api/pdf?mrn=${mrn}${dateParam}`

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
    <div style={darkPage}>

      <div style={darkToolbar}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${BASE}/sdrc-logo.png`} alt="SDRC" style={sdrcLogoStyle} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${BASE}/labit-logo-inverted.png`} alt="Labit" style={labitInvertedStyle} />
        <span style={toolbarLabel()}>Bone Density Report · MRN {mrn}</span>
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
