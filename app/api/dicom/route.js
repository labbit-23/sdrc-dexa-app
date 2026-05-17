import { NextResponse } from 'next/server'

const BRIDGE = process.env.DICOM_SEND_URL ?? process.env.NEXT_PUBLIC_DICOM_SEND_URL ?? ''

export async function GET(request) {
  if (!BRIDGE) return NextResponse.json({ error: 'DICOM_SEND_URL not configured' }, { status: 503 })
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date') ?? ''
  try {
    const res = await fetch(`${BRIDGE}/studies?date=${date}`, { cache: 'no-store' })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 502 })
  }
}

export async function POST(request) {
  if (!BRIDGE) return NextResponse.json({ error: 'DICOM_SEND_URL not configured' }, { status: 503 })
  try {
    const body = await request.json()
    const res = await fetch(`${BRIDGE}/manualsend/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 502 })
  }
}
