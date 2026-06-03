/** @file Shared utility functions for report templates. */

export function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function tbFmtDate(d) {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${day} ${months[parseInt(m) - 1]} ${y}`
}

export function kg(g) {
  return (g / 1000).toFixed(1)
}

export function kg2(g) {
  return (g / 1000).toFixed(2)
}

export function pct(v) {
  return Number(v).toFixed(1)
}
