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

function css(P) {
  return `
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
  const tickPcts   = [0, 18.75, 37.5, 50, 100]
  const tickLabels = ['−4', '−2.5', '−1', '0', '+4']
  return `
  <div ${st('position:relative;margin-bottom:8px')}>
    <div ${st('display:flex;height:22px;border-radius:5px;overflow:hidden')}>
      <div ${st(`width:18.75%;background:${C.red}99;display:flex;align-items:center;justify-content:center`)}>
        <span ${st('font-size:8px;color:#fff;font-weight:700')}>Osteoporosis</span></div>
      <div ${st(`width:18.75%;background:${C.amber}99;display:flex;align-items:center;justify-content:center`)}>
        <span ${st('font-size:8px;color:#fff;font-weight:700')}>Osteopenia</span></div>
      <div ${st(`width:62.5%;background:${C.greenLt}99;display:flex;align-items:center;justify-content:center`)}>
        <span ${st('font-size:8px;color:#fff;font-weight:700')}>Normal</span></div>
    </div>
    <div ${st(`position:absolute;left:${pct}%;top:-5px;width:4px;height:32px;background:${P.text};border-radius:2px;transform:translateX(-50%);box-shadow:0 0 4px rgba(0,0,0,.5)`)}></div>
  </div>
  <div ${st('position:relative;height:14px')}>
    ${tickPcts.map((p, i) => {
      const anchor = i === 0 ? 'left' : i === tickPcts.length - 1 ? 'right' : ''
      const transform = anchor ? '' : 'transform:translateX(-50%)'
      const pos = anchor === 'right' ? 'right:0' : `left:${p}%`
      return `<span ${st(`position:absolute;${pos};${transform};font-size:9px;color:${P.gray}`)}>${tickLabels[i]}</span>`
    }).join('')}
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
  // Logo always rendered; visibility:hidden when letterhead (preserves layout space)
  const logoRow = `
    <div ${st(`display:flex;justify-content:space-between;align-items:center;padding-bottom:8px;margin-bottom:8px;border-bottom:1px solid ${P.border}`)}>
      <img src="https://www.sdrc.in/assets/sdrc-logo-full.png" alt="SDRC Diagnostics" ${st(`height:48px;width:auto;border-radius:4px${lh ? ';visibility:hidden' : ''}`)}>
      <div ${st(`text-align:right;font-size:10px;color:${P.gray};line-height:1.7`)}>
        <div ${st(`color:${P.text};font-weight:700;font-size:11px`)}>${esc(pt.name)}</div>
        <div>${esc(pt.gender)} · ${pt.age}y · ${pt.height_cm} cm · ${pt.weight_kg} kg</div>
        <div>MRN: ${esc(pt.id)} · Scan: ${esc(pt.scan_date)} ${esc(pt.scan_time)}</div>
      </div>
    </div>`

  const inner = `<div ${st('display:flex;justify-content:space-between;align-items:baseline')}>
      <div ${st(`font-size:20px;font-weight:600;color:${P.text}`)}>${esc(title)}</div>
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
  <div ${st(`padding-top:8px;border-top:1px solid ${P.border};font-size:8.5px;color:${P.gray};line-height:1.8;flex-shrink:0`)}>
    ${lines.map((l, i) => `<span>${i + 1}. ${l}</span>`).join(' &nbsp;·&nbsp; ')}
  </div>`
}

