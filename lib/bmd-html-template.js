/** @file Total body DEXA HTML report template — shared with Labit BMD module. */
import { readFileSync } from 'fs'
import { join }        from 'path'
import { densitometryChart } from './densitometry-chart.js'
import { esc, tbFmtDate } from './report-utils.js'
import { summaryItems, fatLossTargets, scanDelta, muscleContext, boneGuide, almiBadge, boneClassBadge, centileText } from './report-components.js'

const _BASE = process.env.NEXT_PUBLIC_BASEPATH || ''
const _labitBadge = `<div style="display:flex;flex-direction:column;align-items:center;gap:3px;flex-shrink:0;margin-left:12px"><img src="${_BASE}/labit-logo.png" height="30" style="display:block;object-fit:contain"><a href="https://www.labit.online" target="_blank" style="font-size:6.5px;font-weight:700;color:#0D7377;letter-spacing:.4px;text-decoration:none">www.labit.online</a></div>`

function _loadBmNorm() {
  const candidates = [
    join(process.cwd(), 'lib/bmd-norm.csv'),
    join(process.cwd(), '..', 'lib/bmd-norm.csv'),
    '/opt/sdrc/sdrc-dexa-app/lib/bmd-norm.csv',
  ]
  let csv = null
  for (const p of candidates) {
    try { csv = readFileSync(p, 'utf8'); break } catch { /* try next */ }
  }
  if (!csv) {
    console.error('[bmd-norm] Could not find bmd-norm.csv. Tried:', candidates)
    return {}
  }
  const lines = csv.split('\n').filter(l => l.trim() && !l.startsWith('#'))
  const hdr   = lines[0].split(',').map(s => s.trim())
  const ageCols = hdr.slice(4).map((h, i) => [parseInt(h.replace('age', '')), i + 4])
  const norm  = {}
  for (const line of lines.slice(1)) {
    const cols = line.split(',').map(s => s.trim())
    const [site, gender, peak, sd] = cols
    if (!site || !gender) continue
    if (!norm[site]) norm[site] = {}
    norm[site][gender] = {
      peak:  Number(peak),
      sd:    Number(sd),
      curve: ageCols.filter(([, i]) => cols[i] !== '').map(([age, i]) => [age, Number(cols[i])]),
    }
  }
  return norm
}
const _bmNorm = _loadBmNorm()

/* ── palette ─────────────────────────────────────────────────────────────── */
const C = {
  teal: '#0D7377', tealLt: '#14a8ae',
  pink: '#E91E8C', cyan: '#00BCD4', bone: '#B0BEC5',
  green: '#2E7D32', greenLt: '#4CAF50',
  amber: '#E65100', red: '#B71C1C',
}


const darkPal = {
  bg: '#0D1B2A', card: '#0f2235', border: '#1a3a55',
  text: '#FFFFFF', gray: '#9E9E9E', grayLt: '#CFD8DC',
  cardHighlight: '#0a1f30',
  statusGood: '#0a2a0a', statusWarn: '#2a1a00', statusAlert: '#2a0a0a', statusInfo: '#0a1a2a',
}

const lightPal = {
  bg: '#ffffff', card: '#f5f7fa', border: '#d0dce8',
  text: '#1a1a2e', gray: '#6b7280', grayLt: '#374151',
  cardHighlight: '#e8f4fb',
  statusGood: '#e8f5e8', statusWarn: '#fff3e0', statusAlert: '#fce8e8', statusInfo: '#e3f2fd',
}

