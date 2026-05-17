'use client'

import BASE from '@/lib/basepath'

const DICOM_URL = process.env.NEXT_PUBLIC_DICOM_SEND_URL ?? 'http://100.103.168.62:8085'

export default function DicomDashboard() {
  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{
        height: 44, background: '#6a1b9a', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 16px', flexShrink: 0,
      }}>
        <div style={{ fontSize: 12, color: '#e9d5ff' }}>
          <span style={{ color: '#fff', fontWeight: 700 }}>SDRC</span>
          {' '}· DICOM Dashboard
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
        src={DICOM_URL}
        style={{ flex: 1, border: 'none', width: '100%' }}
        title="DICOM Dashboard"
      />
    </div>
  )
}
