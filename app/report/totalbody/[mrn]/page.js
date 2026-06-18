'use client'

import { use, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function TotalbodyReportPage({ params: paramsPromise }) {
  const { mrn } = use(paramsPromise)
  const router = useRouter()
  const searchParams = useSearchParams()
  useEffect(() => {
    const query = searchParams.toString()
    const url = `/print/totalbody/${mrn}${query ? `?${query}` : ''}`
    router.replace(url)
  }, [mrn, searchParams, router])
  return null
}
