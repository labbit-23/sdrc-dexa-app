/** @file Unified densitometry chart for Osteo (spine, hip) and BMD (total body) reports. */
import { readFileSync } from 'fs'
import { join }        from 'path'

// Load normative reference data from lib/bmd-norm.csv at startup (not per request)
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

// Inline styling helper
const st = (s) => `style="${s}"`

// Color palette
const C = {
  red: '#B71C1C',
  amber: '#FF9800',
  greenLt: '#4CAF50',
}

/**
 * Unified densitometry reference chart supporting spine, hip, and total body sites.
 * Renders age vs BMD with T-score zones and age-matched reference curves.
 *
 * @param {number} age - Patient age in years
 * @param {number} bmd - Patient BMD in g/cm²
 * @param {'spine'|'hip'|'totalbody'} site - Scan site
 * @param {string} gender - 'Female', 'Male', etc.
 * @param {object} P - Palette object with .gray, .text colors
 * @returns {string} SVG HTML chart wrapped in styled div
 */
export function densitometryChart(age, bmd, site, gender, P) {
  if (age == null || bmd == null || bmd === 0) return ''
  const isSpine = site === 'spine'
  const isHip = site === 'hip'
  const isTotalBody = site === 'totalbody'
  const male = (gender || '').toLowerCase().startsWith('m')

  // Get reference data
  const nRef = _bmNorm && _bmNorm.neck
  const sRef = _bmNorm && _bmNorm.spine
  const tbRef = _bmNorm && _bmNorm.totalbody
  if (!nRef || !sRef || !tbRef) return ''

  // Hip always uses female reference (ISCD standard); spine & total body are gender-specific
  const { peak, sd, curve } = isTotalBody
    ? (male ? tbRef.male : tbRef.female)
    : isSpine
    ? (male ? sRef.male : sRef.female)
    : nRef.female

  // Unified chart dimensions (spine height for both spine and hip)
  const W = isTotalBody ? 220 : 230
  const H = isTotalBody ? 112 : 140
  const ml = isTotalBody ? 26 : 28
  const mr = isTotalBody ? 3 : 4
  const mt = 5, mb = 18
  const cW = W - ml - mr, cH = H - mt - mb
  const totalW = W + (isTotalBody ? 3 : 4)

  const AGE_MIN = 20, AGE_MAX = 90
  const BMD_MIN = isTotalBody ? 0.80 : isSpine ? 0.54 : 0.40
  const BMD_MAX = isTotalBody ? 1.55 : isSpine ? 1.50 : 1.20

  const xp = a => ml + (a - AGE_MIN) / (AGE_MAX - AGE_MIN) * cW
  const yp = b => mt + (1 - (b - BMD_MIN) / (BMD_MAX - BMD_MIN)) * cH
  const cy = y => Math.max(mt, Math.min(mt + cH, y))

  // T-score horizontal zone boundaries
  const tOst  = peak - sd          // T = −1
  const tOstP = peak - 2.5 * sd    // T = −2.5

  // Age-following reference curves
  function curvePts(kSD) {
    return curve.map(([a, b]) => [xp(a), yp(b - kSD * sd)])
  }
  const c0  = curve.map(([a, b]) => [xp(a), yp(b)])  // population mean
  const c1  = curvePts(1)                              // Z = −1 sloping line
  const c25 = curvePts(2.5)                            // Z = −2.5 sloping line

  const pts = arr => arr.map(([x, y]) => `${x.toFixed(1)},${cy(y).toFixed(1)}`).join(' ')

  // Horizontal zone fills (T-score based, very light — zone labels carry the meaning)
  const yNorm  = cy(yp(tOst))
  const yOstP  = cy(yp(tOstP))

  // Zone label X: just inside left edge; Y: midpoints between T-score boundaries
  const xLbl  = (ml + 3).toFixed(1)
  const yLblN = ((mt + yNorm) / 2 + 2).toFixed(1)
  const yLblO = ((yNorm + yOstP) / 2 + 2).toFixed(1)
  const yLblP = ((yOstP + mt + cH) / 2 + 2).toFixed(1)

  // Patient dot — color reflects T-score zone
  const dotX = Math.max(ml + 5, Math.min(ml + cW - 5, xp(age)))
  const dotY = Math.max(mt + 5, Math.min(mt + cH - 5, yp(bmd)))
  const dotColor = bmd <= tOstP ? C.red : bmd <= tOst ? C.amber : C.greenLt
  const lblY = dotY > mt + 13 ? (dotY - 9).toFixed(1) : (dotY + 17).toFixed(1)

  const xTicks = [20, 30, 40, 50, 60, 70, 80, 90]
  const yTicks = isTotalBody
    ? [1.5, 1.4, 1.3, 1.2, 1.1, 1.0, 0.9, 0.8]
    : [1.4, 1.3, 1.2, 1.1, 1.0, 0.9, 0.8, 0.7, 0.6]
  const clipId = `chart-${site}-${male ? 'm' : 'f'}`

  const title = isTotalBody
    ? `Total Body ${male ? '♂' : '♀'}`
    : isSpine
    ? `AP Spine L1–L4 ${male ? '♂' : '♀'}`
    : 'Femoral Neck · NHANES ♀'

  return `
  <div ${st('flex:1;display:flex;flex-direction:column;min-width:0')}>
    <div ${st(`font-size:9px;font-weight:700;color:${P.gray};margin-bottom:8px;text-align:center`)}>${title}</div>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW} ${H}" width="100%" style="display:block;flex:1">
      <defs><clipPath id="${clipId}"><rect x="${ml}" y="${mt}" width="${cW}" height="${cH}"/></clipPath></defs>

      <!-- Chart background -->
      <rect x="${ml}" y="${mt}" width="${cW}" height="${cH}" fill="#f9fafb"/>

      <!-- Horizontal T-score zone fills (~30-35% opacity, matching GE Lunar) -->
      <rect x="${ml}" y="${mt}"     width="${cW}" height="${(yNorm - mt).toFixed(1)}"        fill="#4CAF5050"/>
      <rect x="${ml}" y="${yNorm}"  width="${cW}" height="${(yOstP - yNorm).toFixed(1)}"      fill="#FF980055"/>
      <rect x="${ml}" y="${yOstP}"  width="${cW}" height="${(mt+cH - yOstP).toFixed(1)}"      fill="#F4433645"/>

      <!-- Grid -->
      ${xTicks.map(a => `<line x1="${xp(a).toFixed(1)}" y1="${mt}" x2="${xp(a).toFixed(1)}" y2="${mt+cH}" stroke="#ddd" stroke-width="0.5"/>`).join('')}
      ${yTicks.map(b => `<line x1="${ml}" y1="${yp(b).toFixed(1)}" x2="${(ml+cW).toFixed(1)}" y2="${yp(b).toFixed(1)}" stroke="#ddd" stroke-width="0.5"/>`).join('')}

      <!-- T-score zone boundary lines with labels (T=−1 and T=−2.5) -->
      <line x1="${ml}" y1="${yNorm.toFixed(1)}"  x2="${(ml+cW).toFixed(1)}" y2="${yNorm.toFixed(1)}"  stroke="#555" stroke-width="0.8"/>
      <line x1="${ml}" y1="${yOstP.toFixed(1)}" x2="${(ml+cW).toFixed(1)}" y2="${yOstP.toFixed(1)}" stroke="#555" stroke-width="0.8"/>
      <text x="${(ml+2).toFixed(1)}" y="${(yNorm-1.5).toFixed(1)}" font-size="5" fill="#888">T=−1</text>
      <text x="${(ml+2).toFixed(1)}" y="${(yOstP-1.5).toFixed(1)}" font-size="5" fill="#888">T=−2.5</text>

      <!-- Age-matched zone polygons (Z-score sloping, ~18% opacity overlay) -->
      <polygon points="${ml},${mt} ${(ml+cW).toFixed(1)},${mt} ${pts([...c1].reverse())}"  fill="#4CAF502e" clip-path="url(#${clipId})"/>
      <polygon points="${pts(c1)} ${pts([...c25].reverse())}"                               fill="#FF980032" clip-path="url(#${clipId})"/>
      <polygon points="${pts(c25)} ${(ml+cW).toFixed(1)},${mt+cH} ${ml},${mt+cH}"          fill="#F4433628" clip-path="url(#${clipId})"/>

      <!-- Z-score sloping boundary curves (dashed) -->
      <polyline points="${pts(c25)}" fill="none" stroke="#B71C1C" stroke-width="0.8" stroke-dasharray="4,3" opacity="0.55" clip-path="url(#${clipId})"/>
      <polyline points="${pts(c1)}"  fill="none" stroke="#E65100" stroke-width="0.8" stroke-dasharray="4,3" opacity="0.55" clip-path="url(#${clipId})"/>
      <!-- Population mean curve -->
      <polyline points="${pts(c0)}"  fill="none" stroke="#1565C0" stroke-width="1.4" opacity="0.7" clip-path="url(#${clipId})"/>

      <!-- Chart border -->
      <rect x="${ml}" y="${mt}" width="${cW}" height="${cH}" fill="none" stroke="#bbb" stroke-width="0.7"/>

      <!-- Zone labels (left side of chart, matching GE Lunar placement) -->
      <text x="${xLbl}" y="${yLblN}" font-size="6" fill="#2E7D32" font-weight="700">Normal</text>
      <text x="${xLbl}" y="${yLblO}" font-size="6" fill="#B76E00" font-weight="700">Osteopenia</text>
      <text x="${xLbl}" y="${yLblP}" font-size="6" fill="#B71C1C" font-weight="700">Osteoporosis</text>

      <!-- Left Y-axis: BMD values -->
      ${yTicks.map(b => `<text x="${(ml-2).toFixed(1)}" y="${(yp(b)+2.5).toFixed(1)}" text-anchor="end" font-size="5.5" fill="#666">${b.toFixed(1)}</text>`).join('')}
      <text x="6" y="${(mt+cH/2).toFixed(1)}" text-anchor="middle" font-size="5.5" fill="#777" transform="rotate(-90,6,${(mt+cH/2).toFixed(1)})">g/cm²</text>

      <!-- X-axis: Age ticks -->
      ${xTicks.map(a => `<text x="${xp(a).toFixed(1)}" y="${(mt+cH+9).toFixed(1)}" text-anchor="middle" font-size="5.5" fill="#888">${a}</text>`).join('')}
      <text x="${(ml+cW/2).toFixed(1)}" y="${(H-1).toFixed(1)}" text-anchor="middle" font-size="6" fill="#777">Age (years)</text>

      <!-- Patient dot — prominent, colored by zone -->
      <circle cx="${dotX.toFixed(1)}" cy="${dotY.toFixed(1)}" r="5" fill="white" stroke="${dotColor}" stroke-width="2"/>
      <circle cx="${dotX.toFixed(1)}" cy="${dotY.toFixed(1)}" r="2.5" fill="${dotColor}"/>
      <text x="${dotX.toFixed(1)}" y="${lblY}" text-anchor="middle" font-size="7" fill="${dotColor}" font-weight="800">${bmd.toFixed(3)}</text>
    </svg>
    <div ${st('margin-top:2px;font-size:6px;color:#999;text-align:center')}>
      <div ${st('display:flex;gap:6px;margin-bottom:1px;justify-content:center')}>
        <span>● ${isSpine ? 'L1–L4' : isTotalBody ? 'Total Body' : 'Patient'}</span>
        <span style="display:inline-flex;align-items:center;gap:2px"><svg width="10" height="3" style="display:block"><line x1="0" y1="1.5" x2="10" y2="1.5" stroke="#1565C0" stroke-width="1.4" opacity="0.7"/></svg>Pop. mean</span>
        <span style="display:inline-flex;align-items:center;gap:2px"><svg width="10" height="3" style="display:block"><line x1="0" y1="1.5" x2="10" y2="1.5" stroke="#555" stroke-width="0.8"/></svg>T-score</span>
      </div>
      <div ${st('display:flex;gap:6px;justify-content:center')}>
        <span style="display:inline-flex;align-items:center;gap:2px"><svg width="7" height="7" style="display:block"><rect width="7" height="7" fill="#4CAF5068"/></svg><span style="color:#2E7D32">Normal</span></span>
        <span style="display:inline-flex;align-items:center;gap:2px"><svg width="7" height="7" style="display:block"><rect width="7" height="7" fill="#FF980068"/></svg><span style="color:#B76E00">Osteopenia</span></span>
        <span style="display:inline-flex;align-items:center;gap:2px"><svg width="7" height="7" style="display:block"><rect width="7" height="7" fill="#F4433660"/></svg><span style="color:#B71C1C">Osteoporosis</span></span>
      </div>
    </div>
  </div>`
}
