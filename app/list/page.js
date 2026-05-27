import Link from 'next/link'
import BASE from '@/lib/basepath'
import { tealToolbar, labitInvertedStyle, sdrcLogoStyle, tealNavBtn } from '@/lib/theme'
import PatientTable from './PatientTable.jsx'

export default function ListPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8', fontFamily: 'system-ui, sans-serif' }}>
      <div style={tealToolbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${BASE}/sdrc-logo.png`} alt="SDRC" style={sdrcLogoStyle} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${BASE}/labit-logo-inverted.png`} alt="Labit" style={labitInvertedStyle} />
          <span style={{ color: '#b2dfdb', fontSize: 13 }}>Bone Density &amp; Body Composition Reports</span>
        </div>
        <Link href="/fetch" style={tealNavBtn}>⟳ Fetch Studies</Link>
      </div>
      <div style={{ maxWidth: 960, margin: '32px auto', padding: '0 16px' }}>
        <PatientTable />
      </div>
    </div>
  )
}
