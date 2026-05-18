'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import BASE from '@/lib/basepath'

export default function TotalbodyReportPage({ params }) {
  const router = useRouter()
  useEffect(() => {
    router.replace(`${BASE}/print/totalbody/${params.mrn}`)
  }, [])
  return null
}