/* Pages use height:297mm + flex-column so content is distributed to fill the full A4 sheet. */
const darkCss = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:${darkPal.bg};font-family:'Inter',sans-serif;color:${darkPal.text};
       -webkit-print-color-adjust:exact;print-color-adjust:exact}
  .page{width:210mm;height:297mm;padding:10mm 13mm;margin:0 auto;
        background:${darkPal.bg};page-break-after:always;position:relative;
        display:flex;flex-direction:column;overflow:hidden}
  .page:last-child{page-break-after:auto}
  @page{size:A4;margin:0}
  .row{display:flex;gap:14px}
  .col{display:flex;flex-direction:column}
  .card{background:${darkPal.card};border:1px solid ${darkPal.border};border-radius:8px;padding:16px}
  .lbl{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.8px;color:${darkPal.gray}}
  .sec{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${C.tealLt};margin-bottom:10px}
  .tag{display:inline-block;padding:4px 12px;border-radius:3px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
`

const lightCss = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#ffffff;font-family:'Inter',sans-serif;color:#1a1a2e;
       -webkit-print-color-adjust:exact;print-color-adjust:exact}
  .page{width:210mm;height:297mm;padding:10mm 13mm;margin:0 auto;
        background:#ffffff;page-break-after:always;position:relative;
        display:flex;flex-direction:column;overflow:hidden}
  .page:last-child{page-break-after:auto}
  @page{size:A4;margin:0}
  .row{display:flex;gap:14px}
  .col{display:flex;flex-direction:column}
  .card{background:#f5f7fa;border:1px solid #d0dce8;border-radius:8px;padding:16px}
  .lbl{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.8px;color:#6b7280}
  .sec{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#0D7377;margin-bottom:10px}
  .tag{display:inline-block;padding:4px 12px;border-radius:3px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
`

/* Letterhead: identical to light theme — logo hidden inline via visibility:hidden on the img. */
const letterheadCss = lightCss

/* ── Trends page helpers ─────────────────────────────────────────────────── */
function tbSparkline(values, W, H, color) {
  const pts = values.filter(v => v != null)
  if (pts.length < 2) return ''
  const min = Math.min(...pts), max = Math.max(...pts)
  const range = max - min || 0.001
  const idxs = values.map((v, i) => ({ v, i })).filter(x => x.v != null)
  const xs = idxs.map(x => ((x.i / (values.length - 1)) * (W - 8) + 4).toFixed(1))
  const ys = idxs.map(x => (H - 4 - ((x.v - min) / range) * (H - 12)).toFixed(1))
  const pts2 = xs.map((x, i) => `${x},${ys[i]}`).join(' ')
  const dots = xs.map((x, i) => `<circle cx="${x}" cy="${ys[i]}" r="3" fill="${color}"/>`).join('')
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="display:block">
    <polyline points="${pts2}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round"/>
    ${dots}
  </svg>`
}


function pageTrends(data, history, P, lh, pageNum, total) {
  const scans = [...history, data].slice(-5)
  const n = scans.length
  const { patient: pt } = data

  // ── Metric rows ──────────────────────────────────────────────────────────
  // Each row: label, extract fn (returns number|null), unit, goodDir ('up'|'down')
  const metricDefs = [
    { label: 'Body Fat %',    get: sc => sc.composition?.fat_pct ?? null,                   unit: '%',      good: 'down' },
    { label: 'Fat Mass',      get: sc => sc.composition?.fat_g   != null ? +(sc.composition.fat_g/1000).toFixed(1)  : null, unit: 'kg', good: 'down' },
    { label: 'Lean Mass',     get: sc => sc.composition?.lean_g  != null ? +(sc.composition.lean_g/1000).toFixed(1) : null, unit: 'kg', good: 'up'   },
    { label: 'ALMI',          get: sc => sc.computed?.almi       ?? null,                   unit: 'kg/m²',  good: 'up'   },
    { label: 'FMI',           get: sc => sc.computed?.fmi        ?? null,                   unit: 'kg/m²',  good: 'down' },
    { label: 'LMI',           get: sc => sc.computed?.lmi        ?? null,                   unit: 'kg/m²',  good: 'up'   },
    { label: 'RMR',           get: sc => sc.computed?.rmr_kcal   ?? null,                   unit: 'kcal',   good: 'up'   },
    { label: 'A/G Ratio',     get: sc => sc.composition?.ag_ratio ?? null,                  unit: '',       good: 'down' },
    { label: 'Bone Mineral',  get: sc => sc.composition?.bmc_g   != null ? +(sc.composition.bmc_g/1000).toFixed(2) : null, unit: 'kg', good: 'up' },
  ]

  const dateHeaders = scans.map((sc, i) => {
    const isCurrent = i === n - 1
    return `<th style="padding:5px 8px;font-size:9px;font-weight:${isCurrent ? 700 : 500};color:${isCurrent ? C.tealLt : P.gray};text-align:right;${isCurrent ? `border-left:2px solid ${C.tealLt};` : ''}border-bottom:2px solid ${P.border}">${tbFmtDate(sc.patient?.scan_date)}${isCurrent ? ' ★' : ''}</th>`
  }).join('')

  const metricRows = metricDefs.map(({ label, get, unit, good }) => {
    const vals = scans.map(sc => get(sc))
    if (vals.every(v => v == null)) return ''
    const cells = vals.map((v, i) => {
      const isCurrent = i === n - 1
      const prev = i > 0 ? vals[i - 1] : null
      let deltaHtml = ''
      if (v != null && prev != null) {
        const delta = v - prev
        const beneficial = good === 'down' ? delta < 0 : delta > 0
        const color = beneficial ? C.greenLt : delta === 0 ? P.gray : C.red
        const arrow = delta > 0 ? '↑' : delta < 0 ? '↓' : '→'
        const sign = delta > 0 ? '+' : ''
        deltaHtml = `<div style="font-size:8px;color:${color};font-weight:600">${sign}${Math.abs(delta) < 1 ? delta.toFixed(2) : delta.toFixed(1)} ${arrow}</div>`
      }
      const display = v != null ? `${typeof v === 'number' && !Number.isInteger(v) ? v : v}${unit ? ' ' + unit : ''}` : '—'
      return `<td style="padding:5px 8px;text-align:right;vertical-align:top;${isCurrent ? `border-left:2px solid ${C.tealLt};` : ''}border-bottom:1px solid ${P.border}">
        <div style="font-size:11px;font-weight:700;color:${P.text};font-family:monospace">${display}</div>
        ${deltaHtml}
      </td>`
    }).join('')
    return `<tr>
      <td style="padding:5px 8px;font-size:11px;font-weight:600;color:${P.grayLt};border-bottom:1px solid ${P.border};white-space:nowrap">${label}</td>
      ${cells}
    </tr>`
  }).filter(Boolean).join('')

  // ── Lean mass preservation callout (GLP-1 concern) ───────────────────────
  let leanCallout = ''
  for (let i = 1; i < scans.length; i++) {
    const prev = scans[i - 1], curr = scans[i]
    const wtPrev  = prev.composition?.lean_g != null && prev.composition?.fat_g != null
      ? (prev.composition.lean_g + prev.composition.fat_g) : null
    const wtCurr  = curr.composition?.lean_g != null && curr.composition?.fat_g != null
      ? (curr.composition.lean_g + curr.composition.fat_g) : null
    if (wtPrev == null || wtCurr == null) continue
    const totalLoss = wtPrev - wtCurr
    if (totalLoss <= 0) continue
    const leanLoss = (prev.composition.lean_g - curr.composition.lean_g)
    const leanPct  = Math.round((leanLoss / totalLoss) * 100)
    if (leanPct > 25) {
      leanCallout = `
      <div style="background:${P.statusWarn};border:1px solid ${C.amber}40;border-left:4px solid ${C.amber};border-radius:6px;padding:10px 14px;margin-top:10px;flex-shrink:0">
        <div style="font-size:11px;font-weight:700;color:${C.amber};margin-bottom:4px">⚠ Lean Mass Preservation Check</div>
        <div style="font-size:10px;color:${P.grayLt};line-height:1.65">
          Lean mass comprised <strong>${leanPct}%</strong> of total weight lost between
          ${tbFmtDate(prev.patient?.scan_date)} and ${tbFmtDate(curr.patient?.scan_date)}.
          Preserving muscle during weight loss is critical for metabolic health and long-term weight management.
          Consider resistance training, adequate protein intake (&gt;1.2 g/kg body weight), and discuss findings with your clinician.
          DEXA monitoring every 3–6 months is recommended during active weight loss programmes.
        </div>
      </div>`
      break
    }
  }

  // ── Sparklines ───────────────────────────────────────────────────────────
  const fatVals  = scans.map(sc => sc.composition?.fat_pct ?? null)
  const leanVals = scans.map(sc => sc.composition?.lean_g != null ? +(sc.composition.lean_g/1000).toFixed(1) : null)
  const fatSpark  = tbSparkline(fatVals,  180, 44, C.pink)
  const leanSpark = tbSparkline(leanVals, 180, 44, C.cyan)

  const sparkSection = (fatSpark || leanSpark) ? `
  <div class="card" style="flex-shrink:0;margin-top:10px">
    <div class="sec">Trend Sparklines</div>
    <div style="display:flex;gap:24px">
      ${fatSpark  ? `<div style="flex:1"><div style="font-size:9px;font-weight:600;color:${C.pink};margin-bottom:3px">Body Fat %</div>${fatSpark}</div>`   : ''}
      ${leanSpark ? `<div style="flex:1"><div style="font-size:9px;font-weight:600;color:${C.cyan};margin-bottom:3px">Lean Mass (kg)</div>${leanSpark}</div>` : ''}
    </div>
  </div>` : ''

  // ── Footer ───────────────────────────────────────────────────────────────
  const foot = `
  <div class="page-footer" style="flex-shrink:0;margin-top:10px;border-top:1px solid ${P.border};padding-top:7px;font-size:9px;color:${P.gray};line-height:1.7;display:flex;align-items:center;gap:0">
    <div style="flex:1">Scanner ${esc(pt.scanner)} · ${esc(pt.software)} · Showing up to 5 most recent scans ·
    Δ arrows: <span style="color:${C.greenLt}">green = beneficial change</span> · <span style="color:${C.red}">red = adverse change</span> · For clinical use only.</div>
    ${_labitBadge}
  </div>`

  // ── Scan delta banner (since last scan) ─────────────────────────────────
  const delta = data.scan_delta ?? null
  const deltaBanner = delta ? (() => {
    const fmt = (v, unit, goodDir) => {
      if (v == null) return null
      const sign = v > 0 ? '+' : ''
      const beneficial = goodDir === 'down' ? v < 0 : v > 0
      const color = v === 0 ? P.gray : beneficial ? C.greenLt : C.red
      const arrow = v > 0 ? '↑' : v < 0 ? '↓' : '→'
      return `<div ${s('display:flex;flex-direction:column;align-items:center;gap:2px')}>
        <div ${s(`font-size:18px;font-weight:800;color:${color};line-height:1;font-family:monospace`)}>${sign}${v}${unit}</div>
        <div ${s(`font-size:16px;color:${color};line-height:1`)}>${arrow}</div>
      </div>`
    }
    const cells = [
      { label: 'Body Fat', html: fmt(delta.fat_pct_change, '%',  'down') },
      { label: 'Fat Mass',  html: fmt(delta.fat_kg_change,  ' kg', 'down') },
      { label: 'Lean Mass', html: fmt(delta.lean_kg_change, ' kg', 'up')  },
      { label: 'Bone',      html: fmt(delta.bmc_kg_change,  ' kg', 'up')  },
    ].filter(c => c.html)
    return `
    <div ${s(`background:${P.card};border:1px solid ${P.border};border-radius:8px;padding:12px 16px;flex-shrink:0`)}>
      <div ${s(`font-size:9px;font-weight:700;color:${P.gray};text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px`)}>Since last scan · ${esc(delta.scan_date_prev)}</div>
      <div ${s('display:flex;gap:24px;justify-content:space-around')}>
        ${cells.map(c => `<div ${s('display:flex;flex-direction:column;align-items:center;gap:4px')}>
          ${c.html}
          <div ${s(`font-size:8px;color:${P.gray};font-weight:600`)}>${c.label}</div>
        </div>`).join('')}
      </div>
    </div>`
  })() : ''

  return `
<div class="page">
  ${header(pt, 'DEXA — Body Composition Trends', P, lh, pageNum, total)}
  <div style="flex:1;display:flex;flex-direction:column;gap:10px;min-height:0">
    ${deltaBanner}
    <div class="card" style="flex-shrink:0">
      <div class="sec">Metrics Over Time</div>
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr>
            <th style="padding:5px 8px;font-size:9px;font-weight:700;color:${P.gray};text-align:left;border-bottom:2px solid ${P.border}">Metric</th>
            ${dateHeaders}
          </tr>
        </thead>
        <tbody>${metricRows}</tbody>
      </table>
    </div>
    ${sparkSection}
    ${leanCallout}
  </div>
  ${foot}
</div>`
}

export function generateReportHtml(data, { dark = true, letterhead = false, fatMode = false, history = [], preview = false } = {}) {
  const css = letterhead ? letterheadCss : dark ? darkCss : lightCss
  const P   = dark && !letterhead ? darkPal : lightPal
  const baseFront = fatMode ? [page2, page1, page3, page4] : [page1, page2, page3, page4]
  const trendsFn  = history.length > 0
    ? [(d, P, lh, n, t) => pageTrends(d, history, P, lh, n, t)]
    : []
  const pages = [...baseFront, ...trendsFn, page5]
  const total = pages.length
  const pagesHtml = pages.map((fn, i) => fn(data, P, letterhead, i + 1, total)).join('')

  if (preview) {
    return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<title>Print Preview — ${esc(data.patient.name)}</title>
<style>
${css}
body{background:#6b7280!important;padding:20px;display:flex;flex-direction:column;align-items:center;gap:0}
.page{transform:scale(0.75);transform-origin:top center;margin-bottom:calc(-297mm * 0.25 + 24px);box-shadow:0 4px 20px rgba(0,0,0,.4);flex-shrink:0}
@media print{
  body{background:white!important;display:block;padding:0;gap:0}
  .page{height:297mm!important;overflow:hidden!important;transform:none!important;margin:0!important;box-shadow:none!important;page-break-after:always;display:flex}
  .page:last-child{page-break-after:auto}
}
</style></head><body>
${pagesHtml}
</body></html>`
  }

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<title>DEXA Report — ${esc(data.patient.name)}</title>
<style>${css}</style></head><body>
${pagesHtml}
</body></html>`
}

/* ── helpers ─────────────────────────────────────────────────────────────── */
function s(style) { return `style="${style}"` }

function header(pt, title, P, lh = false, pageNum = 0, totalPages = 0, subtitle = '') {
  const eth = pt.ethnicity || 'White'
  const pgTag = pageNum > 0
    ? `<span ${s(`font-size:10px;font-weight:500;color:${P.gray}`)}>Page ${pageNum} / ${totalPages}</span>`
    : ''

  const logoRow = `
    <div class="page-logo-row" ${s(`display:flex;justify-content:space-between;align-items:center;padding-bottom:8px;margin-bottom:8px${lh ? '' : `;border-bottom:1px solid ${P.border}`}`)}>
      <img src="https://www.sdrc.in/assets/sdrc-logo-full.png" alt="SDRC Diagnostics"
           ${s(`height:48px;width:auto;border-radius:4px;padding:${P === darkPal ? '2px 4px' : '0'};background:${P === darkPal ? 'rgba(255,255,255,0.92)' : 'transparent'};${lh ? 'visibility:hidden' : ''}`)}>
      <div ${s(`text-align:right;font-size:10px;color:${P.gray};line-height:1.7`)}>
        <div ${s(`color:${P.text};font-weight:700;font-size:11px`)}>${esc(pt.name)}</div>
        <div>${esc(pt.gender)} · ${pt.age}y · ${pt.height_cm} cm · ${pt.weight_entered_kg} kg</div>
        <div>ID: ${esc(pt.id)} · Scan: ${esc(pt.scan_date)} ${esc(pt.scan_time)}</div>
      </div>
    </div>`

  const patientCompact = `
    <div ${s('display:flex;justify-content:space-between;align-items:baseline')}>
      <div ${s(`font-size:20px;font-weight:600;color:${P.text};letter-spacing:.3px`)}>${esc(title)}</div>
      ${pgTag}
    </div>`

  return `
  <div ${s('margin-bottom:12px;flex-shrink:0')}>
    ${logoRow}
    <div ${s(`${lh ? '' : `border-bottom:2px solid ${C.teal};`}padding-bottom:6px`)}>
      ${patientCompact}
      ${subtitle ? `<div ${s(`font-size:8.5px;color:${P.gray};font-style:italic;margin-top:1px`)}>${subtitle}</div>` : ''}
    </div>
  </div>`
}

function compBar(fat, lean, bone, P) {
  const t  = fat + lean + bone
  const fp = (fat  / t * 100).toFixed(1)
  const lp = (lean / t * 100).toFixed(1)
  const bp = (bone / t * 100).toFixed(1)
  return `
  <div>
    <div ${s('display:flex;height:28px;border-radius:5px;overflow:hidden;margin-bottom:8px')}>
      <div ${s(`width:${fp}%;background:${C.pink}`)}></div>
      <div ${s(`width:${lp}%;background:${C.cyan}`)}></div>
      <div ${s(`width:${bp}%;background:${C.bone}`)}></div>
    </div>
    <div ${s(`display:flex;font-size:10px;color:${P.gray};justify-content:space-between`)}>
      <span><span ${s(`color:${C.pink}`)}>■</span> Fat ${fp}% (${(fat/1000).toFixed(1)} kg)</span>
      <span><span ${s(`color:${C.cyan}`)}>■</span> Lean ${lp}% (${(lean/1000).toFixed(1)} kg)</span>
      <span><span ${s(`color:${C.bone}`)}>■</span> BMC ${bp}% (${(bone/1000).toFixed(2)} kg)</span>
    </div>
  </div>`
}

function mrow(lbl, val, note, color, P) {
  return `
  <div ${s(`display:flex;justify-content:space-between;align-items:baseline;padding:7px 0;border-bottom:1px solid ${P.border}`)}>
    <div ${s(`font-size:11px;color:${P.gray}`)}>${esc(lbl)}</div>
    <div ${s('text-align:right')}>
      <div ${s(`font-size:14px;font-weight:700;color:${color}`)}>${esc(val)}</div>
      ${note ? `<div ${s(`font-size:9.5px;color:${P.gray}`)}>${esc(note)}</div>` : ''}
    </div>
  </div>`
}

function metricBox(lbl, val, unit, color, P, sub) {
  return `
  <div class="card" ${s('flex:1;min-width:0;display:flex;flex-direction:column')}>
    <div class="lbl">${esc(lbl)}</div>
    <div ${s(`font-size:28px;font-weight:800;color:${color};line-height:1;margin-top:14px`)}>${esc(val)}</div>
    ${unit ? `<div ${s(`font-size:10px;color:${P.gray};margin-top:4px`)}>${esc(unit)}</div>` : ''}
    ${sub ? `<div ${s(`font-size:9px;color:${P.gray};margin-top:2px`)}>${esc(sub)}</div>` : ''}
  </div>`
}

function regionBarRow(name, d, P) {
  return `
  <div ${s('display:flex;align-items:center;gap:10px;margin-bottom:12px')}>
    <div ${s(`width:44px;font-size:11px;font-weight:600;color:${P.grayLt}`)}>${esc(name)}</div>
    <div ${s('flex:1;display:flex;height:22px;border-radius:4px;overflow:hidden')}>
      <div ${s(`width:${d.fat_pct}%;background:${C.pink}`)}></div>
      <div ${s(`width:${d.lean_pct}%;background:${C.cyan}`)}></div>
      <div ${s(`width:${d.bone_pct}%;background:${C.bone}`)}></div>
    </div>
    <div ${s(`font-size:10px;color:${P.gray};min-width:190px;text-align:right`)}>
      <span ${s(`color:${C.pink}`)}>F ${d.fat_pct}%</span> ·
      <span ${s(`color:${C.cyan}`)}>L ${d.lean_pct}%</span> ·
      <span ${s(`color:${C.bone}`)}>BMC ${d.bone_pct}%</span>
      (${(d.total_g / 1000).toFixed(2)} kg)
    </div>
  </div>`
}

function regionDetail(d, P) {
  const rows = [
    { lbl: 'Fat',  val: d.fat_g,  pct: d.fat_pct,  c: C.pink },
    { lbl: 'Lean', val: d.lean_g, pct: d.lean_pct, c: C.cyan },
    { lbl: 'BMC',  val: d.bone_g, pct: d.bone_pct, c: C.bone },
  ]
  return rows.map(r => `
  <div ${s('display:flex;align-items:center;gap:8px;margin-bottom:8px')}>
    <div ${s(`width:36px;font-size:11px;color:${r.c};font-weight:600`)}>${r.lbl}</div>
    <div ${s(`flex:1;height:14px;background:${P.border};border-radius:3px;overflow:hidden`)}>
      <div ${s(`width:${r.pct}%;height:100%;background:${r.c}`)}></div>
    </div>
    <div ${s(`width:90px;font-size:10px;color:${P.gray};text-align:right`)}>
      ${r.pct}% · ${(r.val / 1000).toFixed(2)} kg
    </div>
  </div>`).join('')
}

function fmiScale(fmi, gender, P) {
  const male = gender.toLowerCase().startsWith('m')
  const max  = male ? 15 : 18
  const pct  = Math.min(Math.max(fmi / max * 100, 1), 99)
  const zones = male
    ? [{ w: 40,   lbl: 'Normal &lt;6', c: C.green },
       { w: 20,   lbl: 'Elevated 6–9', c: C.amber },
       { w: 40,   lbl: 'Obese &gt;9',  c: C.red   }]
    : [{ w: 50,   lbl: 'Normal &lt;9', c: C.green },
       { w: 22.2, lbl: 'Elevated 9–13',c: C.amber },
       { w: 27.8, lbl: 'Obese &gt;13', c: C.red   }]
  const col = fmi < (male ? 6 : 9) ? C.greenLt : fmi < (male ? 9 : 13) ? C.amber : C.red
  return `
  <div>
    <div ${s('position:relative;margin-bottom:8px')}>
      <div ${s('display:flex;height:22px;border-radius:5px;overflow:hidden')}>
        ${zones.map(z => `<div ${s(`width:${z.w}%;background:${z.c};opacity:.45`)}></div>`).join('')}
      </div>
      <div ${s(`position:absolute;left:${pct}%;top:-4px;bottom:-4px;width:4px;background:${P.text};border-radius:2px;transform:translateX(-50%)`)}></div>
    </div>
    <div ${s(`display:flex;justify-content:space-between;font-size:9px;color:${P.gray};margin-bottom:8px`)}>
      ${zones.map(z => `<span>${z.lbl}</span>`).join('')}
    </div>
    <div ${s(`font-size:15px;font-weight:700;color:${col}`)}>
      Your FMI: ${fmi} kg/m²
      <span ${s(`font-size:10px;font-weight:400;color:${P.gray};margin-left:8px`)}>(fat kg ÷ height m²)</span>
    </div>
  </div>`
}

function symmetryCard(bilateral, P) {
  if (!bilateral) return ''
  const { arms, legs, trunk, total } = bilateral
  if (!arms) return ''

  // Asymmetry thresholds (% relative to larger side)
  // Arms: dominant naturally 5-10% larger; Legs/Trunk/Total: should be near-symmetric
  function asymColor(pct, region) {
    const [lo, hi] = region === 'arms' ? [15, 25] : [10, 15]
    return pct >= hi ? C.red : pct >= lo ? C.amber : C.greenLt
  }

  function kg(g) { return (g / 1000).toFixed(2) }

  // Split bar: shows L% vs R% fill
  function miniBar(left_g, right_g, color) {
    const tot = left_g + right_g
    if (!tot) return ''
    const lp = (left_g / tot * 100).toFixed(1)
    return `<div ${s('height:8px;display:flex;border-radius:2px;overflow:hidden;background:#e5e7eb;flex:1')}>
      <div ${s(`width:${lp}%;background:${color};opacity:.8`)}></div>
    </div>`
  }

  // One row per region in the table
  function row(label, side, region, isLast = false) {
    if (!side) return ''
    const lc = asymColor(side.lean_asym, region)
    const fc = asymColor(side.fat_asym,  region)
    const bc = asymColor(side.bone_asym, region)
    const border = isLast ? '' : `border-bottom:1px solid ${P.border};`
    const bg = region === 'total' ? `background:${P.border}22;` : ''
    const fw = region === 'total' ? 'font-weight:700;' : ''
    const td = (v, clr) => `<td ${s(`padding:5px 6px;font-size:9.5px;color:${clr};text-align:right;${fw}`)}>${v}</td>`
    const leanDom = side.lean_dom === 'left' ? '◀' : '▶'
    const fatDom  = side.fat_dom  === 'left' ? '◀' : '▶'
    return `<tr ${s(border + bg)}>
      <td ${s(`padding:5px 6px;font-size:9.5px;color:${P.text};${fw}`)}>${label}</td>
      ${td(kg(side.left.lean_g),  P.text)}
      ${td(kg(side.right.lean_g), P.text)}
      ${td(`<span style="color:${lc};font-weight:700">${side.lean_asym}% ${leanDom}</span>`, lc)}
      ${td(kg(side.left.fat_g),   P.text)}
      ${td(kg(side.right.fat_g),  P.text)}
      ${td(`<span style="color:${fc};font-weight:700">${side.fat_asym}% ${fatDom}</span>`,  fc)}
      ${td(kg(side.left.bone_g),  P.text)}
      ${td(kg(side.right.bone_g), P.text)}
      ${td(`<span style="color:${bc};font-weight:700">${side.bone_asym}%</span>`, bc)}
    </tr>`
  }

  // ── Interpretation ─────────────────────────────────────────────────────────
  // Only emits text for amber/red findings; silent when everything is green.
  function buildInterp() {
    function level(pct, region) {
      const [lo, hi] = region === 'arms' ? [15, 25] : [10, 15]
      if (pct >= hi) return 'significant'
      if (pct >= lo) return 'notable'
      return null
    }
    function domStr(dom) { return dom ? ` (${dom}-dominant)` : '' }

    const sig = [], not = []
    function check(side, regionKey, regionLabel, metric, asym, dom) {
      const lv = level(asym, regionKey)
      if (!lv) return
      const entry = `${regionLabel} ${metric} asymmetry ${asym}%${domStr(dom)}`
      lv === 'significant' ? sig.push(entry) : not.push(entry)
    }

    if (arms) {
      check(arms, 'arms', 'arm', 'lean', arms.lean_asym, arms.lean_dom)
      check(arms, 'arms', 'arm', 'fat',  arms.fat_asym,  null)
      check(arms, 'arms', 'arm', 'bone', arms.bone_asym, null)
    }
    if (legs) {
      check(legs, 'legs', 'leg', 'lean', legs.lean_asym, legs.lean_dom)
      check(legs, 'legs', 'leg', 'fat',  legs.fat_asym,  null)
      check(legs, 'legs', 'leg', 'bone', legs.bone_asym, null)
    }
    if (trunk) {
      check(trunk, 'trunk', 'trunk', 'lean', trunk.lean_asym, trunk.lean_dom)
      check(trunk, 'trunk', 'trunk', 'fat',  trunk.fat_asym,  null)
      check(trunk, 'trunk', 'trunk', 'bone', trunk.bone_asym, null)
    }

    if (!sig.length && !not.length)
      return { text: 'Bilateral symmetry within normal limits across all regions.', color: C.greenLt }

    const parts = []
    if (sig.length) parts.push(`<strong>Significant:</strong> ${sig.join('; ')}.`)
    if (not.length) parts.push(`<strong>Notable:</strong> ${not.join('; ')}.`)
    if (sig.length) parts.push('Significant findings warrant further clinical evaluation.')
    else parts.push('Monitor at follow-up.')

    return { text: parts.join(' '), color: sig.length ? C.red : C.amber }
  }

  const interp = buildInterp()

  const thStyle = s(`padding:4px 6px;font-size:8.5px;color:${P.gray};font-weight:700;text-align:right;border-bottom:2px solid ${P.border}`)
  const thL = s(`padding:4px 6px;font-size:8.5px;color:${P.gray};font-weight:700;border-bottom:2px solid ${P.border}`)

  return `
  <div class="card" ${s('flex-shrink:0')}>
    <div class="sec">Bilateral Symmetry — Left vs Right</div>
    <div ${s(`font-size:9px;color:${P.gray};margin-bottom:8px;line-height:1.5`)}>
      Complements A/G analysis: A/G = horizontal (abdominal vs hip) · Symmetry = vertical (left vs right).
      ◀ = left dominant &nbsp;·&nbsp; ▶ = right dominant
    </div>
    <table ${s('width:100%;border-collapse:collapse')}>
      <thead>
        <tr>
          <th ${thL}></th>
          <th ${thStyle} colspan="3">Lean Mass (kg)</th>
          <th ${thStyle} colspan="3">Fat Mass (kg)</th>
          <th ${thStyle} colspan="3">Bone (kg)</th>
        </tr>
        <tr>
          <th ${thL}>Region</th>
          <th ${thStyle}>Left</th>
          <th ${thStyle}>Right</th>
          <th ${thStyle}>Δ</th>
          <th ${thStyle}>Left</th>
          <th ${thStyle}>Right</th>
          <th ${thStyle}>Δ</th>
          <th ${thStyle}>Left</th>
          <th ${thStyle}>Right</th>
          <th ${thStyle}>Δ</th>
        </tr>
      </thead>
      <tbody>
        ${row('Arms',  arms,  'arms')}
        ${row('Legs',  legs,  'legs')}
        ${row('Trunk', trunk, 'trunk')}
        ${row('Total', total, 'total', true)}
      </tbody>
    </table>
    <div ${s(`font-size:8.5px;color:${P.gray};margin-top:6px;line-height:1.5`)}>
      Lean Δ thresholds — Arms: &lt;15% normal (dominant side), &gt;25% significant ·
      Legs/Trunk: &lt;10% normal, &gt;15% significant
    </div>
    <div ${s(`font-size:9px;color:${interp.color};margin-top:8px;line-height:1.5;padding:6px 8px;border-left:3px solid ${interp.color};background:${interp.color}18;border-radius:0 4px 4px 0`)}>
      ${interp.text}
    </div>
  </div>`
}

function agChart(comp, gender, P) {
  const { android_fat_pct: afp, gynoid_fat_pct: gfp, ag_ratio: ag } = comp
  const android = comp.regions.Android, gynoid = comp.regions.Gynoid
  const male = gender.toLowerCase().startsWith('m')
  const agColor = ag < 0.8 ? C.greenLt : ag < 1.0 ? C.amber : C.red

  const interp = male
    ? ag < 0.8
      ? 'Fat stored predominantly in hips and thighs — below the typical male distribution. Favourable metabolic profile.'
      : ag < 1.0
        ? 'Balanced fat distribution within the normal range for male body composition.'
        : 'Mild central fat predominance, common in male body composition patterns. Monitor abdominal fat trend over time.'
    : ag < 0.8
      ? 'Favourable gynoid distribution typical of female body composition. Lower cardiometabolic risk profile.'
      : ag < 1.0
        ? 'Mixed distribution with slight central tendency relative to the typical female fat pattern. Monitor over time.'
        : 'Increased abdominal fat distribution relative to the expected female fat pattern. Associated with higher cardiometabolic risk in women.'

  const sideBars = android && gynoid ? `
  <div ${s('display:flex;gap:14px;margin-top:14px')}>
    ${[
      { name: 'Android (Abdominal)', d: android, fatPct: afp },
      { name: 'Gynoid (Hip / Thigh)',  d: gynoid,  fatPct: gfp  },
    ].map(({ name, d, fatPct }) => `
    <div ${s('flex:1')}>
      <div ${s(`font-size:11px;font-weight:600;color:${P.grayLt};margin-bottom:6px`)}>${name}</div>
      <div ${s('display:flex;height:32px;border-radius:4px;overflow:hidden')}>
        <div ${s(`width:${d.fat_pct}%;background:${C.pink};display:flex;align-items:center;justify-content:center`)}>
          ${d.fat_pct > 12 ? `<span ${s('font-size:10px;font-weight:700;color:#fff')}>${d.fat_pct}%</span>` : ''}
        </div>
        <div ${s(`width:${d.lean_pct}%;background:${C.cyan};display:flex;align-items:center;justify-content:center`)}>
          ${d.lean_pct > 12 ? `<span ${s(`font-size:10px;font-weight:700;color:${P.bg}`)}>${d.lean_pct}%</span>` : ''}
        </div>
        <div ${s(`width:${d.bone_pct}%;background:${C.bone}`)}></div>
      </div>
      <div ${s(`font-size:10px;color:${P.gray};margin-top:6px;line-height:1.9`)}>
        <div><span ${s(`color:${C.pink}`)}>■</span> Fat: ${fatPct}% · ${(d.fat_g/1000).toFixed(2)} kg</div>
        <div><span ${s(`color:${C.cyan}`)}>■</span> Lean: ${d.lean_pct}% · ${(d.lean_g/1000).toFixed(2)} kg</div>
        <div><span ${s(`color:${C.bone}`)}>■</span> BMC: ${d.bone_pct}% · ${(d.bone_g/1000).toFixed(2)} kg</div>
        <div ${s(`color:${d.lean_pct > 60 ? C.cyan : P.gray};font-weight:${d.lean_pct > 60 ? 600 : 400};margin-top:2px`)}>
          ${d.lean_pct > 60 ? 'Muscle-dominant ✓' : 'Mixed composition'}
        </div>
      </div>
    </div>`).join('')}
  </div>
  ${gynoid && gynoid.lean_pct > 60 ? `
  <div ${s(`font-size:9px;color:${P.gray};margin-top:8px;padding-top:6px;border-top:1px solid ${P.border};line-height:1.5`)}>
    <span ${s(`color:${C.cyan};font-weight:600`)}>Lean ${gynoid.lean_pct}% of gynoid region is skeletal muscle.</span>
    High lower-body lean mass <strong ${s(`color:${P.grayLt}`)}>lowers gynoid fat%</strong>, which can raise the A/G ratio —
    this may overstate central fat predominance in muscular individuals.
    Assess true abdominal fat from android fat% (${afp}%) directly.
  </div>` : ''}` : ''

  return `
  <div>
    <div ${s('display:flex;align-items:center;gap:16px;margin-bottom:6px')}>
      <div>
        <div class="lbl">A/G Fat % Ratio</div>
        <div ${s(`font-size:44px;font-weight:800;color:${agColor};line-height:1`)}>${ag}</div>
        <div ${s(`font-size:11px;color:${agColor};font-weight:600;margin-top:6px`)}>${interp}</div>
        <div ${s(`font-size:10px;color:${P.gray};margin-top:8px;line-height:1.7`)}>
          <span ${s(`color:${C.greenLt};font-weight:700`)}>&lt;0.80 Gynoid</span> ·
          <span ${s(`color:${C.amber};font-weight:700`)}>0.80–1.0 Intermediate</span> ·
          <span ${s(`color:${C.red};font-weight:700`)}>&gt;1.0 Android</span>
        </div>
      </div>
    </div>
    ${sideBars}
  </div>`
}

function whoViz(t, P) {
  const pct = Math.min(Math.max(((t + 4) / 8) * 100, 1), 99)
  // Label positions derived from actual T-score: pct = ((t+4)/8)*100
  // −4→0%, −2.5→18.75%, −1→37.5%, 0→50%, +4→100%
  const tickPcts = [0, 18.75, 37.5, 50, 100]
  const tickLabels = ['−4', '−2.5', '−1', '0', '+4']
  return `
  <div>
    <div ${s('position:relative;margin-bottom:8px')}>
      <div ${s('display:flex;height:28px;border-radius:5px;overflow:hidden')}>
        <div ${s(`width:18.75%;background:${C.red}99;display:flex;align-items:center;justify-content:center`)}>
          <span ${s(`font-size:9px;color:#fff;font-weight:700`)}>Osteoporosis</span></div>
        <div ${s(`width:18.75%;background:${C.amber}99;display:flex;align-items:center;justify-content:center`)}>
          <span ${s(`font-size:9px;color:#fff;font-weight:700`)}>Osteopenia</span></div>
        <div ${s(`width:62.5%;background:${C.green}99;display:flex;align-items:center;justify-content:center`)}>
          <span ${s(`font-size:9px;color:#fff;font-weight:700`)}>Normal Bone Density</span></div>
      </div>
      <div ${s(`position:absolute;left:${pct}%;top:-6px;width:5px;height:42px;background:${P.text};border-radius:2px;transform:translateX(-50%);box-shadow:0 0 4px rgba(0,0,0,.5)`)}></div>
    </div>
    <div ${s('position:relative;height:14px')}>
      ${tickPcts.map((p, i) => {
        const anchor = i === 0 ? 'left' : i === tickPcts.length - 1 ? 'right' : ''
        const transform = anchor ? '' : 'transform:translateX(-50%)'
        const pos = anchor === 'right' ? `right:0` : `left:${p}%`
        return `<span ${s(`position:absolute;${pos};${transform};font-size:9px;color:${P.gray}`)}>${tickLabels[i]}</span>`
      }).join('')}
    </div>
  </div>`
}

function scoreBlock(lbl, val, meaning, P) {
  const col = val <= -2.5 ? C.red : val <= -1 ? C.amber : C.greenLt
  const sign = val >= 0 ? '+' : ''
  return `
  <div ${s('display:flex;flex-direction:column')}>
    <div class="lbl">${esc(lbl)}</div>
    <div ${s(`font-size:9px;color:${P.gray};margin-top:2px`)}>${meaning}</div>
    <div ${s('flex:1;min-height:8px')}></div>
    <div ${s(`font-size:38px;font-weight:800;color:${col};line-height:1;margin-top:4px`)}>${sign}${val.toFixed(1)}</div>
  </div>`
}


function boneCardBg(cls, P) {
  return cls === 'osteoporosis' ? P.statusAlert : cls === 'low_mass' ? P.statusWarn : P.statusGood
}

function boneColor(cls) {
  return cls === 'osteoporosis' ? C.red : cls === 'low_mass' ? C.amber : C.greenLt
}

function bodyFatRefCard(fatPct, gender, P) {
  const male = gender.toLowerCase().startsWith('m')

  const zones = male
    ? [{ lbl: 'Athletic', range: '<14%',   w: 40,   c: C.greenLt, hi: 14 },
       { lbl: 'Fit',      range: '14–18%', w: 11.4, c: C.tealLt,  lo: 14, hi: 18 },
       { lbl: 'Normal',   range: '18–25%', w: 20,   c: C.amber,   lo: 18, hi: 25 },
       { lbl: 'Excess',   range: '>25%',   w: 28.6, c: C.red,     lo: 25 }]
    : [{ lbl: 'Athletic', range: '<21%',   w: 46.7, c: C.greenLt, hi: 21 },
       { lbl: 'Fit',      range: '21–25%', w: 8.9,  c: C.tealLt,  lo: 21, hi: 25 },
       { lbl: 'Normal',   range: '25–32%', w: 15.6, c: C.amber,   lo: 25, hi: 32 },
       { lbl: 'Excess',   range: '>32%',   w: 28.9, c: C.red,     lo: 32 }]
  const maxScale = male ? 35 : 45
  const markerPct = Math.min(Math.max(fatPct / maxScale * 100, 1), 99)
  const zone = zones.find(z => fatPct >= (z.lo ?? 0) && fatPct < (z.hi ?? Infinity))
  const markerColor = zone?.c ?? P.gray
  return `
  <div class="card" ${s('flex-shrink:0')}>
    <div class="sec">Body Fat % Reference (${male ? 'Men' : 'Women'}) — ACE Categories</div>
    <div ${s('position:relative;margin-bottom:6px')}>
      <div ${s('display:flex;height:14px;border-radius:4px;overflow:hidden')}>
        ${zones.map(z => `<div ${s(`width:${z.w}%;background:${z.c};opacity:.45`)}></div>`).join('')}
      </div>
      <div ${s(`position:absolute;left:${markerPct}%;top:-4px;bottom:-4px;width:3px;background:${P.text};border-radius:2px;transform:translateX(-50%);box-shadow:0 0 3px rgba(0,0,0,.5)`)}></div>
    </div>
    <div ${s('display:flex;justify-content:space-between;font-size:9px;margin-top:4px')}>
      ${zones.map(z => `<div><span ${s(`color:${z.c};font-weight:700`)}>${z.lbl}</span> <span ${s(`color:${P.gray}`)}>${z.range}</span></div>`).join('')}
    </div>
    <div ${s(`font-size:10px;margin-top:8px;border-top:1px solid ${P.border};padding-top:6px;color:${P.gray}`)}>
      Patient body fat: <strong ${s(`color:${markerColor}`)}>${fatPct}%</strong>
      <span ${s(`color:${zone?.c ?? P.gray};font-weight:600;margin-left:8px`)}>${zone?.lbl ?? ''} range</span>
    </div>
  </div>`
}


/* ── Pages ───────────────────────────────────────────────────────────────── */

function page1(data, P, lh = false, pageNum = 1, totalPages = 5) {
  const { patient: pt, composition: comp, computed: calc } = data
  const bmiNote = (bmi) =>
    bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal weight' : bmi < 30 ? 'Overweight' : 'Obese class I+'
  const almiNote = (r) =>
    r === 'high' ? '● Excellent — above reference' : r === 'low' ? '▲ Below reference' : '● Within normal range'
  const fmiNote = (r) =>
    r === 'low' ? 'Normal (men <6 / women <9 kg/m²)' : r === 'moderate' ? '▲ Borderline elevated' : '▲ Elevated'

  return `
<div class="page">
  ${header(pt, 'DEXA — Body Composition Summary', P, lh, pageNum, totalPages, 'What are my key body composition numbers?')}
  <div ${s('flex:1;display:flex;gap:16px;min-height:0')}>
    <div ${s('width:160px;flex-shrink:0;display:flex;flex-direction:column;justify-content:center;align-items:center')}>
      <img src="${data.images.composite_url}" alt="body composition + bone"
           ${s('width:100%;object-fit:contain;border-radius:6px')}>
      <div ${s(`text-align:center;margin-top:6px;font-size:8px;color:${P.gray};opacity:.7;letter-spacing:.3px;flex-shrink:0`)}>Image not for diagnosis</div>
    </div>
    <div class="col" ${s('flex:1;gap:12px;min-height:0')}>
      <div class="row" ${s('gap:12px;flex-shrink:0')}>
        ${metricBox('Body Fat',  `${comp.fat_pct}`,                   '%',        C.pink,    P, comp.centile ? `Centile ${comp.centile}` : undefined)}
        ${metricBox('Fat Mass',  `${(comp.fat_g/1000).toFixed(1)}`,   'kg',       C.pink,    P)}
        ${metricBox('Lean Mass', `${(comp.lean_g/1000).toFixed(1)}`,  'kg',       C.cyan,    P)}
        ${metricBox('RMR',       `${calc.rmr_kcal.toLocaleString()}`, 'kcal/day', C.tealLt,  P, 'Katch-McArdle')}
      </div>
      <div class="card" ${s('flex-shrink:0')}>
        <div class="sec">Body Composition</div>
        ${compBar(comp.fat_g, comp.lean_g, comp.bmc_g, P)}
      </div>
      <div class="card" ${s('flex-shrink:0')}>
        <div class="sec">Body &amp; Lean Mass Indices</div>
        ${calc.alm_available
          ? mrow('ALM — Appendicular Lean Mass', `${calc.alm_kg} kg`, 'Arms + Legs lean', C.cyan, P)
          : mrow('ALM — Appendicular Lean Mass', 'N/A', 'Requires MDB regional data', P.gray, P)}
        ${calc.alm_available
          ? mrow('ALMI — Lean Mass Index', `${calc.almi} kg/m²`, almiNote(calc.almi_rating), C.cyan, P)
          : mrow('ALMI — Lean Mass Index', 'N/A', 'Not computable without regional breakdown', P.gray, P)}
        ${mrow('LMI — Lean Mass Index', `${calc.lmi} kg/m²`, 'Total lean ÷ height²', C.cyan, P)}
        ${mrow('FMI — Fat Mass Index', `${calc.fmi} kg/m²`, fmiNote(calc.fat_risk), C.pink, P)}
        ${mrow('Bone Mineral Content', `${(comp.bmc_g/1000).toFixed(2)} kg`, `${comp.bmc_g > 0 ? ((comp.bmc_g / comp.total_g)*100).toFixed(1) + '% of total mass' : ''}`, C.bone, P)}
        ${mrow('BMI', `${pt.bmi_entered}`, bmiNote(pt.bmi_entered), C.tealLt, P)}
        ${mrow('Total Body Mass (scan)', `${pt.weight_measured_kg} kg`, 'Fat + Lean + BMC', P.gray, P)}
      </div>
      ${bodyFatRefCard(comp.fat_pct, pt.gender, P)}
    </div>
  </div>
</div>`
}

function page2(data, P, lh = false, pageNum = 2, totalPages = 5) {
  const { patient: pt, composition: comp } = data
  const centileBlock = comp.centile !== undefined ? (() => {
    const c = comp.centile
    const centileColor = c >= 75 ? C.red : c >= 50 ? C.amber : C.greenLt
    const centileLabel = c >= 75 ? 'Significantly above average for age/sex'
      : c >= 50 ? 'Above average for age and sex'
      : c >= 25 ? 'Below average — favourable'
      : 'Well below average for age and sex'
    return `
  <div class="card" ${s('flex-shrink:0')}>
    <div class="sec">Age-Matched Fat Centile</div>
    <div ${s('display:flex;align-items:center;gap:12px')}>
      <div ${s(`font-size:36px;font-weight:800;color:${centileColor};line-height:1;min-width:36px`)}>${c}</div>
      <div ${s('flex:1')}>
        <div ${s(`font-size:10px;color:${P.text};font-weight:600`)}>Body fat % is greater than that of ${c}% of ${pt.gender === 'Male' ? 'men' : 'women'} of the same age</div>
        <div ${s(`font-size:10px;color:${centileColor};font-weight:600;margin-top:1px`)}>${centileLabel}</div>
        <div ${s(`font-size:8.5px;color:${P.gray};margin-top:3px`)}>50th = average &nbsp;·&nbsp; Ref: White · Kelly et al. 2009 (NHANES DEXA)</div>
      </div>
    </div>
  </div>`
  })() : ''

  return `
<div class="page">
  ${header(pt, 'DEXA — Fat Distribution Analysis', P, lh, pageNum, totalPages, 'Where does my fat sit, and how does it compare to my peers?')}
  <div ${s('flex:1;display:flex;gap:16px;min-height:0')}>
    <div ${s('width:160px;flex-shrink:0;display:flex;flex-direction:column;justify-content:center;align-items:center')}>
      <img src="${data.images.fat_gradient_url}" alt="fat gradient"
           ${s('width:100%;object-fit:contain;border-radius:6px')}>
      <div ${s(`text-align:center;margin-top:6px;font-size:9.5px;color:${P.gray};flex-shrink:0`)}>
        <span ${s('color:#C62828')}>■</span> Dense fat &nbsp;
        <span ${s('color:#1565C0')}>■</span> Low fat
      </div>
      <div ${s(`text-align:center;margin-top:3px;font-size:8px;color:${P.gray};opacity:.7;letter-spacing:.3px;flex-shrink:0`)}>Image not for diagnosis</div>
    </div>
    <div class="col" ${s('flex:1;gap:14px;min-height:0')}>
      <div class="card" ${s('flex-shrink:0')}>
        <div class="sec">Android / Gynoid Analysis</div>
        ${agChart(comp, pt.gender, P)}
        <div ${s(`font-size:8.5px;color:${P.gray};margin-top:10px;padding-top:8px;border-top:1px solid ${P.border};line-height:1.5`)}>
          Android/Gynoid ratio = android fat% ÷ gynoid fat%, where fat% = fat mass ÷ total regional mass.
          High lower-body muscle mass <em>lowers</em> gynoid fat% (muscle displaces fat in the ratio denominator),
          which can <strong ${s(`color:${P.grayLt}`)}>elevate the A/G ratio</strong> even without true abdominal fat excess.
          Interpret with caution in lean, muscular individuals.
        </div>
      </div>
      <div class="card" ${s('flex-shrink:0')}>
        <div class="sec">Fat Mass Index (FMI)</div>
        ${fmiScale(data.computed.fmi, pt.gender, P)}
      </div>
      ${centileBlock}
    </div>
  </div>
</div>`
}

function page3(data, P, lh = false, pageNum = 3, totalPages = 5) {
  const { patient: pt, composition: comp, computed: calc, bilateral } = data
  const armsLean = comp.regions.Arms ? (comp.regions.Arms.lean_g / 1000).toFixed(2) : '—'
  const legsLean = comp.regions.Legs ? (comp.regions.Legs.lean_g / 1000).toFixed(2) : '—'
  return `
<div class="page">
  ${header(pt, 'DEXA — Regional Body Composition', P, lh, pageNum, totalPages, 'How is fat and muscle distributed across my body?')}
  <div ${s('flex:1;display:flex;flex-direction:column;gap:14px;min-height:0')}>
    <div class="card" ${s('flex-shrink:0')}>
      <div class="sec">Tissue Breakdown by Region</div>
      <div ${s(`font-size:10px;color:${P.gray};margin-bottom:10px`)}>
        Bar width = proportion of region. &nbsp;
        <span ${s(`color:${C.pink}`)}>■ Fat</span> &nbsp;
        <span ${s(`color:${C.cyan}`)}>■ Lean</span> &nbsp;
        <span ${s(`color:${C.bone}`)}>■ BMC</span>
      </div>
      ${(['Arms', 'Trunk', 'Legs']).map(n => comp.regions[n] ? regionBarRow(n, comp.regions[n], P) : '').join('')}
    </div>
    ${calc.alm_available ? `
    <div class="card" ${s(`background:${P.cardHighlight};border:1px solid ${C.cyan}33;flex-shrink:0`)}>
      <div class="row" ${s('align-items:stretch;gap:0')}>
        <div ${s('flex:1;display:flex;flex-direction:column;padding-right:20px')}>
          <div class="lbl">ALM — Appendicular Lean Mass</div>
          <div ${s(`font-size:40px;font-weight:800;color:${C.cyan};line-height:1;margin-top:14px`)}>${calc.alm_kg}</div>
          <div ${s(`font-size:10px;color:${P.gray};margin-top:4px`)}>kg</div>
          <div ${s(`font-size:9px;color:${P.gray};margin-top:4px`)}>Arms ${armsLean} + Legs ${legsLean} kg</div>
        </div>
        <div ${s(`border-left:1px solid ${P.border};padding-left:20px;flex:1;display:flex;flex-direction:column`)}>
          <div class="lbl">ALMI</div>
          <div ${s(`font-size:40px;font-weight:800;color:${C.cyan};line-height:1;margin-top:14px`)}>${calc.almi}</div>
          <div ${s(`font-size:10px;color:${P.gray};margin-top:4px`)}>kg/m²</div>
          <div ${s('margin-top:8px')}>
            ${(() => {
              const badge = almiBadge(calc.almi_rating)
              const colors = { low: C.amber, normal: C.greenLt, high: C.cyan }
              const col = colors[badge.level] ?? P.gray
              return `<span class="tag" ${s(`color:${col};background:${col}22;border:1px solid ${col}44`)}>${badge.label}</span>`
            })()}
          </div>
        </div>
        <div ${s(`border-left:1px solid ${P.border};padding-left:20px;font-size:10px;color:${P.gray};line-height:1.9;max-width:200px;display:flex;flex-direction:column;justify-content:center`)}>
          ${(() => {
            const male = pt.gender.toLowerCase().startsWith('m')
            const lo = male ? 7.26 : 5.67
            const hi = male ? 9.2  : 7.5
            return `
          <div ${s(`font-weight:700;color:${P.text};margin-bottom:4px`)}>ALMI reference (${male ? 'men' : 'women'})</div>
          <div><span ${s(`color:${C.amber}`)}>Low</span> &lt;${lo}</div>
          <div><span ${s(`color:${C.greenLt}`)}>Normal</span> ${lo}–${hi}</div>
          <div><span ${s(`color:${C.cyan}`)}>High</span> &gt;${hi}</div>
          <div ${s(`font-size:9px;color:${P.gray};margin-top:2px`)}>(kg/m²)</div>
          <div ${s(`color:${C.tealLt};font-size:9px;margin-top:6px`)}>Baumgartner 1998 /<br>Cruz-Jentoft criteria</div>`
          })()}
        </div>
      </div>
    </div>
    ${(() => {
      const ctx = muscleContext(calc)
      return `
  <div class="card" ${s('flex-shrink:0')}>
    <div class="sec">${ctx.heading}</div>
    <div ${s(`font-size:10.5px;color:${P.gray};line-height:1.85`)}>
      ${ctx.intro}<br>
      ${ctx.tips.map(t => `<span ${s(`color:${C.tealLt};font-weight:600`)}>▸ ${t}</span>`).join('<br>')}
    </div>
  </div>`
    })()}
    ${symmetryCard(bilateral, P)}` : `
    <div class="card" ${s(`background:${P.cardHighlight};border:1px solid ${P.border};flex-shrink:0`)}>
      <div class="lbl" ${s('margin-bottom:6px')}>ALM / ALMI — Appendicular Lean Mass Index</div>
      <div ${s(`font-size:11px;color:${P.gray};line-height:1.7`)}>
        Regional breakdown was not stored in the MDB analysis for this scan. Arms and Legs lean mass cannot be computed separately,
        so ALM and ALMI are unavailable. ALMI will be available on subsequent scans if regional analysis is retained.
      </div>
    </div>
    ${(() => {
      const ctx = muscleContext(calc)
      return `
  <div class="card" ${s('flex-shrink:0')}>
    <div class="sec">${ctx.heading}</div>
    <div ${s(`font-size:10.5px;color:${P.gray};line-height:1.85`)}>
      ${ctx.intro}<br>
      ${ctx.tips.map(t => `<span ${s(`color:${C.tealLt};font-weight:600`)}>▸ ${t}</span>`).join('<br>')}
    </div>
  </div>`
    })()}
    ${symmetryCard(bilateral, P)}`}
  </div>
</div>`
}

function page4(data, P, lh = false, pageNum = 4, totalPages = 5) {
  const { patient: pt, bone } = data
  const order = ['Head', 'Arms', 'Trunk', 'Legs', 'Ribs', 'Spine', 'Pelvis']

  const regionalEntries = order.filter(n => bone.regions[n] && bone.regions[n].bmd != null)
  const hasRegionalScores = regionalEntries.some(n => bone.regions[n].T != null || bone.regions[n].Z != null)

  const boneTableRows = regionalEntries.map(n => {
    const d = bone.regions[n]
    const bmdColor = d.bmd > 1.2 ? C.greenLt : d.bmd > 0.9 ? C.amber : C.red
    const baseRow = `<td style="padding:8px 10px;font-size:11px;color:${P.grayLt};font-weight:600;border-bottom:1px solid ${P.border}">${n}</td>
      <td style="padding:8px 10px;font-size:11px;color:${bmdColor};font-family:monospace;text-align:right;border-bottom:1px solid ${P.border}">${d.bmd != null ? d.bmd.toFixed(3) : '—'}</td>`
    if (!hasRegionalScores) return `<tr>${baseRow}</tr>`
    const tSign = d.T != null ? (d.T >= 0 ? '+' : '') : ''
    const zSign = d.Z != null ? (d.Z >= 0 ? '+' : '') : ''
    const tColor = d.T == null ? P.gray : d.T <= -2.5 ? C.red : d.T <= -1 ? C.amber : C.greenLt
    const zColor = d.Z == null ? P.gray : d.Z <= -2 ? C.red : C.greenLt
    return `<tr>${baseRow}
      <td style="padding:8px 10px;font-size:11px;color:${tColor};font-family:monospace;text-align:right;border-bottom:1px solid ${P.border}">${d.T != null ? tSign + d.T.toFixed(1) : '—'}</td>
      <td style="padding:8px 10px;font-size:11px;color:${zColor};font-family:monospace;text-align:right;border-bottom:1px solid ${P.border}">${d.Z != null ? zSign + d.Z.toFixed(1) : '—'}</td>
    </tr>`
  }).join('')

  const scoreCols = hasRegionalScores ? `
    <th style="padding:6px 10px;font-size:10px;font-weight:700;color:${P.gray};text-align:right;text-transform:uppercase;letter-spacing:.5px">T-Score</th>
    <th style="padding:6px 10px;font-size:10px;font-weight:700;color:${P.gray};text-align:right;text-transform:uppercase;letter-spacing:.5px">Z-Score</th>` : ''

  return `
<div class="page">
  ${header(pt, 'DEXA — Bone Health & Density', P, lh, pageNum, totalPages, 'How dense and strong are my bones?')}
  <div class="col" ${s('flex:1;gap:14px;min-height:0')}>
    <!-- Full-width hero classification card -->
    <div class="card" ${s(`background:${boneCardBg(bone.classification, P)};flex-shrink:0`)}>
      <div class="row" ${s('align-items:stretch;gap:24px;margin-bottom:12px')}>
        <div ${s('display:flex;flex-direction:column')}>
          <div class="lbl">Total Body BMD</div>
          <div ${s(`font-size:9px;color:${P.gray};margin-top:2px`)}>whole-body bone mineral density</div>
          <div ${s('margin-top:6px')}>
            ${(() => {
              const badge = boneClassBadge(bone.classification)
              const colors = { normal: C.greenLt, low_mass: C.amber, osteoporosis: C.red }
              const col = colors[badge.level] ?? P.gray
              return `<span class="tag" ${s(`color:${col};background:${col}22;border:1px solid ${col}44`)}>${badge.label}</span>`
            })()}
          </div>
          <div ${s('flex:1;min-height:8px')}></div>
          <div ${s('display:flex;align-items:baseline;gap:4px;margin-top:4px')}>
            <span ${s(`font-size:46px;font-weight:800;color:${boneColor(bone.classification)};line-height:1`)}>${bone.total_bmd.toFixed(3)}</span>
            <span ${s(`font-size:11px;color:${P.gray}`)}>g/cm²</span>
          </div>
        </div>
        ${scoreBlock('T-Score', bone.total_t, 'vs peak bone mass (age 30)', P)}
        ${scoreBlock('Z-Score', bone.total_z, 'vs same age &amp; sex peers', P)}
        ${densitometryChart(pt.age, bone.total_bmd, 'totalbody', pt.gender, P)}
      </div>
      ${whoViz(bone.total_t, P)}
    </div>
    <!-- Bone image + regional BMD table + understanding strip side by side -->
    <div class="row" ${s('flex:1;gap:14px;min-height:0')}>
      <div ${s('width:130px;flex-shrink:0;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:4px')}>
        <img src="${data.images.bone_roi_url}" onerror="this.onerror=null;this.src='${data.images.bone_url}'" alt="bone scan"
             ${s('width:100%;object-fit:contain;border-radius:6px')}>
        <div ${s(`text-align:center;font-size:8px;color:${P.gray};opacity:.7;letter-spacing:.3px`)}>Image not for diagnosis</div>
      </div>
      <div class="col" ${s('flex:1;gap:12px;min-height:0')}>
        <div class="card" ${s('flex-shrink:0')}>
          <div class="sec">BMD by Body Region</div>
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr style="border-bottom:1px solid ${P.border}">
                <th style="padding:6px 10px;font-size:10px;font-weight:700;color:${P.gray};text-align:left;text-transform:uppercase;letter-spacing:.5px">Region</th>
                <th style="padding:6px 10px;font-size:10px;font-weight:700;color:${P.gray};text-align:right;text-transform:uppercase;letter-spacing:.5px">BMD (g/cm²)</th>
                ${scoreCols}
              </tr>
            </thead>
            <tbody>${boneTableRows}</tbody>
          </table>
          <div style="font-size:9px;color:${P.gray};margin-top:7px">
            BMD colour: <span style="color:${C.greenLt}">■</span> &gt;1.2 · <span style="color:${C.amber}">■</span> 0.9–1.2 · <span style="color:${C.red}">■</span> &lt;0.9 g/cm² &nbsp;·&nbsp;
            ${hasRegionalScores ? 'T/Z scores shown where computed by scanner' : 'T-score and Z-score available for Total Body only (shown above)'}
          </div>
        </div>
        <div class="card" ${s('flex-shrink:0;padding:10px 14px')}>
          <div class="row" ${s('gap:20px;align-items:flex-start')}>
            <div ${s('flex:1')}>
              <div ${s(`font-size:9.5px;font-weight:700;color:${C.tealLt};margin-bottom:2px`)}>T-Score <span ${s(`font-size:8.5px;font-weight:400;color:${P.gray}`)}>vs healthy 30-year-old · WHO standard</span></div>
              <div ${s('display:flex;flex-direction:column;gap:2px;margin-top:4px')}>
                <div><span ${s(`font-size:9px;color:${C.greenLt};font-weight:700;display:inline-block;width:60px`)}>≥ −1.0</span><span ${s(`font-size:9px;color:${P.text}`)}>Normal</span></div>
                <div><span ${s(`font-size:9px;color:${C.amber};font-weight:700;display:inline-block;width:60px`)}>−1 to −2.5</span><span ${s(`font-size:9px;color:${P.text}`)}>Osteopenia</span></div>
                <div><span ${s(`font-size:9px;color:${C.red};font-weight:700;display:inline-block;width:60px`)}>≤ −2.5</span><span ${s(`font-size:9px;color:${P.text}`)}>Osteoporosis</span></div>
              </div>
            </div>
            <div ${s(`width:1px;background:${P.border};align-self:stretch`)}></div>
            <div ${s('flex:1')}>
              <div ${s(`font-size:9.5px;font-weight:700;color:${C.tealLt};margin-bottom:2px`)}>Z-Score <span ${s(`font-size:8.5px;font-weight:400;color:${P.gray}`)}>vs same age &amp; sex</span></div>
              <div ${s(`font-size:9px;color:${P.gray};margin-top:4px;line-height:1.5`)}>
                Below −2.0 = "below expected for age"<br>
                If T is low but Z is near 0, bone loss is age-related, not accelerated.
              </div>
            </div>
          </div>
        </div>
        ${(() => {
          const guide = boneGuide(bone.classification)
          const colorMap = { normal: C.greenLt, low_mass: C.amber, osteoporosis: C.red }
          const col = colorMap[guide.severity] ?? C.greenLt
          return `
  <div class="card" ${s(`flex-shrink:0;border-left:3px solid ${col}`)}>
    <div class="sec">${guide.title}</div>
    <div ${s(`font-size:10.5px;color:${P.gray};line-height:1.9`)}>
      ${guide.items.map(i => `<div>▸ ${i}</div>`).join('')}
    </div>
  </div>`
        })()}
      </div>
    </div>
  </div>
</div>`
}

function page5(data, P, lh = false, pageNum = 5, totalPages = 5) {
  const { patient: pt, composition: comp, computed: calc, bone } = data
  const male = pt.gender?.toLowerCase().startsWith('m')
  const items = summaryItems(comp, calc, bone, pt.gender)
  const statusStyle = (st) => ({
    good:  { bg: P.statusGood,  border: C.greenLt },
    warn:  { bg: P.statusWarn,  border: C.amber   },
    alert: { bg: P.statusAlert, border: C.red     },
    info:  { bg: P.statusInfo,  border: C.tealLt  },
  }[st] ?? { bg: P.card, border: P.border })

  const cards = items.map(item => {
    const st = statusStyle(item.status)
    return `
    <div ${s(`background:${st.bg};border:1px solid ${st.border}40;border-left:4px solid ${st.border};border-radius:6px;padding:14px 18px;display:flex;flex-direction:column;justify-content:center`)}>
      <div ${s(`font-size:13px;font-weight:700;color:${st.border};margin-bottom:6px`)}>${item.title}</div>
      <div ${s(`font-size:11px;color:${P.grayLt};line-height:1.65`)}>${item.body}</div>
    </div>`
  }).join('')

  // Fat-loss targets — only show when BF% exceeds healthy threshold
  const fatTargetsBlock = (() => {
    const targets = fatLossTargets(comp, calc, pt.gender)
    if (!targets) return ''
    const rows = targets.targets.map(({ pct, fatToLose, weightToLose, targetWeight }) => {
      return `<tr>
        <td ${s(`padding:6px 10px;font-size:11px;color:${P.gray}`)}>${pct}% body fat</td>
        <td ${s(`padding:6px 10px;font-size:11px;color:${C.amber};font-family:monospace;text-align:right`)}>${fatToLose} kg</td>
        <td ${s(`padding:6px 10px;font-size:11px;color:${P.text};font-family:monospace;text-align:right`)}>${weightToLose} kg</td>
        <td ${s(`padding:6px 10px;font-size:11px;color:${P.text};font-family:monospace;text-align:right`)}>${targetWeight} kg</td>
      </tr>`
    }).join('')
    const sarcoWarning = targets.sarcopeniaRisk ? `
      <div ${s(`font-size:9px;color:${C.red};margin-top:8px;padding:6px;background:${C.red}11;border-radius:3px`)}><strong>Note:</strong> Your current muscle mass is below the recommended range. Resistance training is especially important during weight loss to prevent further muscle loss.</div>` : ''
    return `
    <div class="card" ${s('flex-shrink:0')}>
      <div class="sec">Weight Goal — Fat Loss Targets</div>
      <div ${s(`font-size:9px;color:${P.gray};margin-bottom:8px`)}>
        Current: <strong ${s(`color:${P.text}`)}>${targets.fatPct}% body fat · ${targets.currentWeight} kg total</strong> · Preserving lean mass at ${targets.leanKg} kg
      </div>
      <div ${s(`font-size:9px;color:${P.text};padding:8px;background:${P.statusInfo};border-left:3px solid ${C.tealLt};margin-bottom:10px;line-height:1.6`)}}>${targets.preservationNote}</div>
      <table ${s('width:100%;border-collapse:collapse')}>
        <thead><tr>
          <th ${s(`padding:4px 10px;font-size:9px;font-weight:700;color:${P.gray};text-align:left;border-bottom:1px solid ${P.border}`)}>Target</th>
          <th ${s(`padding:4px 10px;font-size:9px;font-weight:700;color:${P.gray};text-align:right;border-bottom:1px solid ${P.border}`)}>Fat Loss</th>
          <th ${s(`padding:4px 10px;font-size:9px;font-weight:700;color:${P.gray};text-align:right;border-bottom:1px solid ${P.border}`)}>Weight Loss</th>
          <th ${s(`padding:4px 10px;font-size:9px;font-weight:700;color:${P.gray};text-align:right;border-bottom:1px solid ${P.border}`)}>Goal Weight</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      ${sarcoWarning}
    </div>`
  })()

  return `
