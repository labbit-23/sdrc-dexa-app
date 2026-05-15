/** @file Osteo HTML report template — shared with Labit BMD module. */

/* ── Palette ─────────────────────────────────────────────────────────────── */
const C = {
  teal: '#0D7377', tealLt: '#14a8ae',
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

function css(P, lh = false) {
  return lh ? `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#fff;font-family:'Inter',sans-serif;color:#1a1a2e;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .page{width:210mm;min-height:197mm;padding:6mm 15mm;margin:0 auto;background:#fff;page-break-after:always;display:flex;flex-direction:column}
  .page:last-child{page-break-after:auto}
  @page{size:A4;margin:35mm 15mm 51mm 15mm}
  .row{display:flex;gap:14px}.col{display:flex;flex-direction:column}
  .card{background:#f5f7fa;border:1px solid #d0dce8;border-radius:6px;padding:14px}
  .lbl{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.8px;color:#6b7280}
  .sec{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#0D7377;margin-bottom:10px}
  .tag{display:inline-block;padding:4px 12px;border-radius:3px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
  .sdrc-logo{display:none}
` : `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:${P.bg};font-family:'Inter',sans-serif;color:${P.text};-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .page{width:210mm;height:297mm;padding:10mm 13mm;margin:0 auto;background:${P.bg};page-break-after:always;position:relative;display:flex;flex-direction:column;overflow:hidden}
  .page:last-child{page-break-after:auto}
  @page{size:A4;margin:0}
  .row{display:flex;gap:14px}.col{display:flex;flex-direction:column}
  .card{background:${P.card};border:1px solid ${P.border};border-radius:8px;padding:16px}
  .lbl{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.8px;color:${P.gray}}
  .sec{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${C.tealLt};margin-bottom:10px}
  .tag{display:inline-block;padding:4px 12px;border-radius:3px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
`
}

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function st(style) { return `style="${style}"` }

/* ── WHO helpers ─────────────────────────────────────────────────────────── */
function classColor(cls) {
  return cls === 'osteoporosis' ? C.red : cls === 'osteopenia' ? C.amber : C.greenLt
}
function classBg(cls, P) {
  return cls === 'osteoporosis' ? P.statusAlert : cls === 'osteopenia' ? P.statusWarn : P.statusGood
}
function classLabel(cls) {
  return cls === 'osteoporosis' ? 'Osteoporosis' : cls === 'osteopenia' ? 'Osteopenia' : 'Normal Bone Density'
}
function classBadge(cls) {
  const c = classColor(cls)
  return `<span class="tag" ${st(`color:${c};background:${c}22;border:1px solid ${c}44`)}>${classLabel(cls)}</span>`
}

/* ── T-score bar ─────────────────────────────────────────────────────────── */
function tScoreBar(t, P) {
  const pct = Math.min(Math.max(((t + 4) / 8) * 100, 1), 99)
  return `
  <div ${st('position:relative;margin-bottom:8px')}>
    <div ${st('display:flex;height:22px;border-radius:5px;overflow:hidden')}>
      <div ${st(`width:18.75%;background:${C.red};display:flex;align-items:center;justify-content:center`)}>
        <span ${st('font-size:8px;color:#fff;font-weight:700')}>Osteoporosis</span></div>
      <div ${st(`width:18.75%;background:${C.amber};display:flex;align-items:center;justify-content:center`)}>
        <span ${st('font-size:8px;color:#fff;font-weight:700')}>Osteopenia</span></div>
      <div ${st(`width:62.5%;background:${C.greenLt};display:flex;align-items:center;justify-content:center`)}>
        <span ${st('font-size:8px;color:#fff;font-weight:700')}>Normal</span></div>
    </div>
    <div ${st(`position:absolute;left:${pct}%;top:-5px;width:4px;height:32px;background:${P.text};border-radius:2px;transform:translateX(-50%);box-shadow:0 0 4px rgba(0,0,0,.5)`)}></div>
  </div>
  <div ${st(`display:flex;justify-content:space-between;font-size:9px;color:${P.gray}`)}>
    <span>−4</span><span>−2.5</span><span>−1</span><span>0</span><span>+4</span>
  </div>`
}

/* ── BMD table ───────────────────────────────────────────────────────────── */
function bmdRow(site, r, isTotal, P) {
  const tColor   = r.T == null ? P.gray : r.T <= -2.5 ? C.red : r.T <= -1 ? C.amber : C.greenLt
  const zColor   = r.Z == null ? P.gray : r.Z <= -2.0 ? C.red : C.greenLt
  const bmdColor = r.bmd > 0.9 ? C.greenLt : r.bmd > 0.7 ? C.amber : C.red
  const tSign    = r.T != null && r.T >= 0 ? '+' : ''
  const zSign    = r.Z != null && r.Z >= 0 ? '+' : ''
  const rowBg    = isTotal ? `background:${P.cardHighlight};font-weight:700` : ''
  return `<tr ${st(rowBg)}>
    <td style="padding:8px 10px;font-size:11px;color:${isTotal ? P.text : P.grayLt};font-weight:${isTotal ? 700 : 500};border-bottom:1px solid ${P.border}">${esc(site)}</td>
    <td style="padding:8px 10px;font-size:11px;font-family:monospace;text-align:right;color:${bmdColor};border-bottom:1px solid ${P.border}">${r.bmd.toFixed(3)}</td>
    <td style="padding:8px 10px;font-size:11px;font-family:monospace;text-align:right;color:${tColor};border-bottom:1px solid ${P.border}">${r.T != null ? tSign + r.T.toFixed(1) : '—'}</td>
    <td style="padding:8px 10px;font-size:11px;font-family:monospace;text-align:right;color:${zColor};border-bottom:1px solid ${P.border}">${r.Z != null ? zSign + r.Z.toFixed(1) : '—'}</td>
    <td style="padding:8px 10px;font-size:10px;text-align:right;color:${P.gray};border-bottom:1px solid ${P.border}">${r.pYA != null ? r.pYA.toFixed(0) + '%' : '—'}</td>
  </tr>`
}

function bmdTable(rows, P) {
  return `
  <table style="width:100%;border-collapse:collapse">
    <thead>
      <tr style="border-bottom:2px solid ${P.border}">
        <th style="padding:6px 10px;font-size:10px;font-weight:700;color:${P.gray};text-align:left;text-transform:uppercase;letter-spacing:.5px">Region</th>
        <th style="padding:6px 10px;font-size:10px;font-weight:700;color:${P.gray};text-align:right;text-transform:uppercase;letter-spacing:.5px">BMD g/cm²</th>
        <th style="padding:6px 10px;font-size:10px;font-weight:700;color:${P.gray};text-align:right;text-transform:uppercase;letter-spacing:.5px">T-Score</th>
        <th style="padding:6px 10px;font-size:10px;font-weight:700;color:${P.gray};text-align:right;text-transform:uppercase;letter-spacing:.5px">Z-Score</th>
        <th style="padding:6px 10px;font-size:10px;font-weight:700;color:${P.gray};text-align:right;text-transform:uppercase;letter-spacing:.5px">% Young Adult</th>
      </tr>
    </thead>
    <tbody>
      ${rows.filter(([, r]) => r != null).map(([site, r, total]) => bmdRow(site, r, total, P)).join('')}
    </tbody>
  </table>
  <div style="font-size:9px;color:${P.gray};margin-top:6px">
    BMD: <span style="color:${C.greenLt}">■</span> &gt;0.9 · <span style="color:${C.amber}">■</span> 0.7–0.9 · <span style="color:${C.red}">■</span> &lt;0.7 g/cm² &nbsp;·&nbsp;
    T-Score: <span style="color:${C.greenLt}">■</span> ≥−1.0 Normal · <span style="color:${C.amber}">■</span> −1 to −2.5 Osteopenia · <span style="color:${C.red}">■</span> ≤−2.5 Osteoporosis
  </div>`
}

/* ── Header ──────────────────────────────────────────────────────────────── */
function header(pt, title, P, lh, pageNum, total) {
  const pgTag = `<span ${st(`font-size:10px;font-weight:500;color:${P.gray}`)}>Page ${pageNum} / ${total}</span>`
  const logoRow = lh ? '' : `
    <div ${st(`display:flex;justify-content:space-between;align-items:center;padding-bottom:8px;margin-bottom:8px;border-bottom:1px solid ${P.border}`)}>
      <img src="/sdrc-logo.png" alt="SDRC Diagnostics" class="sdrc-logo" ${st('height:36px;width:auto;border-radius:4px')}>
      <div ${st(`text-align:right;font-size:10px;color:${P.gray};line-height:1.7`)}>
        <div ${st(`color:${P.text};font-weight:700;font-size:11px`)}>${esc(pt.name)}</div>
        <div>${esc(pt.gender)} · ${pt.age}y · ${pt.height_cm} cm · ${pt.weight_kg} kg</div>
        <div>MRN: ${esc(pt.id)} · Scan: ${esc(pt.scan_date)} ${esc(pt.scan_time)}</div>
      </div>
    </div>`

  const inner = lh
    ? `<div ${st('display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px')}>
        <div ${st(`font-size:20px;font-weight:800;color:${P.text}`)}>${esc(title)}</div>
        <div ${st('display:flex;align-items:baseline;gap:14px')}>
          <div ${st(`font-size:10px;color:${P.gray}`)}>
            <span ${st(`color:${P.text};font-weight:700`)}>${esc(pt.name)}</span>
            · MRN: ${esc(pt.id)} · ${esc(pt.gender)} · ${pt.age}y · Scan ${esc(pt.scan_date)}
          </div>
          ${pgTag}
        </div>
      </div>`
    : `<div ${st('display:flex;justify-content:space-between;align-items:baseline')}>
        <div ${st(`font-size:20px;font-weight:800;color:${P.text}`)}>${esc(title)}</div>
        ${pgTag}
      </div>`

  return `
  <div ${st('margin-bottom:12px;flex-shrink:0')}>
    ${logoRow}
    <div ${st(`border-bottom:2px solid ${C.teal};padding-bottom:6px`)}>${inner}</div>
  </div>`
}

/* ── Footnotes ───────────────────────────────────────────────────────────── */
function scanFootnotes(lines, P) {
  return `
  <div ${st(`margin-top:auto;padding-top:8px;border-top:1px solid ${P.border};font-size:8.5px;color:${P.gray};line-height:1.8;flex-shrink:0`)}>
    ${lines.map((l, i) => `<span>${i + 1}. ${l}</span>`).join(' &nbsp;·&nbsp; ')}
  </div>`
}

/* ── BMD Reference Chart ─────────────────────────────────────────────────── */
function bmdRefChart(age, bmd, site, P) {
  if (age == null || bmd == null) return ''

  const W = 230, H = 108
  const ml = 28, mr = 4, mt = 4, mb = 18
  const cW = W - ml - mr, cH = H - mt - mb

  const AGE_MIN = 20, AGE_MAX = 90
  const isSpine = site !== 'hip'
  const BMD_MIN = isSpine ? 0.55 : 0.40
  const BMD_MAX = isSpine ? 1.32 : 1.15

  const xp = a => ml + (a - AGE_MIN) / (AGE_MAX - AGE_MIN) * cW
  const yp = b => mt + (1 - (b - BMD_MIN) / (BMD_MAX - BMD_MIN)) * cH

  // GE Lunar DPX reference values (back-calculated from GE Lunar normative DB).
  // Hologic/NHANES-III femoral neck peak is ~0.858 — GE Lunar runs ~10% higher.
  const [peak, sd] = isSpine ? [1.048, 0.110] : [0.951, 0.102]
  const t0  = peak
  const t1  = peak - sd
  const t2  = peak - 2 * sd
  const t25 = peak - 2.5 * sd

  function band(bmdTop, bmdBot, fill) {
    const y1 = Math.max(yp(Math.min(bmdTop, BMD_MAX)), mt)
    const y2 = Math.min(yp(Math.max(bmdBot, BMD_MIN)), mt + cH)
    if (y2 <= y1 + 0.5) return ''
    return `<rect x="${ml}" y="${y1.toFixed(1)}" width="${cW}" height="${(y2 - y1).toFixed(1)}" fill="${fill}"/>`
  }

  const spineRef = [[20,1.026],[30,1.048],[40,1.015],[50,0.968],[55,0.940],[60,0.896],[65,0.858],[70,0.820],[75,0.782],[80,0.745],[90,0.700]]
  // GE Lunar femoral neck population mean by age (NHANES III scaled to GE Lunar calibration, ×1.108)
  const neckRef  = [[20,0.948],[30,0.951],[40,0.929],[50,0.884],[55,0.846],[60,0.807],[65,0.772],[70,0.737],[75,0.701],[80,0.665],[90,0.615]]
  const ref = isSpine ? spineRef : neckRef
  const refPts = ref.map(([a, b]) => `${xp(a).toFixed(1)},${yp(b).toFixed(1)}`).join(' ')

  const dotX = Math.max(ml + 5, Math.min(ml + cW - 5, xp(age)))
  const dotY = Math.max(mt + 5, Math.min(mt + cH - 5, yp(bmd)))

  const xTicks = [20, 30, 40, 50, 60, 70, 80, 90]
  const yTicks = isSpine
    ? [[1.2,'1.2'],[1.1,'1.1'],[1.0,'1.0'],[0.9,'0.9'],[0.8,'0.8'],[0.7,'0.7'],[0.6,'0.6']]
    : [[1.1,'1.1'],[1.0,'1.0'],[0.9,'0.9'],[0.8,'0.8'],[0.7,'0.7'],[0.6,'0.6'],[0.5,'0.5']]

  function hline(bmdVal, color, dash) {
    if (bmdVal < BMD_MIN || bmdVal > BMD_MAX) return ''
    const y = yp(bmdVal).toFixed(1)
    return `<line x1="${ml}" y1="${y}" x2="${(ml + cW).toFixed(1)}" y2="${y}" stroke="${color}" stroke-width="0.8" stroke-dasharray="${dash}"/>`
  }
  function lineLabel(bmdVal, text, color) {
    if (bmdVal < BMD_MIN || bmdVal > BMD_MAX) return ''
    return `<text x="${(ml + cW + 3).toFixed(1)}" y="${(yp(bmdVal) + 2).toFixed(1)}" font-size="6" fill="${color}" font-weight="600">${text}</text>`
  }

  const totalW = W + 38
  return `
  <div ${st('flex-shrink:0')}>
    <div ${st(`font-size:7px;font-weight:600;color:${P.gray};margin-bottom:2px;text-transform:uppercase;letter-spacing:.5px`)}>Densitometry Reference — ${isSpine ? 'AP Spine L1–L4' : 'Femoral Neck'}</div>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW} ${H}" width="${totalW}" height="${H}" style="display:block">
      <rect x="${ml}" y="${mt}" width="${cW}" height="${cH}" fill="#f9fafb"/>
      ${band(BMD_MAX, t0,   '#2E7D3218')}
      ${band(t0,      t1,   '#4CAF5020')}
      ${band(t1,      t2,   '#E6510020')}
      ${band(t2,      t25,  '#E6510042')}
      ${band(t25,     BMD_MIN, '#B71C1C32')}
      ${xTicks.map(a => `<line x1="${xp(a).toFixed(1)}" y1="${mt}" x2="${xp(a).toFixed(1)}" y2="${(mt + cH).toFixed(1)}" stroke="#ddd" stroke-width="0.5"/>`).join('')}
      ${yTicks.map(([bv]) => `<line x1="${ml}" y1="${yp(bv).toFixed(1)}" x2="${(ml + cW).toFixed(1)}" y2="${yp(bv).toFixed(1)}" stroke="#ddd" stroke-width="0.5"/>`).join('')}
      ${hline(t0,  '#2E7D32', '3,2')}
      ${hline(t1,  '#E65100', '3,2')}
      ${hline(t2,  '#B71C1C', '3,2')}
      ${hline(t25, '#8B0000', '2,2')}
      <polyline points="${refPts}" fill="none" stroke="#555" stroke-width="1.3" stroke-dasharray="4,3" opacity="0.6"/>
      <rect x="${ml}" y="${mt}" width="${cW}" height="${cH}" fill="none" stroke="#bbb" stroke-width="0.8"/>
      ${yTicks.map(([bv, label]) => `<text x="${(ml - 3).toFixed(1)}" y="${(yp(bv) + 2.5).toFixed(1)}" text-anchor="end" font-size="6.5" fill="#888">${label}</text>`).join('')}
      <text x="8" y="${(mt + cH / 2).toFixed(1)}" text-anchor="middle" font-size="6.5" fill="#666" transform="rotate(-90,8,${(mt + cH / 2).toFixed(1)})">g/cm²</text>
      ${xTicks.map(a => `<text x="${xp(a).toFixed(1)}" y="${(mt + cH + 10).toFixed(1)}" text-anchor="middle" font-size="6.5" fill="#888">${a}</text>`).join('')}
      <text x="${(ml + cW / 2).toFixed(1)}" y="${H}" text-anchor="middle" font-size="6.5" fill="#666">Age (years)</text>
      ${lineLabel(t0,  'T = 0',    '#2E7D32')}
      ${lineLabel(t1,  'T = −1',   '#E65100')}
      ${lineLabel(t2,  'T = −2',   '#B71C1C')}
      ${lineLabel(t25, 'T = −2.5', '#8B0000')}
      <circle cx="${dotX.toFixed(1)}" cy="${dotY.toFixed(1)}" r="5" fill="white" stroke="#0D7377" stroke-width="2"/>
      <circle cx="${dotX.toFixed(1)}" cy="${dotY.toFixed(1)}" r="2.5" fill="#0D7377"/>
      <text x="${dotX.toFixed(1)}" y="${(dotY - 8).toFixed(1)}" text-anchor="middle" font-size="7" fill="#0D7377" font-weight="700">${bmd.toFixed(3)}</text>
    </svg>
    <div ${st(`font-size:7.5px;color:${P.gray};margin-top:1px`)}>● Patient BMD &nbsp;·&nbsp; − − − Population mean (NHANES / GE Lunar white female norm)</div>
  </div>`
}

/* ── Page 1: Spine ───────────────────────────────────────────────────────── */
function page1(data, P, lh, pageNum, total) {
  const { patient: pt, spine, summary, images } = data
  const spineTotal = spine['L1-L4']
  const spineT = summary.spine_t
  const cls = summary.spine_class

  const spineRows = [
    ['L1',    spine.L1,       false],
    ['L2',    spine.L2,       false],
    ['L3',    spine.L3,       false],
    ['L4',    spine.L4,       false],
    ['L1–L4', spine['L1-L4'], true ],
  ]

  const ageNote = summary.premenopausal
    ? `<div ${st(`font-size:10px;color:${C.amber};margin-top:8px;line-height:1.6;border-top:1px solid ${P.border};padding-top:8px`)}>
        ⚠ Patient is a premenopausal woman (&lt;50 years). WHO T-score criteria are defined for postmenopausal women and men ≥50.
        Z-score is the preferred diagnostic reference in this age group — values ≤−2.0 indicate "below expected range for age."
      </div>` : ''

  return `
<div class="page">
  ${header(pt, 'Spine Bone Density — AP Lumbar', P, lh, pageNum, total)}
  <div class="col" ${st('flex:1;gap:14px;min-height:0')}>
    <div class="card" ${st(`background:${classBg(cls, P)};flex-shrink:0`)}>
      <div class="row" ${st('align-items:flex-end;gap:24px;margin-bottom:14px')}>
        <div ${st('flex:1;display:flex;flex-direction:column')}>
          <div class="lbl">L1–L4 Total BMD</div>
          <div ${st(`font-size:9px;color:${P.gray};margin-top:2px`)}>AP lumbar spine bone mineral density</div>
          <div ${st('margin-top:8px')}>${classBadge(cls)}</div>
          <div ${st('display:flex;align-items:baseline;gap:5px;margin-top:14px')}>
            <span ${st(`font-size:46px;font-weight:800;color:${classColor(cls)};line-height:1`)}>${spineTotal?.bmd.toFixed(3) ?? '—'}</span>
            <span ${st(`font-size:11px;color:${P.gray}`)}>g/cm²</span>
          </div>
        </div>
        ${spineT != null ? `
        <div ${st('display:flex;flex-direction:column')}>
          <div class="lbl">T-Score</div>
          <div ${st(`font-size:9px;color:${P.gray};margin-top:2px`)}>vs peak bone mass (age 30)</div>
          <div ${st('flex:1;min-height:12px')}></div>
          <div ${st(`font-size:38px;font-weight:800;color:${classColor(cls)};line-height:1;margin-top:4px`)}>${spineT >= 0 ? '+' : ''}${spineT.toFixed(1)}</div>
        </div>
        <div ${st('display:flex;flex-direction:column')}>
          <div class="lbl">Z-Score</div>
          <div ${st(`font-size:9px;color:${P.gray};margin-top:2px`)}>vs same age &amp; sex peers</div>
          <div ${st('flex:1;min-height:12px')}></div>
          <div ${st(`font-size:38px;font-weight:800;color:${summary.spine_z != null && summary.spine_z <= -2 ? C.red : C.greenLt};line-height:1;margin-top:4px`)}>${summary.spine_z != null ? (summary.spine_z >= 0 ? '+' : '') + summary.spine_z.toFixed(1) : '—'}</div>
        </div>` : ''}
      </div>
      <div ${st('display:flex;gap:16px;align-items:flex-start')}>
        <div ${st('flex:1;min-width:0')}>
          ${spineT != null ? tScoreBar(spineT, P) : ''}
          ${ageNote}
        </div>
        ${spineTotal ? bmdRefChart(pt.age, spineTotal.bmd, 'spine', P) : ''}
      </div>
    </div>
    <div class="row" ${st('gap:14px;flex:1;min-height:0;align-items:flex-start')}>
      <div ${st('flex-shrink:0;display:flex;flex-direction:column;gap:6px;align-items:center')}>
        <img src="${images.spine_overlay_url || images.spine_url}" alt="Spine scan"
             ${st('max-height:320px;max-width:180px;width:auto;height:auto;border-radius:8px;display:block')}
             onerror="if(this.src!=='${images.spine_url}'){this.src='${images.spine_url}';this.onerror=null}else{this.style.display='none'}">
        <div ${st(`font-size:9px;color:${P.gray};letter-spacing:.4px;text-align:center`)}>AP Lumbar Spine</div>
        <div ${st(`font-size:8px;color:${P.gray};opacity:.7;letter-spacing:.3px;text-align:center`)}>Image not for diagnosis</div>
      </div>
      <div class="card" ${st('flex:1')}>
        <div class="sec">L1–L4 Vertebral Detail</div>
        ${bmdTable(spineRows, P)}
      </div>
    </div>
    ${scanFootnotes([
      'Precision (LSC): ±0.010 g/cm² for AP Spine L1–L4 (68% CI; repeat scans within this range may reflect measurement variability)',
      'Reference: USA NHANES + GE Lunar (ages 20–40) AP Spine normative database. T-scores may not reflect Indian population norms.',
    ], P)}
  </div>
</div>`
}

/* ── Page 2: Dual Femur ──────────────────────────────────────────────────── */
function page2(data, P, lh, pageNum, total) {
  const { patient: pt, left_femur: lf, right_femur: rf, summary, images } = data
  const hasLeft  = Object.keys(lf).length > 0
  const hasRight = Object.keys(rf).length > 0

  const lfRows = [
    ['Neck',       lf.Neck,       false],
    ['Trochanter', lf.Trochanter, false],
    ["Ward's",     lf.Wards,      false],
    ['Total',      lf.Total,      true ],
  ]
  const rfRows = [
    ['Neck',       rf.Neck,       false],
    ['Trochanter', rf.Trochanter, false],
    ["Ward's",     rf.Wards,      false],
    ['Total',      rf.Total,      true ],
  ]

  const hipSiteLabel = summary.lowest_hip_side
    ? (summary.hip_bilateral
        ? 'femoral neck bilaterally'
        : `${summary.lowest_hip_side} femoral neck`)
    : ''
  const lowestSideNote = summary.lowest_hip_t != null
    ? `ISCD diagnostic T-score: <strong ${st(`color:${classColor(summary.overall_class)}`)}>${summary.lowest_hip_t >= 0 ? '+' : ''}${summary.lowest_hip_t.toFixed(1)}</strong>${hipSiteLabel ? ` — ${hipSiteLabel}` : ''}`
    : ''

  const symmetry = summary.left_neck_t != null && summary.right_neck_t != null
    ? Math.abs(summary.left_neck_t - summary.right_neck_t)
    : null

  const lowestFemur = summary.lowest_hip_side === 'right' ? rf : lf
  const hipDotBmd = lowestFemur?.Neck?.bmd ?? lowestFemur?.Total?.bmd ?? null

  return `
<div class="page">
  ${header(pt, 'Hip Bone Density — Dual Femur', P, lh, pageNum, total)}
  <div class="col" ${st('flex:1;gap:14px;min-height:0')}>
    <div class="card" ${st(`background:${classBg(summary.overall_class, P)};flex-shrink:0`)}>
      <div class="row" ${st('align-items:flex-end;gap:24px;margin-bottom:10px')}>
        <div ${st('flex:1')}>
          <div class="lbl">Hip Classification</div>
          <div ${st('margin-top:8px')}>${classBadge(summary.overall_class)}</div>
          <div ${st(`font-size:11px;color:${P.gray};margin-top:8px;line-height:1.6`)}>${lowestSideNote}</div>
          ${symmetry != null ? `
          <div ${st(`font-size:10px;color:${symmetry > 0.5 ? C.amber : P.gray};margin-top:4px`)}>
            L/R Neck symmetry: Δ${symmetry.toFixed(1)} T-score
            ${symmetry > 0.5 ? '— asymmetry &gt;0.5 warrants clinical attention' : ''}
          </div>` : ''}
        </div>
        ${summary.lowest_hip_t != null ? `
        <div ${st('display:flex;flex-direction:column')}>
          <div class="lbl">ISCD Diagnostic Hip T-Score</div>
          <div ${st(`font-size:9px;color:${P.gray};margin-top:2px`)}>Femoral Neck / Total Hip only</div>
          <div ${st('flex:1;min-height:12px')}></div>
          <div ${st(`font-size:38px;font-weight:800;color:${classColor(summary.overall_class)};line-height:1;margin-top:4px`)}>${summary.lowest_hip_t >= 0 ? '+' : ''}${summary.lowest_hip_t.toFixed(1)}</div>
        </div>` : ''}
      </div>
      <div ${st('display:flex;gap:16px;align-items:flex-start')}>
        <div ${st('flex:1;min-width:0')}>
          ${summary.lowest_hip_t != null ? tScoreBar(summary.lowest_hip_t, P) : ''}
        </div>
        ${hipDotBmd != null ? bmdRefChart(pt.age, hipDotBmd, 'hip', P) : ''}
      </div>
    </div>
    <div class="row" ${st('gap:14px;flex-shrink:0')}>
      ${hasLeft ? `
      <div ${st('flex:1;display:flex;flex-direction:column;align-items:center;gap:4px')}>
        <div ${st('height:200px;width:100%;display:flex;align-items:center;justify-content:center')}>
          <img src="${images.left_femur_overlay_url || images.left_femur_url}" alt="Left femur"
               ${st('width:100%;height:100%;object-fit:contain;display:block;border-radius:8px')}
               onerror="if(this.src!=='${images.left_femur_url}'){this.src='${images.left_femur_url}';this.onerror=null}else{this.style.display='none'}">
        </div>
        <div ${st(`font-size:9px;color:${P.gray};letter-spacing:.4px`)}>Left Femur</div>
        <div ${st(`font-size:8px;color:${P.gray};opacity:.7;letter-spacing:.3px`)}>Image not for diagnosis</div>
      </div>` : ''}
      ${hasRight ? `
      <div ${st('flex:1;display:flex;flex-direction:column;align-items:center;gap:4px')}>
        <div ${st('height:200px;width:100%;display:flex;align-items:center;justify-content:center')}>
          <img src="${images.right_femur_overlay_url || images.right_femur_url}" alt="Right femur"
               ${st('width:100%;height:100%;object-fit:contain;display:block;border-radius:8px')}
               onerror="if(this.src!=='${images.right_femur_url}'){this.src='${images.right_femur_url}';this.onerror=null}else{this.style.display='none'}">
        </div>
        <div ${st(`font-size:9px;color:${P.gray};letter-spacing:.4px`)}>Right Femur</div>
        <div ${st(`font-size:8px;color:${P.gray};opacity:.7;letter-spacing:.3px`)}>Image not for diagnosis</div>
      </div>` : ''}
    </div>
    <div class="row" ${st('gap:14px;flex-shrink:0')}>
      ${hasLeft ? `
      <div class="card" ${st('flex:1')}>
        <div class="sec">Left Femur</div>
        ${bmdTable(lfRows, P)}
      </div>` : ''}
      ${hasRight ? `
      <div class="card" ${st('flex:1')}>
        <div class="sec">Right Femur</div>
        ${bmdTable(rfRows, P)}
      </div>` : ''}
    </div>
    <div class="card" ${st('flex-shrink:0')}>
      <div class="sec">Understanding Hip Scores</div>
      <div class="row" ${st('gap:10px')}>
        <div ${st(`flex:1;background:${P.bg};border-radius:6px;padding:6px 10px;font-size:9px;color:${P.gray};line-height:1.55`)}>
          <strong ${st(`color:${P.text}`)}>ISCD 2019:</strong> Only Femoral Neck and Total Hip are used for WHO classification.
          Trochanter and Ward's Triangle are shown for completeness but are <em>not</em> diagnostic sites —
          their lower T-scores do not change the classification.
        </div>
        <div ${st(`flex:1;background:${P.bg};border-radius:6px;padding:6px 10px;font-size:9px;color:${P.gray};line-height:1.55`)}>
          <strong ${st(`color:${P.text}`)}>Z-Score ≤ −2.0</strong> indicates "below expected range for age and sex" and warrants
          investigation for secondary causes regardless of T-score. Relevant especially for premenopausal women and men under 50.
        </div>
      </div>
    </div>
    ${scanFootnotes([
      'Precision (LSC): ±0.012 g/cm² for Femoral Total (68% CI; repeat scans within this range may reflect measurement variability)',
      'Reference: USA NHANES + GE Lunar (ages 20–40) Femur normative database. T-scores may not reflect Indian population norms.',
    ], P)}
  </div>
</div>`
}

/* ── Page 3: Clinical Summary ────────────────────────────────────────────── */
function fatPctBar(fatPct, gender, P) {
  if (fatPct == null) return ''
  const isFemale = !gender || gender.toLowerCase().startsWith('f')
  const zones = isFemale
    ? [{ w: 26, label: 'Athletic', color: C.tealLt },
       { w: 36, label: 'Normal',   color: C.greenLt },
       { w: 18, label: 'High',     color: C.amber },
       { w: 20, label: 'Obese',    color: C.red }]
    : [{ w: 23, label: 'Athletic', color: C.tealLt },
       { w: 28, label: 'Normal',   color: C.greenLt },
       { w: 18, label: 'High',     color: C.amber },
       { w: 31, label: 'Obese',    color: C.red }]
  const maxPct = 50
  const markerPct = Math.min(Math.max(fatPct / maxPct * 100, 1), 99)
  const ticks = isFemale ? ['0', '21%', '33%', '39%', '50%'] : ['0', '14%', '25%', '31%', '50%']
  const zonesBars = zones.map(z => `
    <div ${st(`width:${z.w}%;background:${z.color}55`)}></div>`).join('')
  return `
  <div>
    <div ${st(`font-size:8.5px;color:${P.gray};font-weight:600;margin-bottom:3px`)}>Body Fat %</div>
    <div ${st('position:relative;margin-bottom:2px')}>
      <div ${st(`display:flex;height:10px;border-radius:3px;overflow:hidden;border:1px solid ${P.border}`)}>${zonesBars}</div>
      <div ${st(`position:absolute;left:${markerPct}%;top:-3px;width:2px;height:16px;background:${P.text};border-radius:1px;transform:translateX(-50%)`)}></div>
    </div>
    <div ${st(`display:flex;justify-content:space-between;font-size:7.5px;color:${P.gray}`)}>
      ${ticks.map(t => `<span>${t}</span>`).join('')}
    </div>
    <div ${st(`font-size:7.5px;color:${P.gray};margin-top:2px`)}>
      ${zones.map(z => `<span ${st(`display:inline-block;margin-right:8px`)}><span ${st(`display:inline-block;width:8px;height:8px;border-radius:2px;background:${z.color}55;border:1px solid ${z.color};vertical-align:middle;margin-right:2px`)}></span>${z.label}</span>`).join('')}
    </div>
  </div>`
}

function agBar(agRatio, gender, P) {
  if (agRatio == null) return ''
  const isFemale = !gender || gender.toLowerCase().startsWith('f')
  const threshold = isFemale ? 0.8 : 1.0
  const risk = parseFloat(agRatio) > threshold
  const riskColor = risk ? C.red : C.greenLt
  const riskLabel = risk ? 'Central Obesity' : 'Normal Distribution'
  const markerPct = Math.min(parseFloat(agRatio) / 1.6 * 100, 99)
  return `
  <div>
    <div ${st(`font-size:8.5px;color:${P.gray};font-weight:600;margin-bottom:3px`)}>Android/Gynoid Ratio</div>
    <div ${st('position:relative;margin-bottom:2px')}>
      <div ${st(`display:flex;height:10px;border-radius:3px;overflow:hidden;border:1px solid ${P.border}`)}>
        <div ${st(`width:${isFemale ? 53 : 50}%;background:${C.greenLt}55`)}></div>
        <div ${st(`width:${isFemale ? 47 : 50}%;background:${C.red}55`)}></div>
      </div>
      <div ${st(`position:absolute;left:${markerPct}%;top:-3px;width:2px;height:16px;background:${P.text};border-radius:1px;transform:translateX(-50%)`)}></div>
    </div>
    <div ${st(`display:flex;align-items:center;gap:8px;margin-top:2px`)}>
      <span ${st(`font-size:13px;font-weight:700;color:${riskColor};line-height:1`)}>${agRatio}</span>
      <span ${st(`font-size:7.5px;font-weight:600;color:${riskColor}`)}>${riskLabel}</span>
      <span ${st(`font-size:7.5px;color:${P.gray};margin-left:auto`)}>Threshold &gt;${threshold}</span>
    </div>
  </div>`
}

function compCard(comp, pt, P) {
  if (!comp) return ''
  const gender = pt?.gender || ''
  const ag_ratio = comp.android_fat_pct != null && comp.gynoid_fat_pct != null && comp.gynoid_fat_pct > 0
    ? (comp.android_fat_pct / comp.gynoid_fat_pct).toFixed(2) : null
  const fmt1 = v => v != null ? v.toFixed(1) : null

  const statItems = [
    { label: 'Body Fat %',  val: comp.fat_pct   != null ? comp.fat_pct.toFixed(1) + '%'  : null },
    { label: 'Android Fat', val: comp.android_fat_pct != null ? comp.android_fat_pct.toFixed(1) + '%' : null },
    { label: 'Gynoid Fat',  val: comp.gynoid_fat_pct  != null ? comp.gynoid_fat_pct.toFixed(1) + '%'  : null },
    ...(!comp.is_estimated ? [
      { label: 'Total Fat',  val: comp.fat_kg  != null ? comp.fat_kg + ' kg'  : null },
      { label: 'Lean Mass',  val: comp.lean_kg != null ? comp.lean_kg + ' kg' : null },
      { label: 'FMI',        val: fmt1(comp.fmi),  unit: 'kg/m²' },
      { label: 'LMI',        val: fmt1(comp.lmi),  unit: 'kg/m²' },
    ] : []),
  ].filter(it => it.val != null)

  const subtitle = comp.is_estimated
    ? 'GE Lunar estimated from AP Spine + Femur analysis — not a full body composition scan'
    : 'GE Lunar total body DXA composition'

  return `
  <div ${st(`background:${P.card};border:1px solid ${P.border};border-radius:8px;padding:12px 16px;margin-bottom:12px`)}>
    <div ${st(`font-size:12px;font-weight:700;color:${P.text};margin-bottom:2px`)}>Estimated Body Composition</div>
    <div ${st(`font-size:9px;color:${P.gray};margin-bottom:10px`)}>${subtitle}</div>
    <div ${st('display:grid;grid-template-columns:repeat(4,1fr);gap:4px 12px;margin-bottom:10px')}>
      ${statItems.map(it => `
        <div>
          <div ${st(`font-size:8.5px;color:${P.gray}`)}>${it.label}</div>
          <div ${st(`font-size:12px;font-weight:700;color:${P.text}`)}>${it.val}${it.unit ? `<span ${st(`font-size:8px;font-weight:400;color:${P.gray};margin-left:2px`)}>${it.unit}</span>` : ''}</div>
        </div>`).join('')}
    </div>
    <div ${st('display:grid;grid-template-columns:1fr 1fr;gap:10px 16px')}>
      ${fatPctBar(comp.fat_pct, gender, P)}
      ${agBar(ag_ratio, gender, P)}
    </div>
  </div>`
}

function page3(data, P, lh, pageNum, total) {
  const { patient: pt, summary } = data
  const cls = summary.overall_class
  const clsColor = classColor(cls)

  const recommendations = []

  if (summary.premenopausal) {
    recommendations.push({
      status: cls === 'normal' ? 'good' : 'alert',
      title:  `Bone Status: ${cls === 'normal' ? 'Normal' : 'Below Expected Range for Age'}`,
      body:   `Z-Score ${summary.spine_z?.toFixed(1) ?? '—'} (spine) — premenopausal women under 50 are assessed by Z-score, not T-score. Z ≤ −2.0 indicates bone density below expected range and warrants secondary cause investigation.`,
    })
  } else {
    recommendations.push({
      status: cls === 'osteoporosis' ? 'alert' : cls === 'osteopenia' ? 'warn' : 'good',
      title:  `WHO Classification: ${classLabel(cls)}`,
      body:   cls === 'osteoporosis'
        ? `T-score ${summary.spine_t?.toFixed(1) ?? summary.lowest_hip_t?.toFixed(1) ?? '—'} — meets WHO criterion for osteoporosis (T ≤ −2.5). Clinical correlation and FRAX fracture risk assessment strongly recommended.`
        : cls === 'osteopenia'
          ? `T-score indicates reduced bone mass. Lifestyle optimisation (calcium, vitamin D, weight-bearing exercise) advised. Recheck in 1–2 years.`
          : `T-score within normal range. Maintain bone health with adequate calcium (1000–1200 mg/day), vitamin D (600–800 IU/day), and weight-bearing exercise.`,
    })
  }

  if (cls === 'osteoporosis') {
    recommendations.push({
      status: 'alert',
      title:  'FRAX Assessment Recommended',
      body:   `T-score in the osteoporotic range. FRAX (WHO fracture risk assessment tool) should be calculated to quantify 10-year fracture probability and guide treatment decisions.`,
    })
    recommendations.push({
      status: 'alert',
      title:  'Pharmacological Review',
      body:   `Bisphosphonates (alendronate, risedronate) or other anti-resorptive agents may be clinically indicated. Discussion with treating clinician or endocrinologist recommended.`,
    })
  }

  recommendations.push({
    status: 'info',
    title:  'Calcium & Vitamin D',
    body:   cls === 'osteoporosis'
      ? `Ensure Calcium 1200 mg/day + Vitamin D 1000–2000 IU/day. Measure serum 25-OHD to confirm sufficiency. Supplement if dietary intake is insufficient.`
      : `Calcium 1000–1200 mg/day (diet preferred; supplement if needed). Vitamin D 600–800 IU/day. Annual 25-OHD check recommended.`,
  })

  recommendations.push({
    status: 'info',
    title:  'Exercise Prescription',
    body:   cls === 'osteoporosis'
      ? `Progressive resistance training to stimulate bone remodelling. Balance training and fall prevention programme recommended. Avoid high-impact activities that risk fragility fracture until treatment is established.`
      : `Weight-bearing aerobic exercise (walking, jogging) plus resistance training 2–3× per week. Both are independently beneficial for bone mineral density maintenance.`,
  })

  if (summary.premenopausal || (summary.spine_z != null && summary.spine_z <= -2)) {
    recommendations.push({
      status: 'warn',
      title:  'Secondary Cause Workup',
      body:   `Z-score below expected range for age. Consider secondary causes: malabsorption (coeliac, IBD), vitamin D deficiency, hypogonadism, hyperparathyroidism, thyroid disease, steroid use, or low body weight.`,
    })
  }

  recommendations.push({
    status: 'info',
    title:  'Follow-up DXA',
    body:   cls === 'osteoporosis'
      ? `Repeat DXA in 1–2 years to monitor treatment response. Earlier if pharmacological therapy is initiated.`
      : cls === 'osteopenia'
        ? `Repeat DXA in 1–2 years. Sooner if risk factors develop or treatment is started.`
        : `Repeat DXA in 2–3 years or when risk factors change.`,
  })

  const statusStyles = {
    good:  { bg: P.statusGood,  border: C.greenLt },
    warn:  { bg: P.statusWarn,  border: C.amber   },
    alert: { bg: P.statusAlert, border: C.red     },
    info:  { bg: P.statusInfo,  border: C.tealLt  },
  }
  const cards = recommendations.map(item => {
    const s = statusStyles[item.status] ?? { bg: P.card, border: P.border }
    return `
    <div ${st(`background:${s.bg};border:1px solid ${s.border}40;border-left:4px solid ${s.border};border-radius:6px;padding:14px 18px`)}>
      <div ${st(`font-size:13px;font-weight:700;color:${s.border};margin-bottom:5px`)}>${item.title}</div>
      <div ${st(`font-size:11px;color:${P.grayLt};line-height:1.65`)}>${item.body}</div>
    </div>`
  }).join('')

  const foot = `
  <div ${st(`flex-shrink:0;margin-top:10px;border-top:1px solid ${P.border};padding-top:7px;font-size:9px;color:${P.gray};line-height:1.7`)}>
    WHO criteria (T ≤−2.5 osteoporosis, −2.5&lt;T≤−1.0 osteopenia) apply to postmenopausal women and men ≥50.
    South Asian-specific normative data not available on GE Lunar DPX-NT — benchmarked against White/Caucasian population.
    Scanner ${esc(pt.scanner)} · ${esc(pt.software)} · Scan ${esc(pt.scan_date)} · For clinical use only — interpret with a qualified clinician.
  </div>`

  const lowestT = summary.lowest_hip_t ?? summary.spine_t
  return `
<div class="page">
  ${header(pt, 'Clinical Summary & Recommendations', P, lh, pageNum, total)}
  <div ${st(`flex-shrink:0;display:flex;align-items:center;gap:16px;padding:12px 16px;border-radius:8px;margin-bottom:14px;background:${clsColor}18;border:1px solid ${clsColor}44`)}>
    <div ${st(`font-size:36px;font-weight:800;color:${clsColor};line-height:1`)}>${classLabel(cls)}</div>
    <div ${st(`font-size:11px;color:${P.gray};line-height:1.7`)}>
      Lowest T-score: <strong ${st(`color:${clsColor}`)}>${lowestT != null ? (lowestT >= 0 ? '+' : '') + lowestT.toFixed(1) : '—'}</strong>
      &nbsp;·&nbsp; Spine L1–L4: ${summary.spine_t != null ? (summary.spine_t >= 0 ? '+' : '') + summary.spine_t.toFixed(1) : '—'}
      ${summary.lowest_hip_t != null ? `&nbsp;·&nbsp; Hip: ${(summary.lowest_hip_t >= 0 ? '+' : '') + summary.lowest_hip_t.toFixed(1)} (${summary.lowest_hip_side})` : ''}
    </div>
  </div>
  ${compCard(data.estimated_composition, pt, P)}
  <div ${st('flex:1;display:grid;grid-template-columns:1fr 1fr;grid-auto-rows:auto;align-content:start;gap:12px;min-height:0')}>
    ${cards}
  </div>
  ${foot}
</div>`
}

/* ── Entry point ─────────────────────────────────────────────────────────── */

/**
 * Generate the full 3-page HTML report.
 *
 * @param {object} data          - OsteoReportData from computeOsteoData()
 * @param {object} [opts]
 * @param {boolean} [opts.dark=false]        - Use dark palette
 * @param {boolean} [opts.letterhead=false]  - Letterhead margins / hide logo
 * @returns {string}  Full HTML document
 */
export function generateOsteoHtml(data, { dark = false, letterhead = false } = {}) {
  const P = dark && !letterhead ? darkPal : lightPal

  // Spine-only patients have no hip data — omit page 2 entirely
  const hasFemur = data.summary?.lowest_hip_t != null
    || Object.keys(data.left_femur  ?? {}).length > 0
    || Object.keys(data.right_femur ?? {}).length > 0

  const pages = hasFemur ? [page1, page2, page3] : [page1, page3]
  const totalPages = pages.length
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<title>BMD Report — ${esc(data.patient.name)}</title>
<style>${css(P, letterhead)}</style></head><body>
${pages.map((fn, i) => fn(data, P, letterhead, i + 1, totalPages)).join('')}
</body></html>`
}
