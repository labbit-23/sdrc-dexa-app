'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function TotalbodyReportPage({ params }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  useEffect(() => {
    const query = searchParams.toString()
    const url = `/print/totalbody/${params.mrn}${query ? `?${query}` : ''}`
    router.replace(url)
  }, [params.mrn, searchParams, router])
  return null
}
