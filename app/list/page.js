import Link from 'next/link'
import { listPatients } from '@/lib/fetch-scan.js'

export const dynamic = 'force-dynamic'

const SCAN_BADGE = {
  osteo:      { label: 'Osteo',      bg: '#e0f2fe', color: '#0369a1' },
  total_body: { label: 'Total Body', bg: '#f0fdf4', color: '#166534' },
}

function ScanBadge({ type }) {
  const b = SCAN_BADGE[type] ?? { label: type, bg: '#f3f4f6', color: '#374151' }
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 10,
      fontSize: 11, fontWeight: 600, background: b.bg, color: b.color,
      marginRight: 4,
    }}>
      {b.label}
    </span>
  )
}

function reportHref(mrn, scanTypes) {
  // Prefer osteo if patient has both; otherwise use whichever type exists
  if (scanTypes.includes('osteo')) return `/bmd/report/osteo/${mrn}`
  if (scanTypes.includes('total_body')) return `/bmd/report/totalbody/${mrn}`
  return `/bmd/report/osteo/${mrn}`
}

export default async function ListPage() {
  const patients = await listPatients('any')

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: '#0D7377', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>SDRC</span>
        <span style={{ color: '#b2dfdb', fontSize: 13 }}>Bone Density &amp; Body Composition Reports</span>
      </div>

      <div style={{ maxWidth: 860, margin: '32px auto', padding: '0 16px' }}>
        <h2 style={{ fontSize: 16, color: '#374151', marginBottom: 16 }}>
          All Patients — {patients.length} patient{patients.length !== 1 ? 's' : ''}
        </h2>

        {patients.length === 0 ? (
          <p style={{ color: '#6b7280' }}>No scans uploaded yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#e5eaf0', color: '#374151' }}>
                <th style={th}>Patient</th>
                <th style={th}>MRN</th>
                <th style={th}>Scan Types</th>
                <th style={th}>Last Scan</th>
                <th style={{ ...th, textAlign: 'center' }}>Scans</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p, i) => (
                <tr key={p.mrn} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                  <td style={td}>{p.name || '—'}</td>
                  <td style={{ ...td, fontFamily: 'monospace', fontSize: 12 }}>{p.mrn}</td>
                  <td style={td}>
                    {(p.scan_types ?? []).map(t => <ScanBadge key={t} type={t} />)}
                  </td>
                  <td style={td}>{p.last_scan_date ? p.last_scan_date.slice(0, 10) : '—'}</td>
                  <td style={{ ...td, textAlign: 'center' }}>{p.scan_count}</td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      {(p.scan_types ?? []).includes('osteo') && (
                        <Link href={`/bmd/report/osteo/${p.mrn}`} style={btnStyle('#0D7377')}>
                          Osteo
                        </Link>
                      )}
                      {(p.scan_types ?? []).includes('total_body') && (
                        <Link href={`/bmd/report/totalbody/${p.mrn}`} style={btnStyle('#166534')}>
                          Total Body
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

const th = { padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 12 }
const td = { padding: '10px 12px', borderBottom: '1px solid #e5eaf0', color: '#374151', verticalAlign: 'middle' }
const btnStyle = (bg) => ({
  padding: '4px 10px', borderRadius: 4, fontSize: 11,
  background: bg, color: '#fff',
  textDecoration: 'none', fontWeight: 600,
})
