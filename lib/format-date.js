// Format ISO date to IST with time
export function formatScanDateTime(iso) {
  if (!iso) return '—'
  try {
    const dt = new Date(iso)
    return dt.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Kolkata'
    })
  } catch {
    return iso
  }
}

// Format ISO date to IST date only (DD MMM YYYY)
export function formatScanDate(iso) {
  if (!iso) return '—'
  try {
    const dt = new Date(iso)
    return dt.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Kolkata'
    })
  } catch {
    return iso
  }
}
