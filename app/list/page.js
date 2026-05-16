import { listPatients } from '@/lib/fetch-scan.js'
import Link from 'next/link'
import PatientTable from './PatientTable.jsx'

export const dynamic = 'force-dynamic'

export default async function ListPage() {
  const patients = await listPatients('any')

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: '#0D7377', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img src="https://www.sdrc.in/assets/sdrc-logo-full.png" alt="SDRC" style={{ height: 32, width: 'auto', borderRadius: 4, background: 'rgba(255,255,255,0.92)', padding: '2px 6px' }} />
          <span style={{ color: '#b2dfdb', fontSize: 13 }}>Bone Density &amp; Body Composition Reports</span>
        </div>
        <Link href="/bmd/fetch" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', textDecoration: 'none', padding: '6px 14px', borderRadius: 5, fontSize: 12, fontWeight: 600, border: '1px solid rgba(255,255,255,0.25)' }}>
          ⟳ Fetch Studies
        </Link>
      </div>
      <div style={{ maxWidth: 960, margin: '32px auto', padding: '0 16px' }}>
        <PatientTable patients={patients} />
      </div>
    </div>
  )
}