/* ── BMD Reference Chart ─────────────────────────────────────────────────── */
function bmdRefChart(age, bmd, site, gender, P) {
  if (age == null || bmd == null) return ''

  const male = (gender || '').toLowerCase().startsWith('m')
  const isSpine = site !== 'hip'

  const W = 230, H = 112
  const ml = 28, mr = 4, mt = 5, mb = 18
  const cW = W - ml - mr, cH = H - mt - mb

  const AGE_MIN = 20, AGE_MAX = 90
  const BMD_MIN = isSpine ? 0.60 : 0.40
  const BMD_MAX = isSpine ? 1.45 : 1.15

  const xp = a => ml + (a - AGE_MIN) / (AGE_MAX - AGE_MIN) * cW
  const yp = b => mt + (1 - (b - BMD_MIN) / (BMD_MAX - BMD_MIN)) * cH
  const cy = y => Math.max(mt, Math.min(mt + cH, y))

  // GE Lunar normative reference curves by site and sex
  // Spine female: NHANES III ×1.121 scaling, verified against SDRC data; male: approximate GE Lunar equivalents
  const spineRefF = [[20,1.150],[30,1.175],[40,1.138],[50,1.085],[55,1.054],[60,1.004],[65,0.962],[70,0.919],[75,0.877],[80,0.835],[90,0.785]]
  const spineRefM = [[20,1.180],[30,1.210],[40,1.185],[50,1.135],[55,1.100],[60,1.055],[65,1.010],[70,0.968],[75,0.925],[80,0.882],[90,0.830]]
  // Femoral neck female: NHANES III ×1.108 to GE Lunar calibration; male: approximate GE Lunar equivalents
  const neckRefF  = [[20,0.948],[30,0.951],[40,0.929],[50,0.884],[55,0.846],[60,0.807],[65,0.772],[70,0.737],[75,0.701],[80,0.665],[90,0.615]]
  const neckRefM  = [[20,0.980],[30,1.010],[40,0.990],[50,0.950],[55,0.920],[60,0.888],[65,0.855],[70,0.820],[75,0.783],[80,0.748],[90,0.695]]

  // Peak BMD and SD for T-score thresholds (young-adult reference)
  const [peak, sd] = isSpine
    ? (male ? [1.210, 0.135] : [1.175, 0.117])
    : (male ? [1.010, 0.120] : [0.951, 0.102])

  const tOst  = peak - sd        // T = −1  (Normal/Osteopenia boundary)
  const tOstP = peak - 2.5 * sd  // T = −2.5 (Osteopenia/Osteoporosis boundary)

  const ref = isSpine ? (male ? spineRefM : spineRefF) : (male ? neckRefM : neckRefF)

  function curvePts(kSD) {
    return ref.map(([a, b]) => [xp(a), yp(b - kSD * sd)])
  }
  const c0  = curvePts(0)    // population mean (solid blue)
  const c1  = curvePts(1)    // Z-score Normal/Osteopenia boundary (amber dashed)
  const c25 = curvePts(2.5)  // Z-score Osteopenia/Osteoporosis boundary (red dashed)

  const pts = arr => arr.map(([x, y]) => `${x.toFixed(1)},${cy(y).toFixed(1)}`).join(' ')

  const polyNormal  = `${ml},${mt} ${ml+cW},${mt} ${pts([...c1].reverse())}`
  const polyOstopen = `${pts(c1)} ${pts([...c25].reverse())}`
  const polyOsteo   = `${pts(c25)} ${ml+cW},${mt+cH} ${ml},${mt+cH}`

  function tBand(bmdTop, bmdBot, fill) {
    const y1 = Math.max(yp(Math.min(bmdTop, BMD_MAX)), mt)
    const y2 = Math.min(yp(Math.max(bmdBot, BMD_MIN)), mt + cH)
    if (y2 <= y1 + 0.5) return ''
    return `<rect x="${ml}" y="${y1.toFixed(1)}" width="${cW}" height="${(y2 - y1).toFixed(1)}" fill="${fill}"/>`
  }
  function tLine(bmdVal, label) {
    if (bmdVal < BMD_MIN || bmdVal > BMD_MAX) return ''
    const y = yp(bmdVal)
    return `<line x1="${ml}" y1="${y.toFixed(1)}" x2="${(ml+cW).toFixed(1)}" y2="${y.toFixed(1)}" stroke="#aaa" stroke-width="0.7" stroke-dasharray="3,3" opacity="0.7"/>` +
           `<text x="${(ml+2).toFixed(1)}" y="${(y-1.5).toFixed(1)}" font-size="5" fill="#999">${label}</text>`
  }

  const iMid = ref.findIndex(([a]) => a >= 60)
  const ym1  = cy(c1[iMid][1])
  const ym25 = cy(c25[iMid][1])
  const xLbl = (c1[iMid][0] + 16).toFixed(1)
  const yLblN = ((mt + ym1)   / 2 + 2.5).toFixed(1)
  const yLblO = ((ym1 + ym25) / 2 + 2.5).toFixed(1)
  const yLblP = ((ym25 + mt + cH) / 2 + 2.5).toFixed(1)

  const dotX = Math.max(ml + 5, Math.min(ml + cW - 5, xp(age)))
  const dotY = Math.max(mt + 5, Math.min(mt + cH - 5, yp(bmd)))

  const xTicks = [20, 30, 40, 50, 60, 70, 80, 90]
  const yTicks = isSpine
    ? [[1.4,'1.4'],[1.3,'1.3'],[1.2,'1.2'],[1.1,'1.1'],[1.0,'1.0'],[0.9,'0.9'],[0.8,'0.8'],[0.7,'0.7']]
    : [[1.1,'1.1'],[1.0,'1.0'],[0.9,'0.9'],[0.8,'0.8'],[0.7,'0.7'],[0.6,'0.6'],[0.5,'0.5']]

  const clipId = `osteo-clip-${isSpine ? 'sp' : 'hp'}`
  const totalW = W + 4
  const title = isSpine ? 'AP Spine L1–L4' : 'Femoral Neck'

  return `
  <div ${st('flex-shrink:0')}>
    <div ${st(`font-size:7px;font-weight:600;color:${P.gray};margin-bottom:2px;text-transform:uppercase;letter-spacing:.5px`)}>Densitometry Reference — ${title}</div>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW} ${H}" width="${totalW}" height="${H}" style="display:block">
      <defs><clipPath id="${clipId}"><rect x="${ml}" y="${mt}" width="${cW}" height="${cH}"/></clipPath></defs>
      <rect x="${ml}" y="${mt}" width="${cW}" height="${cH}" fill="#f9fafb"/>
      ${tBand(BMD_MAX, tOst,  '#4CAF500e')}
      ${tBand(tOst,  tOstP,   '#FF98000f')}
      ${tBand(tOstP, BMD_MIN, '#F443360d')}
      <polygon points="${polyNormal}"  fill="#4CAF5020" clip-path="url(#${clipId})"/>
      <polygon points="${polyOstopen}" fill="#FF98002a" clip-path="url(#${clipId})"/>
      <polygon points="${polyOsteo}"   fill="#F443361e" clip-path="url(#${clipId})"/>
      ${xTicks.map(a => `<line x1="${xp(a).toFixed(1)}" y1="${mt}" x2="${xp(a).toFixed(1)}" y2="${mt+cH}" stroke="#ddd" stroke-width="0.5"/>`).join('')}
      ${yTicks.map(([bv]) => `<line x1="${ml}" y1="${yp(bv).toFixed(1)}" x2="${(ml+cW).toFixed(1)}" y2="${yp(bv).toFixed(1)}" stroke="#ddd" stroke-width="0.5"/>`).join('')}
      ${tLine(tOst,  'T=−1')}
      ${tLine(tOstP, 'T=−2.5')}
      <polyline points="${pts(c1)}"  fill="none" stroke="#B76E00" stroke-width="1"   stroke-dasharray="4,2" opacity="0.8" clip-path="url(#${clipId})"/>
      <polyline points="${pts(c25)}" fill="none" stroke="#B71C1C" stroke-width="1"   stroke-dasharray="4,2" opacity="0.8" clip-path="url(#${clipId})"/>
      <polyline points="${pts(c0)}"  fill="none" stroke="#1565C0" stroke-width="1.5"                        opacity="0.75" clip-path="url(#${clipId})"/>
      <rect x="${ml}" y="${mt}" width="${cW}" height="${cH}" fill="none" stroke="#bbb" stroke-width="0.8"/>
      <text x="${xLbl}" y="${yLblN}" font-size="5.5" fill="#2E7D32" font-weight="600" opacity="0.8">Normal</text>
      <text x="${xLbl}" y="${yLblO}" font-size="5.5" fill="#B76E00" font-weight="600" opacity="0.8">Osteopenia</text>
      <text x="${xLbl}" y="${yLblP}" font-size="5.5" fill="#B71C1C" font-weight="600" opacity="0.8">Osteoporosis</text>
      ${yTicks.map(([bv, label]) => `<text x="${(ml-3).toFixed(1)}" y="${(yp(bv)+2.5).toFixed(1)}" text-anchor="end" font-size="6.5" fill="#888">${label}</text>`).join('')}
      <text x="8" y="${(mt+cH/2).toFixed(1)}" text-anchor="middle" font-size="6.5" fill="#666" transform="rotate(-90,8,${(mt+cH/2).toFixed(1)})">g/cm²</text>
      ${xTicks.map(a => `<text x="${xp(a).toFixed(1)}" y="${(mt+cH+10).toFixed(1)}" text-anchor="middle" font-size="6.5" fill="#888">${a}</text>`).join('')}
      <text x="${(ml+cW/2).toFixed(1)}" y="${H}" text-anchor="middle" font-size="6.5" fill="#666">Age (years)</text>
      <circle cx="${dotX.toFixed(1)}" cy="${dotY.toFixed(1)}" r="5" fill="white" stroke="#0D7377" stroke-width="2"/>
      <circle cx="${dotX.toFixed(1)}" cy="${dotY.toFixed(1)}" r="2.5" fill="#0D7377"/>
      <text x="${dotX.toFixed(1)}" y="${(dotY-8).toFixed(1)}" text-anchor="middle" font-size="7" fill="#0D7377" font-weight="700">${bmd.toFixed(3)}</text>
    </svg>
    <div ${st('display:flex;align-items:center;flex-wrap:nowrap;gap:5px;font-size:6.5px;margin-top:3px;color:#666;overflow:hidden')}>
      <span style="white-space:nowrap">● Patient</span>
      <span style="display:inline-flex;align-items:center;gap:2px;white-space:nowrap"><svg width="12" height="4" style="display:block"><line x1="0" y1="2" x2="12" y2="2" stroke="#1565C0" stroke-width="1.5" opacity="0.75"/></svg>Pop. mean (${male ? 'male' : 'female'})</span>
      <span style="display:inline-flex;align-items:center;gap:2px;white-space:nowrap"><svg width="6" height="6" style="display:block"><rect width="6" height="6" fill="#4CAF5055"/></svg>Normal</span>
      <span style="display:inline-flex;align-items:center;gap:2px;white-space:nowrap"><svg width="6" height="6" style="display:block"><rect width="6" height="6" fill="#FF980055"/></svg>Osteopenia</span>
      <span style="display:inline-flex;align-items:center;gap:2px;white-space:nowrap"><svg width="6" height="6" style="display:block"><rect width="6" height="6" fill="#F4433655"/></svg>Osteoporosis</span>
      <span style="white-space:nowrap;color:#aaa">─ ─ T-score</span>
    </div>
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
  ${header(pt, 'DEXA — Lumbar Spine', P, lh, pageNum, total)}
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
        ${spineTotal ? bmdRefChart(pt.age, spineTotal.bmd, 'spine', pt.gender, P) : ''}
      </div>
    </div>
    <div class="row" ${st('gap:14px;flex-shrink:0;align-items:flex-start')}>
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
    <div ${st(`flex-shrink:0;background:${P.card};border:1px solid ${P.border};border-left:4px solid ${C.teal};border-radius:6px;padding:10px 16px`)}>
      <div class="row" ${st('gap:20px;align-items:flex-start')}>
        <div ${st('flex:1')}>
          <span ${st(`font-size:10px;font-weight:700;color:${C.teal}`)}>Why DEXA?</span>
          <span ${st(`font-size:9px;color:${P.gray};margin-left:8px`)}>DEXA is the WHO-endorsed gold standard for bone mineral density measurement</span>
          <div ${st(`margin-top:4px;font-size:9px;color:${P.grayLt};line-height:1.65`)}>
            DEXA (Dual-Energy X-ray Absorptiometry) uses two X-ray energies to precisely separate bone from soft tissue — delivering accurate, reproducible BMD values that no other bedside method can match.
            Unlike ultrasound or BIA, it leaves no room for assumptions. Radiation dose is minimal (&lt;1 μSv, less than a single day of background exposure).
          </div>
        </div>
        <div ${st(`flex-shrink:0;display:flex;flex-direction:column;gap:4px;text-align:center;padding:6px 14px;background:${C.teal}18;border-radius:6px;border:1px solid ${C.teal}44`)}>
          <div ${st(`font-size:8px;font-weight:700;color:${C.teal};letter-spacing:.5px;text-transform:uppercase`)}>Gold</div>
          <div ${st(`font-size:8px;font-weight:700;color:${C.teal};letter-spacing:.5px;text-transform:uppercase`)}>Standard</div>
        </div>
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
  ${header(pt, 'DEXA — Dual Femur', P, lh, pageNum, total)}
  <div class="col" ${st('flex:1;gap:10px;min-height:0')}>
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
          ${hipDotBmd != null ? `
          <div ${st('display:flex;align-items:baseline;gap:4px;margin-top:10px')}>
            <span ${st(`font-size:36px;font-weight:800;color:${classColor(summary.overall_class)};line-height:1`)}>${hipDotBmd.toFixed(3)}</span>
            <span ${st(`font-size:11px;color:${P.gray}`)}>g/cm²</span>
          </div>` : ''}
        </div>
        ${summary.lowest_hip_t != null ? `
        <div ${st('display:flex;flex-direction:column')}>
          <div class="lbl">ISCD Diagnostic Hip T-Score</div>
          <div ${st(`font-size:9px;color:${P.gray};margin-top:2px`)}>Femoral Neck / Total Hip only</div>
          <div ${st('flex:1;min-height:12px')}></div>
          <div ${st(`font-size:38px;font-weight:800;color:${classColor(summary.overall_class)};line-height:1;margin-top:4px`)}>${summary.lowest_hip_t >= 0 ? '+' : ''}${summary.lowest_hip_t.toFixed(1)}</div>
        </div>
        <div ${st('display:flex;flex-direction:column')}>
          <div class="lbl">Z-Score</div>
          <div ${st(`font-size:9px;color:${P.gray};margin-top:2px`)}>vs same age &amp; sex peers</div>
          <div ${st('flex:1;min-height:12px')}></div>
          <div ${st(`font-size:38px;font-weight:800;color:${summary.lowest_hip_z != null && summary.lowest_hip_z <= -2 ? C.red : C.greenLt};line-height:1;margin-top:4px`)}>${summary.lowest_hip_z != null ? (summary.lowest_hip_z >= 0 ? '+' : '') + summary.lowest_hip_z.toFixed(1) : '—'}</div>
        </div>` : ''}
      </div>
      <div ${st('display:flex;gap:16px;align-items:flex-start')}>
        <div ${st('flex:1;min-width:0')}>
          ${summary.lowest_hip_t != null ? tScoreBar(summary.lowest_hip_t, P) : ''}
        </div>
        ${hipDotBmd != null ? bmdRefChart(pt.age, hipDotBmd, 'hip', pt.gender, P) : ''}
      </div>
    </div>
    ${hasLeft ? `
    <div class="row" ${st('gap:14px;flex-shrink:0;align-items:flex-start')}>
      <div ${st('flex-shrink:0;display:flex;flex-direction:column;gap:6px;align-items:center;justify-content:center;width:160px')}>
        <img src="${images.left_femur_overlay_url || images.left_femur_url}" alt="Left femur"
             ${st('max-height:100%;max-width:160px;width:auto;height:auto;border-radius:8px;display:block;object-fit:contain')}
             onerror="if(this.src!=='${images.left_femur_url}'){this.src='${images.left_femur_url}';this.onerror=null}else{this.style.display='none'}">
        <div ${st(`font-size:9px;color:${P.gray};letter-spacing:.4px;text-align:center`)}>Left Femur</div>
        <div ${st(`font-size:8px;color:${P.gray};opacity:.7;letter-spacing:.3px;text-align:center`)}>Image not for diagnosis</div>
      </div>
      <div class="card" ${st('flex:1')}>
        <div class="sec">Left Femur</div>
        ${bmdTable(lfRows, P)}
      </div>
    </div>` : ''}
    ${hasRight ? `
    <div class="row" ${st('gap:14px;flex-shrink:0;align-items:flex-start')}>
      <div ${st('flex-shrink:0;display:flex;flex-direction:column;gap:6px;align-items:center;justify-content:center;width:160px')}>
        <img src="${images.right_femur_overlay_url || images.right_femur_url}" alt="Right femur"
             ${st('max-height:100%;max-width:160px;width:auto;height:auto;border-radius:8px;display:block;object-fit:contain')}
             onerror="if(this.src!=='${images.right_femur_url}'){this.src='${images.right_femur_url}';this.onerror=null}else{this.style.display='none'}">
        <div ${st(`font-size:9px;color:${P.gray};letter-spacing:.4px;text-align:center`)}>Right Femur</div>
        <div ${st(`font-size:8px;color:${P.gray};opacity:.7;letter-spacing:.3px;text-align:center`)}>Image not for diagnosis</div>
      </div>
      <div class="card" ${st('flex:1')}>
        <div class="sec">Right Femur</div>
        ${bmdTable(rfRows, P)}
      </div>
    </div>` : ''}
    <div ${st(`font-size:8.5px;color:${P.gray};margin-top:6px;text-align:right`)}>ISCD: Only Femoral Neck &amp; Total Hip used for WHO classification — Trochanter and Ward's are not diagnostic sites.</div>
    ${scanFootnotes([
      'Precision (LSC): ±0.012 g/cm² for Femoral Total (68% CI; repeat scans within this range may reflect measurement variability)',
      'Reference: USA NHANES + GE Lunar (ages 20–40) Femur normative database. T-scores may not reflect Indian population norms.',
    ], P)}
  </div>
</div>`
}

