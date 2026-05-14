import { listPatients } from '@/lib/fetch-scan.js'
import PatientTable from './PatientTable.jsx'

export const dynamic = 'force-dynamic'

export default async function ListPage() {
  const patients = await listPatients('any')

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: '#0D7377', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>SDRC</span>
        <span style={{ color: '#b2dfdb', fontSize: 13 }}>Bone Density &amp; Body Composition Reports</span>
      </div>
      <div style={{ maxWidth: 960, margin: '32px auto', padding: '0 16px' }}>
        <PatientTable patients={patients} />
      </div>
    </div>
  )
}
