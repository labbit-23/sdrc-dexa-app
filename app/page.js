import Link from 'next/link'
import BASE from '@/lib/basepath'
import { C, tealToolbar, labitLightStyle, tealNavBtn } from '@/lib/theme'

const cards = [
  { href: '/list',  icon: '🦴',  title: 'BMD / DEXA Reports',  desc: 'View bone density & body composition reports', color: C.teal },
  { href: '/fetch', icon: null,  title: 'Data Collector',       desc: 'Gather DEXA studies from scanner, upload to database', color: C.blue },
  { href: '/archive-linker', icon: '🔗', title: 'Archive Linker', desc: 'Link historical scans to patients for trend analysis', color: '#8b5cf6' },
  { href: '/dicom', icon: '📡', title: 'DICOM Dashboard',      desc: 'WhatsApp triggers & radiology study status', color: C.purple },
  { href: '#', icon: '💓',  title: 'ECG Management',       desc: 'Coming soon', color: '#ef4444', disabled: true },
]

export default function HubPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8', fontFamily: 'system-ui, sans-serif' }}>
      <div style={tealToolbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${BASE}/labit-logo.png`} alt="Labit" style={labitLightStyle} />
          <span style={{ color: '#b2dfdb', fontSize: 13, letterSpacing: 0.5 }}>Radiology Information System</span>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: '64px auto', padding: '0 24px' }}>
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: C.teal, marginBottom: 6 }}>SDRC Radiology</div>
          <div style={{ color: C.textDim, fontSize: 14 }}>Select a module to continue</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
          {cards.map(c => {
            const cardElement = (
              <div style={{
                background: c.disabled ? '#f3f4f6' : C.white,
                borderRadius: 10, padding: '28px 24px',
                border: `1px solid ${c.disabled ? '#e5e7eb' : '#d0dce8'}`,
                cursor: c.disabled ? 'not-allowed' : 'pointer',
                borderTop: `3px solid ${c.color}`,
                opacity: c.disabled ? 0.6 : 1,
              }}>
                <div style={{ fontSize: 36, marginBottom: 14 }}>
                  {c.icon
                    ? c.icon
                    : <img src={`${BASE}/dexa-scanner.png`} alt="DEXA Scanner" style={{ height: 40, display: 'block' }} />
                  }
                </div>
                <div style={{ fontWeight: 700, fontSize: 15, color: c.disabled ? '#9ca3af' : '#1a1a2e', marginBottom: 6 }}>{c.title}</div>
                <div style={{ fontSize: 13, color: c.disabled ? '#d1d5db' : C.textDim, lineHeight: 1.6 }}>{c.desc}</div>
              </div>
            )

            return c.disabled ? (
              <div key={c.href} style={{ textDecoration: 'none' }}>
                {cardElement}
              </div>
            ) : (
              <Link key={c.href} href={c.href} style={{ textDecoration: 'none' }}>
                {cardElement}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