/* ── Page Trends: Bone Density Trends ───────────────────────────────────── */

/**
 * Format a scan_date string (YYYY-MM-DD) to "dd MMM yyyy".
 */
function fmtDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

/**
 * Build SVG sparkline for a series of values (W×H).
 * Returns empty string if fewer than 2 non-null values.
 */
function osteoSparkline(values, W, H, color) {
  const valid = values.filter(v => v != null)
  if (valid.length < 2) return ''
  const min = Math.min(...valid) - 0.01
  const max = Math.max(...valid) + 0.01
  const range = max - min || 0.01
  const pad = 6
  const cW = W - pad * 2, cH = H - pad * 2
  const pts = values.map((v, i) => {
    if (v == null) return null
    const x = (pad + (i / (values.length - 1)) * cW).toFixed(1)
    const y = (pad + (1 - (v - min) / range) * cH).toFixed(1)
    return `${x},${y}`
  }).filter(Boolean).join(' ')
  const circles = values.map((v, i) => {
    if (v == null) return ''
    const x = (pad + (i / (values.length - 1)) * cW).toFixed(1)
    const y = (pad + (1 - (v - min) / range) * cH).toFixed(1)
    return `<circle cx="${x}" cy="${y}" r="3" fill="${color}" stroke="#fff" stroke-width="1.5"/>`
  }).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="display:block;overflow:visible">
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    ${circles}
  </svg>`
}

function pageTrends(data, history, P, lh, pageNum, total) {
  // Combine history (oldest first) + current scan, cap at 5
  const scans = [...history, data].slice(-5)
  const n = scans.length

  const { patient: pt } = data

  /* ── A) Classification timeline strip ──────────────────────────────────── */
  const timelineItems = scans.map((sc, i) => {
    const cls = sc.summary?.overall_class ?? 'normal'
    const dotColor = classColor(cls)
    const isCurrent = i === n - 1
    return `
    <div ${st(`display:flex;flex-direction:column;align-items:center;gap:4px;flex:1;min-width:0;${isCurrent ? `border-left:3px solid ${C.teal};padding-left:8px` : ''}`)}>
      <div ${st(`font-size:9px;color:${P.gray};font-weight:${isCurrent ? 700 : 400}`)}>${fmtDate(sc.patient?.scan_date)}</div>
      <div ${st(`width:14px;height:14px;border-radius:50%;background:${dotColor};flex-shrink:0`)}></div>
      <div ${st(`font-size:8px;color:${dotColor};font-weight:600;text-align:center;line-height:1.2`)}>${classLabel(cls)}</div>
      ${isCurrent ? `<div ${st(`font-size:7.5px;color:${C.teal};font-weight:700`)}>Current</div>` : ''}
    </div>`
  }).join('')

  /* ── B) BMD comparison table ────────────────────────────────────────────── */
  // Sites: [label, extract fn, LSC threshold for significance]
  const SPINE_LSC = 0.028
  const HIP_LSC   = 0.033

  // Extract spine L1-L4 BMD and T-score
  function spineVals(sc) {
    const r = sc.spine?.['L1-L4']
    return { bmd: r?.bmd ?? null, t: r?.T ?? null }
  }
  // Extract hip: prefer total of lowest side, fallback to neck of lowest side
  function hipVals(sc) {
    const side = sc.summary?.lowest_hip_side
    const femur = side === 'left' ? sc.left_femur : side === 'right' ? sc.right_femur : null
    if (!femur) return { bmd: null, t: null }
    const r = femur.Total ?? femur.Neck ?? null
    return { bmd: r?.bmd ?? null, t: r?.T ?? null }
  }

  function bmdDeltaCell(curr, prev, lsc, P) {
    if (curr == null || prev == null) return `<div ${st(`font-size:8px;color:${P.gray}`)}>—</div>`
    const delta = curr - prev
    const sign = delta >= 0 ? '+' : ''
    if (delta >= lsc)  return `<div ${st(`font-size:8px;color:${C.greenLt};font-weight:600`)}>${sign}${delta.toFixed(3)} ↑ significant</div>`
    if (delta <= -lsc) return `<div ${st(`font-size:8px;color:${C.red};font-weight:600`)}>${delta.toFixed(3)} ↓ significant</div>`
    return `<div ${st(`font-size:8px;color:${P.gray}`)}>${sign}${delta.toFixed(3)} within precision</div>`
  }

  function siteCells(vals, prevVals, lsc, P, isCurrent) {
    const { bmd, t } = vals
    const delta = prevVals ? bmdDeltaCell(bmd, prevVals.bmd, lsc, P) : ''
    const borderLeft = isCurrent ? `border-left:3px solid ${C.teal};` : ''
    return `<td style="padding:6px 8px;vertical-align:top;${borderLeft}border-bottom:1px solid ${P.border}">
      <div ${st(`font-size:11px;font-weight:700;color:${P.text};font-family:monospace`)}>${bmd != null ? bmd.toFixed(3) : '—'}</div>
      <div ${st(`font-size:9px;color:${t != null ? (t <= -2.5 ? C.red : t <= -1 ? C.amber : C.greenLt) : P.gray}`)}>${t != null ? (t >= 0 ? '+' : '') + t.toFixed(1) : '—'}</div>
      ${delta}
    </td>`
  }

  const spineRows = scans.map((sc, i) => spineVals(sc))
  const hipRows   = scans.map((sc, i) => hipVals(sc))

  const dateHeaderCells = scans.map((sc, i) => {
    const isCurrent = i === n - 1
    return `<th style="padding:6px 8px;font-size:9px;font-weight:${isCurrent ? 700 : 500};color:${isCurrent ? C.teal : P.gray};text-align:left;${isCurrent ? `border-left:3px solid ${C.teal};` : ''}border-bottom:2px solid ${P.border}">${fmtDate(sc.patient?.scan_date)}${isCurrent ? ' ★' : ''}</th>`
  }).join('')

  const spineBodyCells = scans.map((sc, i) => {
    const isCurrent = i === n - 1
    return siteCells(spineRows[i], i > 0 ? spineRows[i - 1] : null, SPINE_LSC, P, isCurrent)
  }).join('')

  const hipBodyCells = scans.map((sc, i) => {
    const isCurrent = i === n - 1
    return siteCells(hipRows[i], i > 0 ? hipRows[i - 1] : null, HIP_LSC, P, isCurrent)
  }).join('')

  const bmdTable = `
  <table style="width:100%;border-collapse:collapse;font-size:10px">
    <thead>
      <tr>
        <th style="padding:6px 8px;font-size:9px;font-weight:700;color:${P.gray};text-align:left;border-bottom:2px solid ${P.border}">Site</th>
        ${dateHeaderCells}
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="padding:6px 8px;font-size:11px;font-weight:600;color:${P.grayLt};border-bottom:1px solid ${P.border};white-space:nowrap">L1–L4 Spine</td>
        ${spineBodyCells}
      </tr>
      <tr>
        <td style="padding:6px 8px;font-size:11px;font-weight:600;color:${P.grayLt};border-bottom:1px solid ${P.border};white-space:nowrap">Hip (lowest)</td>
        ${hipBodyCells}
      </tr>
    </tbody>
  </table>
  <div ${st(`font-size:8px;color:${P.gray};margin-top:4px`)}>
    BMD g/cm² · T-score · Delta vs prior scan &nbsp;·&nbsp;
    <span ${st(`color:${C.greenLt}`)}>↑ significant</span> ≥0.028 (spine) / ≥0.033 (hip) &nbsp;·&nbsp;
    <span ${st(`color:${C.red}`)}>↓ significant</span> ≤−0.028 / ≤−0.033 &nbsp;·&nbsp; Precision (LSC, 68% CI)
  </div>`

  /* ── C) SVG Sparklines ──────────────────────────────────────────────────── */
  const spineSparkVals = scans.map(sc => sc.spine?.['L1-L4']?.bmd ?? null)
  const hipSparkVals   = scans.map(sc => hipVals(sc).bmd)

  const spineSparkSvg = osteoSparkline(spineSparkVals, 180, 44, C.tealLt)
  const hipSparkSvg   = osteoSparkline(hipSparkVals,   180, 44, C.amber)

  const sparkSection = (spineSparkSvg || hipSparkSvg) ? `
  <div class="row" ${st('gap:20px;margin-top:4px')}>
    ${spineSparkSvg ? `
    <div ${st('flex:1')}>
      <div ${st(`font-size:9px;font-weight:600;color:${C.tealLt};margin-bottom:2px`)}>L1–L4 Spine BMD trend</div>
      ${spineSparkSvg}
    </div>` : ''}
    ${hipSparkSvg ? `
    <div ${st('flex:1')}>
      <div ${st(`font-size:9px;font-weight:600;color:${C.amber};margin-bottom:2px`)}>Hip BMD trend</div>
      ${hipSparkSvg}
    </div>` : ''}
  </div>` : ''

  /* ── D) Body fat % row ──────────────────────────────────────────────────── */
  const hasFatPct = scans.some(sc => sc.estimated_composition?.fat_pct != null)
  const fatRow = hasFatPct ? (() => {
    const fatVals = scans.map(sc => sc.estimated_composition?.fat_pct ?? null)
    const fatCells = scans.map((sc, i) => {
      const v = fatVals[i]
      const isCurrent = i === n - 1
      const prev = i > 0 ? fatVals[i - 1] : null
      const delta = v != null && prev != null ? v - prev : null
      const deltaHtml = delta != null
        ? `<div ${st(`font-size:8px;color:${delta <= 0 ? C.greenLt : C.red}`)}>${delta >= 0 ? '+' : ''}${delta.toFixed(1)}% ${delta <= 0 ? '↓' : '↑'}</div>`
        : ''
      return `<td style="padding:6px 8px;vertical-align:top;${isCurrent ? `border-left:3px solid ${C.teal};` : ''}border-bottom:1px solid ${P.border}">
        <div ${st(`font-size:11px;font-weight:700;color:${P.text};font-family:monospace`)}>${v != null ? v.toFixed(1) + '%' : '—'}</div>
        ${deltaHtml}
      </td>`
    }).join('')
    return `
    <tr>
      <td style="padding:6px 8px;font-size:11px;font-weight:600;color:${P.grayLt};border-bottom:1px solid ${P.border};white-space:nowrap">Body Fat %</td>
      ${fatCells}
    </tr>`
  })() : ''

  const fatTable = hasFatPct ? `
  <div class="card" ${st('flex-shrink:0;margin-top:10px')}>
    <div class="sec">Body Fat % Trend</div>
    <table style="width:100%;border-collapse:collapse;font-size:10px">
      <thead>
        <tr>
          <th style="padding:6px 8px;font-size:9px;font-weight:700;color:${P.gray};text-align:left;border-bottom:2px solid ${P.border}">Metric</th>
          ${dateHeaderCells}
        </tr>
      </thead>
      <tbody>${fatRow}</tbody>
    </table>
  </div>` : ''

  /* ── E) Footer ──────────────────────────────────────────────────────────── */
  const foot = `
  <div ${st(`padding-top:8px;border-top:1px solid ${P.border};font-size:8.5px;color:${P.gray};line-height:1.8;flex-shrink:0`)}>
    Scanner ${esc(pt.scanner)} · ${esc(pt.software)} · Scan ${esc(pt.scan_date)} ·
    Showing up to 5 most recent scans. Significant change defined by Least Significant Change (LSC) at 68% CI: ±0.028 g/cm² (spine), ±0.033 g/cm² (hip).
  </div>`

  return `
<div class="page">
  ${header(pt, 'DEXA — Bone Density Trends', P, lh, pageNum, total)}
  <div class="col" ${st('gap:14px')}>
    <!-- A: Classification timeline -->
    <div class="card" ${st('flex-shrink:0')}>
      <div class="sec">Classification Timeline</div>
      <div ${st('display:flex;gap:0')}>${timelineItems}</div>
    </div>
    <!-- B: BMD comparison table -->
    <div class="card" ${st('flex-shrink:0')}>
      <div class="sec">BMD Comparison</div>
      ${bmdTable}
    </div>
    <!-- C: Sparklines -->
    ${sparkSection ? `<div class="card" ${st('flex-shrink:0')}><div class="sec">BMD Trend</div>${sparkSection}</div>` : ''}
    <!-- D: Body fat trend -->
    ${fatTable}
    ${foot}
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
  const isFemale = !gender || gender.toLowerCase().startsWith('f')
  const fat = comp.fat_pct
  const ag_ratio = comp.android_fat_pct != null && comp.gynoid_fat_pct != null && comp.gynoid_fat_pct > 0
    ? (comp.android_fat_pct / comp.gynoid_fat_pct).toFixed(2) : null

  // Zone classification
  const [athleticMax, normalMax, highMax] = isFemale ? [21, 33, 39] : [14, 25, 31]
  let fatCategory = null, fatStatus = 'info'
  if (fat != null) {
    if (fat < athleticMax)      { fatCategory = 'Athletic'; fatStatus = 'good' }
    else if (fat < normalMax)   { fatCategory = 'Normal';   fatStatus = 'good' }
    else if (fat < highMax)     { fatCategory = 'High';     fatStatus = 'warn' }
    else                        { fatCategory = 'Obese';    fatStatus = 'alert' }
  }
  const agThreshold = isFemale ? 0.8 : 1.0
  const centralObesity = ag_ratio != null && parseFloat(ag_ratio) > agThreshold
  const overallStatus = (fatStatus === 'alert' || centralObesity) ? 'alert' : fatStatus === 'warn' ? 'warn' : 'good'
  const statusColors = { good: C.greenLt, warn: C.amber, alert: C.red }
  const bgColors     = { good: P.statusGood, warn: P.statusWarn, alert: P.statusAlert }
  const borderColor  = statusColors[overallStatus]

  // Findings + recommendation
  const findings = []
  if (fat != null)     findings.push(`Body fat <strong>${fat.toFixed(1)}%</strong> — ${fatCategory}`)
  if (ag_ratio != null) findings.push(`A/G ratio <strong>${ag_ratio}</strong> — ${centralObesity ? 'Central fat distribution' : 'Normal distribution'}`)

  let recommendation, timing
  if (fatCategory === 'Obese' || centralObesity) {
    recommendation = 'Elevated body fat and/or central adiposity detected. Whole Body DXA strongly recommended to quantify fat mass, lean mass, and regional distribution.'
    timing = 'Whole Body DXA recommended within 3 months'
  } else if (fatCategory === 'High') {
    recommendation = 'Body fat is in the elevated range. Whole Body DXA would provide precise fat and lean mass quantification not available from this scan.'
    timing = 'Whole Body DXA recommended within 6 months'
  } else if (comp.is_estimated) {
    recommendation = 'Estimated from AP Spine + Femur — not a true body composition measurement. Whole Body DXA provides accurate fat mass, lean mass, and regional detail.'
    timing = 'Consider Whole Body DXA for baseline body composition'
  } else {
    recommendation = 'Body composition values are within normal range.'
    timing = null
  }

  // Extra stats for real total-body scans
  const extraStats = !comp.is_estimated ? [
    { label: 'Total Fat',  val: comp.fat_kg  != null ? comp.fat_kg + ' kg'  : null },
    { label: 'Lean Mass',  val: comp.lean_kg != null ? comp.lean_kg + ' kg' : null },
    { label: 'FMI',        val: comp.fmi  != null ? comp.fmi.toFixed(1)  : null, unit: 'kg/m²' },
    { label: 'LMI',        val: comp.lmi  != null ? comp.lmi.toFixed(1)  : null, unit: 'kg/m²' },
  ].filter(it => it.val != null) : []

  const statCell = (label, val, unit) => `
    <div>
      <div ${st(`font-size:6.5px;color:${P.gray};font-weight:600;text-transform:uppercase;letter-spacing:.3px`)}>${label}</div>
      <div ${st(`font-size:9px;font-weight:700;color:${P.text};line-height:1.2`)}>${val}${unit ? `<span ${st(`font-size:6.5px;font-weight:400;color:${P.gray};margin-left:1px`)}>${unit}</span>` : ''}</div>
    </div>`

  return `
  <div ${st(`background:${P.card};border:1px solid ${P.border};border-left:4px solid ${borderColor};border-radius:8px;padding:10px 14px;margin-top:14px;margin-bottom:10px`)}>
    <div ${st(`display:flex;align-items:baseline;gap:8px;margin-bottom:6px`)}>
      <span ${st(`font-size:9px;font-weight:700;color:${P.text}`)}>Estimated Body Composition</span>
      <span ${st(`font-size:7px;color:${P.gray}`)}>GE Lunar estimated from AP Spine + Femur — not a full body composition scan</span>
    </div>
    <div ${st('display:grid;grid-template-columns:1fr 1fr;gap:8px 16px;margin-bottom:6px')}>
      <div>
        ${statCell('Body Fat %', fat != null ? fat.toFixed(1) + '%' : '—', null)}
        <div ${st('margin-top:5px')}>${fatPctBar(comp.fat_pct, gender, P)}</div>
      </div>
      <div>
        <div ${st('display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;margin-bottom:5px')}>
          ${statCell('Android Fat', comp.android_fat_pct != null ? comp.android_fat_pct.toFixed(1) + '%' : '—', null)}
          ${statCell('Gynoid Fat',  comp.gynoid_fat_pct  != null ? comp.gynoid_fat_pct.toFixed(1)  + '%' : '—', null)}
          ${ag_ratio != null ? statCell('A/G Ratio', ag_ratio, null) : ''}
          ${extraStats.map(it => statCell(it.label, it.val, it.unit)).join('')}
        </div>
        ${agBar(ag_ratio, gender, P)}
      </div>
    </div>
    <div ${st(`border-top:1px solid ${P.border};padding-top:6px;margin-top:6px`)}>
      <div ${st(`font-size:8px;color:${P.grayLt};line-height:1.5`)}>${recommendation}</div>
      ${timing ? `<div ${st(`margin-top:3px;font-size:8px;font-weight:700;color:${borderColor}`)}>${timing}</div>` : ''}
    </div>
  </div>`
}

