'use client'

import { useState, useEffect } from 'react'
import WaSendModal from '@/components/WaSendModal'
import BASE from '@/lib/basepath'
import { darkPage, darkToolbar, sdrcLogoStyle, labitInvertedStyle, toolbarLabel } from '@/lib/theme'

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

// Template definitions — name shown to staff, tpl value sent to render route
const TEMPLATES = [
  {
    tpl:       'standard',
    label:     'Classic',
    lhLabel:   '📄 Lab Stationery',
    lhHint:    'Load pre-printed lab stationery into printer',
    lhActive:  'Using lab stationery',
    lhColor:   { bg: '#fff3e0', color: '#b45309', border: '#f59e0b88' },
  },
  {
    tpl:       'studio',
    label:     'Studio',
    lhLabel:   '🌿 Brown Paper',
    lhHint:    'Load plain brown / recycled paper into printer',
    lhActive:  'Using brown paper',
    lhColor:   { bg: '#f0fdf4', color: '#166534', border: '#86efac88' },
  },
  {
    tpl:       'comprehensive',
    label:     'Comprehensive',
    lhLabel:   '📑 Plain White',
    lhHint:    'Load plain white paper into printer',
    lhActive:  'Using plain white paper',
    lhColor:   { bg: '#f0f0f0', color: '#333333', border: '#cccccc88' },
  },
]

export default function PrintPreviewTotalbody({ params }) {
  const { mrn } = params
  const [lh, setLh]       = useState(false)
  const [tpl, setTpl]     = useState('standard')
  const [waOpen, setWaOpen] = useState(false)
  const [meta, setMeta]   = useState(null) // { name, scan_date, filename, symmetry }

  const tmpl = TEMPLATES.find(t => t.tpl === tpl) ?? TEMPLATES[0]

  useEffect(() => {
    fetch(`${BASE}/api/tb-meta?mrn=${mrn}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setMeta(data) })
      .catch(() => {})
  }, [mrn])

  const tplParam   = tpl !== 'standard' ? `&tpl=${tpl}` : ''
  const previewUrl = `${BASE}/render/totalbody/${mrn}?preview=1${lh ? '&lh=1' : ''}${tplParam}`

  // Include patient-friendly filename hint in the PDF URL
  const nameParam = meta?.filename ? `&dl=${encodeURIComponent(meta.filename)}` : ''
  const pdfHref   = `${BASE}/api/pdf?mrn=${mrn}&type=totalbody${lh ? '&lh=1' : ''}${tplParam}${nameParam}`

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
  }, [lh, tpl])

  const symmetry = meta?.symmetry

  return (
    <div style={darkPage}>

      {/* Toolbar */}
      <div style={darkToolbar}>
        {/* Branding */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${BASE}/sdrc-logo.png`} alt="SDRC" style={sdrcLogoStyle} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${BASE}/labit-logo-inverted.png`} alt="Labit" style={labitInvertedStyle} />
        <span style={toolbarLabel()}>
          Total Body Report
          {meta?.name ? ` · ${meta.name}` : ` · MRN ${mrn}`}
          {meta?.scan_date ? ` · ${meta.scan_date}` : ''}
        </span>
        <div style={{ flex: 1 }} />

        {/* Template selector dropdown */}
        <select
          value={tpl}
          onChange={(e) => { setTpl(e.target.value); setLh(false) }}
          style={{
            padding: '6px 10px', borderRadius: 5, fontSize: 12, fontWeight: 600,
            background: '#2d3748', color: '#e2e8f0', border: '1px solid #4a5568',
            cursor: 'pointer', appearance: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%23718096' d='M1 1l5 5 5-5'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 6px center',
            paddingRight: '28px',
          }}
        >
          {TEMPLATES.map(t => (
            <option key={t.tpl} value={t.tpl}>
              {t.label}
            </option>
          ))}
        </select>

        {/* Letterhead toggle — label and hint change per template */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
          <button
            onClick={() => setLh(l => !l)}
            style={{
              padding: '5px 14px', borderRadius: 5, fontSize: 12, fontWeight: 600,
              background: lh ? tmpl.lhColor.bg : '#2d3748',
              color: lh ? tmpl.lhColor.color : '#a0aec0',
              border: `1px solid ${lh ? tmpl.lhColor.border : '#4a5568'}`,
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            {lh ? `✕ ${tmpl.lhActive}` : tmpl.lhLabel}
          </button>
          {!lh && (
            <span style={{ fontSize: 9, color: '#4a5568', letterSpacing: '0.05em' }}>
              {tmpl.lhHint}
            </span>
          )}
        </div>

        <PdfBtn href={pdfHref} label="↓ PDF" bg={lh ? '#2d4a1e' : '#0D7377'} faint={lh ? '#bbf7d0' : '#fff'} />

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
