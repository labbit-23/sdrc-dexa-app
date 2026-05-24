'use client'

import BASE from '@/lib/basepath'

export default function DicomDashboard() {
  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{
        height: 44, background: '#5b21b6', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 16px', flexShrink: 0,
        borderBottom: '1px solid #7c3aed',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${BASE}/labit-logo.png`} alt="Labit" style={{ height: 26, width: 'auto', background: '#fff', borderRadius: 6, padding: '3px 8px', display: 'block' }} />
          <span style={{ fontSize: 11, color: '#ddd6fe', borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: 10 }}>DICOM Dashboard</span>
        </div>
        <a href={`${BASE}/`} style={{
          background: 'rgba(255,255,255,0.12)', color: '#ede9fe', textDecoration: 'none',
          padding: '5px 14px', borderRadius: 5, fontSize: 12, fontWeight: 600,
          border: '1px solid rgba(255,255,255,0.2)',
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