function compSummaryCard(comp, pt, P) { return '' }

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
  ${header(pt, 'DEXA — Clinical Summary', P, lh, pageNum, total)}
  <div ${st(`flex-shrink:0;display:flex;align-items:center;gap:16px;padding:12px 16px;border-radius:8px;margin-bottom:14px;background:${clsColor}18;border:1px solid ${clsColor}44`)}>
    <div ${st(`font-size:36px;font-weight:800;color:${clsColor};line-height:1;white-space:nowrap;flex-shrink:0`)}>${classLabel(cls)}</div>
    <div ${st(`font-size:11px;color:${P.gray};line-height:1.7`)}>
      Lowest T-score: <strong ${st(`color:${clsColor}`)}>${lowestT != null ? (lowestT >= 0 ? '+' : '') + lowestT.toFixed(1) : '—'}</strong>
      &nbsp;·&nbsp; Spine L1–L4: ${summary.spine_t != null ? (summary.spine_t >= 0 ? '+' : '') + summary.spine_t.toFixed(1) : '—'}
      ${summary.lowest_hip_t != null ? `&nbsp;·&nbsp; Hip: ${(summary.lowest_hip_t >= 0 ? '+' : '') + summary.lowest_hip_t.toFixed(1)} (${summary.lowest_hip_side})` : ''}
    </div>
  </div>
  <div ${st('display:grid;grid-template-columns:1fr 1fr;grid-auto-rows:auto;align-content:start;gap:12px;flex-shrink:0')}>
    ${cards}
  </div>
  <div ${st(`flex-shrink:0;margin-top:10px;background:${P.card};border:1px solid ${P.border};border-radius:6px;padding:10px 14px`)}>
    <div class="row" ${st('gap:20px;align-items:flex-start')}>
      <div ${st('flex:1')}>
        <span ${st(`font-size:9.5px;font-weight:700;color:${C.tealLt}`)}>T-Score</span>
        <span ${st(`font-size:9px;color:${P.gray};margin-left:6px`)}>vs healthy 30-year-old · WHO standard for bone loss diagnosis</span>
        <div ${st('margin-top:4px')}>
          <span ${st(`font-size:9px;color:${C.greenLt};font-weight:600`)}>≥ −1.0 Normal</span>
          <span ${st(`font-size:9px;color:${P.gray}`)}> · </span>
          <span ${st(`font-size:9px;color:${C.amber};font-weight:600`)}>−1 to −2.5 Osteopenia</span>
          <span ${st(`font-size:9px;color:${P.gray}`)}> · </span>
          <span ${st(`font-size:9px;color:${C.red};font-weight:600`)}>≤ −2.5 Osteoporosis</span>
        </div>
      </div>
      <div ${st(`width:1px;background:${P.border};align-self:stretch`)}></div>
      <div ${st('flex:1')}>
        <span ${st(`font-size:9.5px;font-weight:700;color:${C.tealLt}`)}>Z-Score</span>
        <span ${st(`font-size:9px;color:${P.gray};margin-left:6px`)}>vs same age &amp; sex · below −2.0 = "below expected for age"</span>
        <div ${st(`margin-top:4px;font-size:9px;color:${P.gray}`)}>If T is low but Z is near 0, bone loss is age-related, not accelerated. Z ≤ −2.0 warrants secondary cause investigation regardless of T-score.</div>
      </div>
    </div>
  </div>
  ${compCard(data.estimated_composition, pt, P)}
  ${compSummaryCard(data.estimated_composition, pt, P)}
  ${foot}
