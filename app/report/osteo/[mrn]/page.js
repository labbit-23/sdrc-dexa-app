'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import BASE from '@/lib/basepath'

export default function OsteoReportPage({ params }) {
  const router = useRouter()
  useEffect(() => {
    router.replace(`${BASE}/print/osteo/${params.mrn}`)
  }, [])
  return null
}
