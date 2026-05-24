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

export default function PrintPreviewTotalbody({ params }) {
  const { mrn } = params
  const [lh, setLh] = useState(false)
  const [waOpen, setWaOpen] = useState(false)
  const [meta, setMeta] = useState(null) // { name, scan_date, filename, symmetry }

  useEffect(() => {
    fetch(`${BASE}/api/tb-meta?mrn=${mrn}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setMeta(data) })
      .catch(() => {})
  }, [mrn])

  const previewUrl = lh
    ? `${BASE}/render/totalbody/${mrn}?lh=1&preview=1`
    : `${BASE}/render/totalbody/${mrn}?preview=1`

  // Include patient-friendly filename hint in the PDF URL
  const nameParam = meta?.filename ? `&dl=${encodeURIComponent(meta.filename)}` : ''
  const pdfHref = lh
    ? `${BASE}/api/pdf?mrn=${mrn}&type=totalbody&lh=1${nameParam}`
    : `${BASE}/api/pdf?mrn=${mrn}&type=totalbody${nameParam}`

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

  const symmetry = meta?.symmetry

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#4a5568', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif' }}>

      {/* Toolbar */}
      <div style={{
        height: 48, background: '#1a202c', display: 'flex', alignItems: 'center',
        gap: 8, padding: '0 16px', flexShrink: 0, borderBottom: '1px solid #2d3748',
      }}>
        {/* Labit branding */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${BASE}/labit-logo.png`} alt="Labit" style={{ height: 22, width: 'auto' }} />
        <span style={{ color: '#4a6a80', fontSize: 11, borderLeft: '1px solid #2d3748', paddingLeft: 8 }}>
          Total Body Report
          {meta?.name ? ` · ${meta.name}` : ` · MRN ${mrn}`}
          {meta?.scan_date ? ` · ${meta.scan_date}` : ''}
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

      {/* ROI symmetry warning — screen only, not part of the printed report */}
      {symmetry && (
        <div style={{
          background: symmetry.level === 'red' ? '#3b0a0a' : '#2d1a00',
          borderBottom: `2px solid ${symmetry.level === 'red' ? '#ef4444' : '#f59e0b'}`,
          padding: '7px 16px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          flexShrink: 0,
        }}>
          <span style={{
            fontSize: 13, fontWeight: 700,
            color: symmetry.level === 'red' ? '#ef4444' : '#f59e0b',
            flexShrink: 0, marginTop: 1,
          }}>
            {symmetry.level === 'red' ? '🔴' : '🟠'} ROI CHECK REQUIRED
          </span>
          <div style={{ fontSize: 11, color: '#e5c07b', lineHeight: 1.5 }}>
            <strong>Abnormal L/R asymmetry detected:</strong> {symmetry.items.join(' · ')}.{' '}
            This may reflect incorrect ROI placement rather than a true clinical finding.{' '}
            <strong>Action:</strong> Re-analyse the scan in GE Lunar, verify L/R regions are correctly positioned,
            export XPS, then re-fetch in Labit to regenerate the report.
          </div>
        </div>
      )}

      <iframe
        key={previewUrl}
        src={previewUrl}
        style={{ flex: 1, border: 'none', width: '100%' }}
        title="Total Body Composition Report"
      />

      {waOpen && (
        <WaSendModal
          mrn={mrn}
          scanType="totalbody"
          onClose={() => setWaOpen(false)}
        />
      )}
    </div>
  )
}
