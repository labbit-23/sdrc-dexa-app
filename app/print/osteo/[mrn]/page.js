'use client'

import { useState, useEffect, use } from 'react'
import LabitPushModal from '@/components/LabitPushModal'
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

export default function PrintPreviewOsteo({ params: paramsPromise, searchParams: searchParamsPromise }) {
  const { mrn } = use(paramsPromise)
  const searchParams = use(searchParamsPromise)
  const date = searchParams?.date || ''
  const [lh, setLh] = useState(false)
  const [pushOpen, setPushOpen] = useState(false)

  const [anonymize, setAnonymize] = useState(false)

  const dateParam = date ? `&date=${date}` : ''
  const anonParam = anonymize ? '&anonymize=1' : ''
  const previewUrl = lh
    ? `${BASE}/render/osteo/${mrn}?lh=1&preview=1${dateParam}${anonParam}`
    : `${BASE}/render/osteo/${mrn}?preview=1${dateParam}${anonParam}`

  const pdfHref = lh
    ? `${BASE}/api/pdf?mrn=${mrn}&lh=1${dateParam}${anonParam}`
    : `${BASE}/api/pdf?mrn=${mrn}${dateParam}${anonParam}`

  // Never push an anonymized or letterhead-less report to Labit — that
  // pipeline is for doctor approval + patient delivery of the official
  // document, not an internal/teaching preview.
  const pushBlocked = !lh || anonymize
  const pushBlockedReason = !lh
    ? 'Enable letterhead before pushing to Labit'
    : anonymize
      ? 'Disable Anonymize before pushing to Labit'
      : ''

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
  }, [lh, anonymize, doPrint])

  return (
    <div style={darkPage}>

      <div style={darkToolbar}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${BASE}/sdrc-logo.png`} alt="SDRC" style={sdrcLogoStyle} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${BASE}/labit-logo-inverted.png`} alt="Labit" style={labitInvertedStyle} />
        <span style={toolbarLabel()}>Bone Density Report · MRN {mrn}</span>
        <div style={{ flex: 1 }} />

        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 11, color: '#cbd5e1', marginRight: '16px' }}>
          <input
            type="checkbox"
            checked={anonymize}
            onChange={e => setAnonymize(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          🔒 Anonymized
        </label>

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
          onClick={() => !pushBlocked && setPushOpen(true)}
          disabled={pushBlocked}
          title={pushBlocked ? pushBlockedReason : undefined}
          style={{
            padding: '5px 14px', borderRadius: 5, fontSize: 12, fontWeight: 700,
            background: pushBlocked ? '#243528' : '#1a5c2a',
            color:      pushBlocked ? '#5a7a63' : '#4ade80',
            border: `1px solid ${pushBlocked ? '#33443a' : '#2d6a3f'}`,
            cursor: pushBlocked ? 'not-allowed' : 'pointer',
          }}
        >
          📤 Push to Labit
        </button>
      </div>

      <iframe
        key={previewUrl}
        src={previewUrl}
        style={{ flex: 1, border: 'none', width: '100%' }}
        title="Bone Density Report"
      />

      {pushOpen && (
        <LabitPushModal
          mrn={mrn}
          scanType="osteo"
          lh={lh}
          anonymize={anonymize}
          date={date}
          onClose={() => setPushOpen(false)}
        />
      )}
    </div>
  )
}
