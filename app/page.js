import Link from 'next/link'

const cards = [
  {
    href:  '/list',
    icon:  '🦴',
    title: 'BMD / DEXA Reports',
    desc:  'View bone density & body composition reports',
    color: '#0D7377',
  },
  {
    href:  '/fetch',
    icon:  '⬇️',
    title: 'Data Collector',
    desc:  'Gather DEXA studies from scanner, upload to database',
    color: '#1565c0',
  },
  {
    href:  '/dicom',
    icon:  '📡',
    title: 'DICOM Dashboard',
    desc:  'WhatsApp triggers & radiology study status',
    color: '#6a1b9a',
  },
]

export default function HubPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{
        background: '#0D7377', padding: '14px 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img
            src="https://www.sdrc.in/assets/sdrc-logo-full.png" alt="SDRC"
            style={{ height: 36, background: 'rgba(255,255,255,0.92)', borderRadius: 4, padding: '2px 8px' }}
          />
          <span style={{ color: '#b2dfdb', fontSize: 13, letterSpacing: .5 }}>Radiology Information System</span>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: '64px auto', padding: '0 24px' }}>
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#0D7377', marginBottom: 6 }}>SDRC Radiology</div>
          <div style={{ color: '#6b7280', fontSize: 14 }}>Select a module to continue</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
          {cards.map(c => (
            <Link key={c.href} href={c.href} style={{ textDecoration: 'none' }}>
              <div style={{
                background: '#fff', borderRadius: 10, padding: '28px 24px',
                border: `1px solid #d0dce8`, cursor: 'pointer',
                borderTop: `3px solid ${c.color}`,
              }}>
                <div style={{ fontSize: 36, marginBottom: 14 }}>{c.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e', marginBottom: 6 }}>{c.title}</div>
                <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>{c.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
