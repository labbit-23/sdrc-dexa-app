'use client'

import BASE from '@/lib/basepath'
import { purpleToolbar, labitLightBoxStyle, toolbarLabel, glassBtn } from '@/lib/theme'

export default function DicomDashboardV2() {
  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif' }}>
      <div style={purpleToolbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <a href={`${BASE}/`} aria-label="Back to Labit workspace"><img src={`${BASE}/labit-logo.png`} alt="Labit" style={labitLightBoxStyle} /></a>
          <span style={toolbarLabel('#ddd6fe')}>DICOM Dashboard</span>
        </div>
        <a href={`${BASE}/`} style={glassBtn}>← Hub</a>
      </div>
      <iframe
        src={`${BASE}/dicom-v2.html`}
        style={{ flex: 1, border: 'none', width: '100%' }}
        title="DICOM Dashboard"
      />
    </div>
  )
}
