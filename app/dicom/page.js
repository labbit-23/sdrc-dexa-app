'use client'

import BASE from '@/lib/basepath'


export default function DicomDashboard() {
  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{
        height: 44, background: '#6a1b9a', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 16px', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${BASE}/sdrc-logo.png`} alt="SDRC" style={{ height: 28, width: 'auto', background: 'rgba(255,255,255,0.92)', borderRadius: 4, padding: '2px 6px' }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${BASE}/labit-logo-inverted.png`} alt="Labit" style={{ height: 20, width: 'auto' }} />
          <span style={{ fontSize: 11, color: '#e9d5ff', borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: 10 }}>DICOM Dashboard</span>
        </div>
        <a href={`${BASE}/`} style={{
          background: 'rgba(255,255,255,0.15)', color: '#fff', textDecoration: 'none',
          padding: '5px 14px', borderRadius: 5, fontSize: 12, fontWeight: 600,
          border: '1px solid rgba(255,255,255,0.25)',
        }}>
          ← Hub
        </a>
      </div>
      <iframe
        src={`${BASE}/dicom.html`}
        style={{ flex: 1, border: 'none', width: '100%' }}
        title="DICOM Dashboard"
      />
    </div>
  )
}
