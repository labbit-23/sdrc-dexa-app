'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function TotalbodyReportPage({ params }) {
  const router = useRouter()
  useEffect(() => {
    router.replace(`/print/totalbody/${params.mrn}`)
  }, [])
  return null
}