<div class="page">
  ${header(pt, 'DEXA — Clinical Summary', P, lh, pageNum, totalPages, 'What do my results mean, and what should I focus on?')}
  <div ${s('display:flex;flex-direction:column;gap:12px')}>
  <div ${s('display:grid;grid-template-columns:1fr 1fr;grid-auto-rows:auto;gap:12px')}>
    ${cards}
  </div>
  ${fatTargetsBlock}
  <div class="card">
    <div class="sec">Resting Metabolic Rate &amp; Daily Energy Needs</div>
    <div class="row" ${s('gap:14px;align-items:flex-start')}>
      <div ${s('flex:1')}>
        <div ${s('display:flex;align-items:baseline;gap:4px;margin-bottom:5px')}>
          <span ${s(`font-size:24px;font-weight:800;color:${C.tealLt};line-height:1`)}>${calc.rmr_kcal.toLocaleString()}</span>
          <span ${s(`font-size:10px;color:${P.gray}`)}>kcal/day at complete rest</span>
        </div>
        <div ${s(`font-size:9px;color:${P.gray};line-height:1.45`)}>
          Calories burned at rest — organ function, circulation, thermoregulation.<br>
          Derived from lean mass via Katch-McArdle. <strong ${s(`color:${P.text}`)}>Higher lean mass = higher RMR.</strong>
        </div>
      </div>
      <div ${s(`width:1px;background:${P.border};align-self:stretch`)}></div>
      <div ${s('flex:1')}>
        <div ${s(`font-size:8px;font-weight:700;color:${P.gray};text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px`)}>Activity Levels</div>
        <div ${s(`font-size:9px;color:${P.gray};line-height:1.7;display:flex;flex-direction:column;gap:6px`)}>
          <div><strong ${s(`color:${P.text}`)}>Sedentary</strong> — Little or no exercise; desk job. Multiply RMR by <strong>1.2</strong></div>
          <div><strong ${s(`color:${P.text}`)}>Light</strong> — Exercise 1–3 days/week. Multiply RMR by <strong>1.38</strong></div>
          <div><strong ${s(`color:${P.text}`)}>Moderate</strong> — Exercise 3–5 days/week. Multiply RMR by <strong>1.55</strong></div>
          <div><strong ${s(`color:${P.text}`)}>Active</strong> — Exercise 5–7 days/week or physically demanding job. Multiply RMR by <strong>1.73</strong></div>
        </div>
        <div ${s(`font-size:8px;color:${P.gray};margin-top:6px;line-height:1.4;font-style:italic`)}>Example: If you're "Moderate," your daily maintenance is approximately ${calc.rmr_kcal} × 1.55 = ${Math.round(calc.rmr_kcal * 1.55).toLocaleString()} kcal/day</div>
      </div>
    </div>
  </div>
  <div ${s(`background:${P.card};border:1px solid ${P.border};border-left:4px solid ${C.tealLt};border-radius:6px;padding:10px 16px`)}>
    <div class="row" ${s('gap:16px;align-items:flex-start')}>
      <div ${s('flex:1')}>
        <span ${s(`font-size:10px;font-weight:700;color:${C.tealLt}`)}>Why DEXA?</span>
        <span ${s(`font-size:9px;color:${P.gray};margin-left:8px`)}>WHO-endorsed gold standard for body composition &amp; bone density measurement</span>
        <div ${s(`margin-top:4px;font-size:9px;color:${P.grayLt};line-height:1.65`)}>
          DEXA (Dual-Energy X-ray Absorptiometry) uses two X-ray energies to precisely separate fat, lean, and bone — the only method that directly measures all three simultaneously.
          Unlike BIA scales or underwater weighing, it leaves no room for assumptions. Radiation dose is minimal (&lt;1 μSv, less than a single day of background exposure).
        </div>
      </div>
      <div ${s(`flex-shrink:0;display:flex;flex-direction:column;gap:4px;text-align:center;padding:6px 14px;background:${C.tealLt}18;border-radius:6px;border:1px solid ${C.tealLt}44`)}>
        <div ${s(`font-size:8px;font-weight:700;color:${C.tealLt};letter-spacing:.5px;text-transform:uppercase`)}>Gold</div>
        <div ${s(`font-size:8px;font-weight:700;color:${C.tealLt};letter-spacing:.5px;text-transform:uppercase`)}>Standard</div>
      </div>
    </div>
  </div>
  <div ${s(`border-top:1px solid ${P.border};padding-top:7px;font-size:9px;color:${P.gray};line-height:1.7;display:flex;align-items:center;gap:0`)}>
    <div style="flex:1">
      <div>
        Reference population: <strong>${esc(pt.ethnicity || 'White')}</strong> (GE Lunar normative database).
        South Asian-specific T &amp; Z score references are not available on this scanner platform — results are benchmarked against the White/Caucasian normative population, which may underestimate bone loss risk in South Asian individuals.
      </div>
      <div ${s('margin-top:3px')}>
        Visceral fat (VAT) estimation is not available on this scanner platform (GE Lunar DPX-NT). Trend comparison will be available after repeat scans on the same scanner.
      </div>
      <div ${s('margin-top:3px')}>
        Generated by <strong>labit.online</strong> DEXA Reporting System · Scanner ${esc(pt.scanner)} · ${esc(pt.software)} ·
        Scan ${esc(pt.scan_date)} · Bone: WHO criteria · ALM/FMI: NHANES/FNIH standards · For clinical use only — interpret with a qualified clinician.
      </div>
    </div>
    ${_labitBadge}
  </div>
  </div>
</div>`
}

