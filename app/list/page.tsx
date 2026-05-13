/**
 * /list  — patient list page
 * Shows all patients with at least one osteo scan, newest first.
 */

import Link from 'next/link'
import { listOsteoPatients } from '@/lib/fetch-scan'

export const dynamic = 'force-dynamic'

export default async function ListPage() {
  const patients = await listOsteoPatients()

  return (
    <div style={{
      minHeight: '100vh', background: '#f0f4f8',
      fontFamily: 'system-ui, sans-serif',
    }}>

      {/* Header */}
      <div style={{
        background: '#0D7377', padding: '14px 24px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>SDRC</span>
        <span style={{ color: '#b2dfdb', fontSize: 13 }}>Bone Density Reports</span>
      </div>

      {/* Table */}
      <div style={{ maxWidth: 760, margin: '32px auto', padding: '0 16px' }}>
        <h2 style={{ fontSize: 16, color: '#374151', marginBottom: 16 }}>
          Osteo Scans — {patients.length} patient{patients.length !== 1 ? 's' : ''}
        </h2>

        {patients.length === 0 ? (
          <p style={{ color: '#6b7280' }}>No scans uploaded yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#e5eaf0', color: '#374151' }}>
                <th style={th}>Patient</th>
                <th style={th}>MRN</th>
                <th style={th}>Last Scan</th>
                <th style={th}>Scans</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p, i) => (
                <tr key={p.mrn} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                  <td style={td}>{p.name || '—'}</td>
                  <td style={{ ...td, fontFamily: 'monospace', fontSize: 12 }}>{p.mrn}</td>
                  <td style={td}>{p.last_scan_date ? p.last_scan_date.slice(0, 10) : '—'}</td>
                  <td style={{ ...td, textAlign: 'center' }}>{p.scan_count}</td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <Link
                      href={`/bmd/report/osteo/${p.mrn}`}
                      style={{
                        padding: '4px 12px', borderRadius: 4, fontSize: 12,
                        background: '#0D7377', color: '#fff',
                        textDecoration: 'none', fontWeight: 600,
                      }}
                    >
                      View Report
                    </Link>
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

const th: React.CSSProperties = {
  padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 12,
}
const td: React.CSSProperties = {
  padding: '10px 12px', borderBottom: '1px solid #e5eaf0', color: '#374151',
}
