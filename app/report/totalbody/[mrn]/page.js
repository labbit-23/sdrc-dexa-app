'use client'

import { useState } from 'react'
import WaSendModal from '@/components/WaSendModal'

export default function TotalbodyReportPage({ params }) {
  const { mrn } = params
  const [lh,     setLh]    = useState(false)
  const [waOpen, setWaOpen] = useState(false)

  const renderUrl = lh
    ? `/render/totalbody/${mrn}?lh=1`
    : `/render/totalbody/${mrn}`

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#f0f4f8', display: 'flex', flexDirection: 'column' }}>

      {/* Toolbar */}
      <div style={{
        height: 44, background: '#fff', borderBottom: '1px solid #d0dce8',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', flexShrink: 0,
      }}>
        <div style={{ fontSize: 12, color: '#6b7280' }}>
          <span style={{ color: '#0D7377', fontWeight: 700 }}>SDRC</span>
          {' '}· Total Body Composition Report · MRN {mrn}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => setLh(l => !l)}
            style={{
              padding: '5px 14px', borderRadius: 5, fontSize: 12, fontWeight: 600,
              background: lh ? '#fff3e0' : '#f5f7fa',
              color:      lh ? '#b45309' : '#374151',
              border: `1px solid ${lh ? '#f59e0b88' : '#d0dce8'}`,
              cursor: 'pointer',
            }}
          >
            {lh ? '✕ Exit letterhead' : '📄 Letterhead preview'}
          </button>

          <a href={renderUrl} target="_blank" rel="noopener noreferrer" style={{
            padding: '5px 14px', borderRadius: 5, fontSize: 12, fontWeight: 600,
            background: '#f5f7fa', color: '#374151',
            border: '1px solid #d0dce8', textDecoration: 'none',
          }}>
            Open in new tab
          </a>

          <a href={`/api/pdf?mrn=${mrn}&type=totalbody`} style={{
            padding: '5px 14px', borderRadius: 5, fontSize: 12, fontWeight: 700,
            background: '#0D7377', color: '#fff', textDecoration: 'none',
          }}>
            ↓ PDF
          </a>
          <a href={`/api/pdf?mrn=${mrn}&type=totalbody&lh=1`} style={{
            padding: '5px 14px', borderRadius: 5, fontSize: 12, fontWeight: 700,
            background: '#92400e', color: '#fef3c7', textDecoration: 'none',
          }}>
            ↓ PDF (Letterhead)
          </a>

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
      </div>

      <iframe
        key={renderUrl}
        src={renderUrl}
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