</div>`
}

/* ── Entry point ─────────────────────────────────────────────────────────── */

/**
 * Generate the full HTML report (3 or 4 pages — 4 when prior scan history exists).
 *
 * @param {object} data          - OsteoReportData from computeOsteoData()
 * @param {object} [opts]
 * @param {boolean} [opts.dark=false]        - Use dark palette
 * @param {boolean} [opts.letterhead=false]  - Letterhead margins / hide logo
 * @param {object[]} [opts.history=[]]       - Prior OsteoReportData objects, oldest first
 * @returns {string}  Full HTML document
 */
export function generateOsteoHtml(data, { dark = false, letterhead = false, history = [], preview = false } = {}) {
  const P = dark && !letterhead ? darkPal : lightPal

  const hasSpine = Object.keys(data.spine ?? {}).length > 0
  const hasFemur = data.summary?.lowest_hip_t != null
    || Object.keys(data.left_femur  ?? {}).length > 0
    || Object.keys(data.right_femur ?? {}).length > 0

  // Include only the pages for which data exists
  const basePages = [
    ...(hasSpine ? [page1] : []),
    ...(hasFemur ? [page2] : []),
  ]
  // Insert trends page before clinical summary only when prior scans exist
  const trendsFn = history.length > 0
    ? [(d, P, lh, n, t) => pageTrends(d, history, P, lh, n, t)]
    : []
  const pages = [...basePages, ...trendsFn, page3]

  const totalPages = pages.length
  const pagesHtml = pages.map((fn, i) => fn(data, P, letterhead, i + 1, totalPages)).join('')

  if (preview) {
    return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<title>Print Preview — ${esc(data.patient.name)}</title>
<style>
${css(P)}
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
<title>BMD Report — ${esc(data.patient.name)}</title>
<style>${css(P)}</style></head><body>
${pagesHtml}
</body></html>`
}
