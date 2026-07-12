/**
 * @file SDRC DEXA Comprehensive Report Template (9 pages)
 * Complete body composition analysis with regional breakdown, bilateral symmetry,
 * bone health, and trends — built from scratch using visual blueprint and data-binding reference.
 */

import { esc, tbFmtDate, kg, kg2, pct } from './report-utils.js'
import { summaryItems, fatLossTargets, boneGuide, aceCategory } from './report-components.js'

const _BASE = process.env.NEXT_PUBLIC_BASEPATH || ''

/* ── Color Scheme & Styling ─────────────────────────────────────────────── */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
  :root {
    --primary:      #00D9FF;
    --primary-dark: #00A8CC;
    --optimal:      #00D9FF;
    --optimal-dark: #00A8CC;
    --acceptable:   #A78BFA;
    --elevated:     #FB923C;
    --elevated-dark: #EA580C;
    --light-base:   #F8F9FB;
    --light-sec:    #E8EAEF;
    --light-tert:   #D0D5E0;
    --dark-bg:      #0F0F1E;
    --dark-sec:     #1A1A2E;
    --ink:          #1A1A2E;
    --text-muted:   #6B7280;
    --border:       #E5E7EB;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: "Inter", -apple-system, system-ui, sans-serif;
    color: var(--ink);
    background: #F3F4F6;
    -webkit-font-smoothing: antialiased;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .pages { display: flex; flex-direction: column; align-items: center; gap: 20px; padding: 20px 0; }
  .page {
    width: 210mm; height: 297mm;
    background: white; color: var(--ink);
    padding: 16mm;
    position: relative; overflow: hidden;
    display: flex; flex-direction: column;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
  /* Headers and titles */
  .page-header {
    display: grid; grid-template-columns: 1fr auto;
    align-items: center; gap: 12mm; padding-bottom: 3mm;
    border-bottom: 1px solid var(--border);
  }
  .header-brand { display: flex; align-items: center; gap: 10px; }
  .header-brand-logo { height: 32px; width: auto; }
  .header-text-title { font-size: 13px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
  .header-text-sub { font-size: 11px; color: var(--text-muted); letter-spacing: 0.08em; margin-top: 2px; }
  .header-patient { text-align: right; font-size: 10px; line-height: 1.5; color: var(--text-muted); }
  .header-patient-name { color: var(--ink); font-weight: 600; font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; }
  /* Page title */
  .page-title { margin: 6mm 0 4mm 0; }
  .page-title-main { font-size: 32px; font-weight: 900; letter-spacing: -0.02em; margin: 0; line-height: 1.1; }
  .page-title-sub { font-size: 13px; color: var(--text-muted); letter-spacing: 0.08em; text-transform: uppercase; margin: 2mm 0 0 0; font-weight: 500; }
  /* Page body */
  .page-body { flex: 1; padding-top: 6mm; display: flex; flex-direction: column; gap: 8mm; min-height: 0; overflow-y: auto; }
  /* Page footer */
  .page-footer {
    border-top: 1px solid var(--border);
    padding-top: 3mm;
    margin-top: auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 9px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-muted);
    flex-shrink: 0;
  }
  .page-number { font-weight: 600; color: var(--ink); }
  /* Image frame */
  .dx-img-frame {
    background: var(--light-base);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 4mm;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  .dx-img-frame img { width: 100%; height: auto; display: block; object-fit: contain; }
  /* Layout grids */
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; }
  .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6mm; }
  .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6mm; }
  .grid-5 { display: grid; grid-template-columns: repeat(5, 1fr); gap: 4mm; }
  .grid-2x4 { display: grid; grid-template-columns: repeat(4, 1fr); grid-template-rows: repeat(2, 1fr); gap: 6mm; }
  /* Cards */
  .card {
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 4mm;
    background: var(--light-base);
    display: flex;
    flex-direction: column;
    gap: 2mm;
  }
  .card-title { font-size: 12px; font-weight: 700; letter-spacing: 0.05em; }
  .card-value { font-size: 32px; font-weight: 900; line-height: 1; }
  .card-sub { font-size: 10px; color: var(--text-muted); }
  /* Metric tiles */
  .metric-tile {
    border: 1px solid var(--border);
    padding: 4mm;
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 1.5mm;
  }
  .metric-value { font-size: 26px; font-weight: 900; }
  .metric-label { font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-muted); font-weight: 600; }
  /* Color coding */
  .status-optimal { color: var(--optimal); }
  .status-acceptable { color: var(--acceptable); }
  .status-elevated { color: var(--elevated); }
  .bg-optimal { background: rgba(0, 217, 255, 0.1); color: var(--optimal-dark); }
  .bg-acceptable { background: rgba(167, 139, 250, 0.1); color: var(--acceptable); }
  .bg-elevated { background: rgba(251, 147, 60, 0.1); color: var(--elevated); }
  /* Bilateral diagrams (left/right) */
  .bilateral-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6mm; }
  .bilateral-col { display: flex; flex-direction: column; gap: 3mm; }
  .bilateral-diagram { width: 100%; height: 100px; position: relative; }
  .bilateral-label { font-size: 12px; font-weight: 700; text-align: center; }
  .bilateral-value { font-size: 18px; font-weight: 900; text-align: center; color: var(--optimal); }
  /* Scale/gradient bar */
  .scale-bar {
    height: 16px;
    display: flex;
    border-radius: 2px;
    overflow: hidden;
    position: relative;
    margin: 4mm 0;
  }
  .scale-bar-seg { display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 500; color: white; }
  .scale-marker {
    position: absolute;
    top: -8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    z-index: 10;
  }
  .scale-marker-dot { width: 12px; height: 12px; background: white; border: 2px solid var(--ink); border-radius: 50%; }
  .scale-marker-line { width: 1px; height: 20px; background: var(--ink); }
  .scale-marker-label { font-size: 10px; font-weight: 600; color: var(--ink); margin-top: 2px; white-space: nowrap; }
  /* Regional tables */
  .region-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9.5px;
  }
  .region-table th, .region-table td {
    padding: 4mm 3mm;
    text-align: right;
    border-bottom: 1px solid var(--border);
  }
  .region-table th:first-child, .region-table td:first-child { text-align: left; }
  .region-table thead th {
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-muted);
  }
  /* Bone grid */
  .bone-region-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 5mm; }
  .bone-region-card {
    border: 1px solid var(--border);
    padding: 3mm;
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2mm;
  }
  .bone-region-img { width: 100%; height: 80px; object-fit: contain; }
  .bone-region-label { font-size: 10px; font-weight: 600; text-align: center; letter-spacing: 0.05em; }
  .bone-region-value { font-size: 13px; font-weight: 700; color: var(--optimal-dark); text-align: center; }
  /* Copy and guidance */
  .guidance-box {
    background: var(--light-base);
    border-left: 4px solid var(--optimal);
    padding: 4mm;
    border-radius: 2px;
  }
  .guidance-title { font-size: 11px; font-weight: 700; letter-spacing: 0.05em; margin-bottom: 2mm; }
  .guidance-text { font-size: 9.5px; line-height: 1.5; color: var(--text-muted); }
  /* Print styles */
  @page { size: A4; margin: 0; }
  @media print {
    body { background: transparent; }
    .pages { gap: 0; padding: 0; }
    .page { box-shadow: none; page-break-after: always; break-after: page; }
    .page:last-child { page-break-after: auto; }
  }
  /* Mobile responsive */
  @media (max-width: 1024px) {
    .page {
      width: 90vw;
      height: auto;
      padding: 12mm;
      margin: 10px auto;
    }
    .page-title-main { font-size: 24px; }
    .page-title-sub { font-size: 11px; }
    .page-header { gap: 8mm; }
    .header-text-title { font-size: 11px; }
    .card-value { font-size: 24px; }
    .metric-value { font-size: 20px; }
    .metric-tile { padding: 3mm; }
    .region-table { font-size: 8.5px; }
    .region-table th, .region-table td { padding: 3mm 2mm; }
    .grid-5 { grid-template-columns: repeat(3, 1fr); gap: 3mm; }
    .grid-4 { grid-template-columns: repeat(2, 1fr); gap: 4mm; }
    .grid-2x4 { grid-template-columns: repeat(2, 1fr); }
    .bilateral-grid { grid-template-columns: 1fr 1fr; }
    .bone-region-grid { grid-template-columns: repeat(2, 1fr); gap: 4mm; }
  }
  @media (max-width: 768px) {
    .page {
      width: 95vw;
      padding: 10mm;
      margin: 8px auto;
    }
    .pages { gap: 10px; padding: 10px 0; }
    .page-title-main { font-size: 20px; }
    .page-title-sub { font-size: 10px; }
    .page-header { grid-template-columns: 1fr; gap: 6mm; }
    .header-patient { text-align: left; }
    .page-body { gap: 6mm; }
    .card-value { font-size: 20px; }
    .metric-value { font-size: 18px; }
    .metric-label { font-size: 8px; }
    .grid-5 { grid-template-columns: repeat(2, 1fr); gap: 3mm; }
    .grid-4 { grid-template-columns: 1fr 1fr; }
    .grid-3 { grid-template-columns: repeat(2, 1fr); }
    .grid-2 { grid-template-columns: 1fr; }
    .grid-2x4 { grid-template-columns: 1fr; }
    .bilateral-grid { grid-template-columns: 1fr; }
    .bilateral-col { flex-direction: row; }
    .bone-region-grid { grid-template-columns: 1fr; }
    .scale-bar { height: 12px; }
    .scale-marker-dot { width: 10px; height: 10px; }
    .region-table { font-size: 8px; }
    .region-table th, .region-table td { padding: 2mm 1.5mm; }
    .guidance-text { font-size: 8.5px; }
    .page-footer { font-size: 8px; flex-wrap: wrap; gap: 6px; }
  }
  @media (max-width: 480px) {
    .page {
      width: 100vw;
      padding: 8mm;
      margin: 4px auto;
    }
    .pages { gap: 4px; padding: 4px 0; }
    .page-title-main { font-size: 18px; }
    .metric-value { font-size: 16px; }
    .card-value { font-size: 18px; }
    .page-body { gap: 4mm; }
  }
`

/* ─────────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────────────── */

function pageHeader(pt, title, subtitle) {
  return `
    <header class="page-header">
      <div class="header-brand">
        <div>
          <div class="header-text-title">${esc(title)}</div>
          <div class="header-text-sub">${esc(subtitle)}</div>
        </div>
      </div>
      <div class="header-patient">
        <div class="header-patient-name">${esc(pt.name)}</div>
        <div>${esc(pt.gender)} · ${pt.age}y · ${pt.height_cm}cm · ${pt.weight_entered_kg}kg</div>
        <div>ID ${esc(pt.id)} · ${tbFmtDate(pt.scan_date)}</div>
      </div>
    </header>
  `
}

function pageTitle(mainTitle, subTitle) {
  return `
    <div class="page-title">
      <h1 class="page-title-main">${esc(mainTitle)}</h1>
      <div class="page-title-sub">${esc(subTitle)}</div>
    </div>
  `
}

function pageFooter(pageNum, totalPages) {
  return `
    <footer class="page-footer">
      <span>SDRC · Body Composition · Diagnostic Report</span>
      <span class="page-number">${String(pageNum).padStart(2, '0')} / ${String(totalPages).padStart(2, '0')}</span>
    </footer>
  `
}

function imgSrc(samplePath, supabaseUrl) {
  return supabaseUrl || samplePath
}

function getFatColorClass(fatPct) {
  if (fatPct <= 25) return 'status-optimal'
  if (fatPct <= 35) return 'status-acceptable'
  return 'status-elevated'
}

function getTScoreInterpretation(tScore) {
  if (tScore >= -1.0) return 'Normal'
  if (tScore >= -2.5) return 'Osteopenia'
  return 'Osteoporosis'
}

/* ─────────────────────────────────────────────────────────────────────────
   PAGE 1: COVER / BODY COMPOSITION
───────────────────────────────────────────────────────────────────────────── */
function page1(reportData) {
  const { patient: pt, composition: comp, computed: calc, images: img } = reportData
  const male = (pt.gender || '').toLowerCase().startsWith('m')

  const totalKg = kg(comp.total_g)
  const leanKg = kg(comp.lean_g)
  const fatKg = kg(comp.fat_g)
  const boneKg = kg(comp.bmc_g)
  const leanPct = (comp.lean_g / comp.total_g * 100).toFixed(1)
  const bonePct = (comp.bmc_g / comp.total_g * 100).toFixed(1)

  const samplePath = '/tmp/claude-1000/-home-sdrc-projects-sdrc-dexa/2ccadac3-ed24-437a-be2d-f697c2efbd1f/scratchpad/sample-000.png'
  const compositeUrl = imgSrc(samplePath, img?.composite_url)

  return `
    <div class="page">
      ${pageHeader(pt, 'BODY COMPOSITION', 'Your DEXA Analysis')}
      <div class="page-body">
        <div class="dx-img-frame" style="max-width: 200mm; height: 180mm; margin: 0 auto;">
          <img src="${esc(compositeUrl)}" alt="Full-body composition heatmap" />
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 4mm;">
          <div class="metric-tile">
            <div class="metric-value">${totalKg}</div>
            <div class="metric-label">Total Mass (kg)</div>
          </div>
          <div class="metric-tile">
            <div class="metric-value status-optimal">${leanKg}</div>
            <div class="metric-label">Lean Mass (kg)</div>
          </div>
          <div class="metric-tile">
            <div class="metric-value status-elevated">${fatKg}</div>
            <div class="metric-label">Fat Mass (kg)</div>
          </div>
          <div class="metric-tile">
            <div class="metric-value">${boneKg}</div>
            <div class="metric-label">Bone Mineral (kg)</div>
          </div>
        </div>
        <div class="card" style="background: linear-gradient(135deg, rgba(0,217,255,0.1) 0%, rgba(0,168,204,0.05) 100%); border: 2px solid var(--optimal); border-radius: 8px;">
          <div style="text-align: center;">
            <div style="font-size: 56px; font-weight: 900; color: var(--optimal-dark);">${pct(comp.fat_pct)}<span style="font-size: 32px;">%</span></div>
            <div class="card-sub">Body Fat Percentage</div>
            ${comp.centile != null ? '<div class="card-sub">' + comp.centile + 'th centile (age-matched)</div>' : ''}
          </div>
        </div>
        <div class="guidance-box">
          <div class="guidance-title">GOLD STANDARD DEXA ANALYSIS</div>
          <div class="guidance-text">
            DEXA (Dual-Energy X-ray Absorptiometry) provides precise measurement of fat, lean muscle, and bone density across your entire body. This report analyzes your regional distribution and compares your results to age and gender-matched populations.
          </div>
        </div>
      </div>
      ${pageFooter(1, 9)}
    </div>
  `
}

/* ─────────────────────────────────────────────────────────────────────────
   PAGE 2: BODY FAT ANALYSIS
───────────────────────────────────────────────────────────────────────────── */
function page2(reportData) {
  const { patient: pt, composition: comp, computed: calc, images: img } = reportData
  const male = (pt.gender || '').toLowerCase().startsWith('m')

  const fatPct = pct(comp.fat_pct)
  const samplePath = '/tmp/claude-1000/-home-sdrc-projects-sdrc-dexa/2ccadac3-ed24-437a-be2d-f697c2efbd1f/scratchpad/sample-003.png'
  const fatGradientUrl = imgSrc(samplePath, img?.fat_gradient_url)

  const targets = fatLossTargets(comp, calc, pt.gender)
  const targetFatPct = targets ? targets.targets[0]?.pct : null

  // Centile classification
  let centileStatus = 'N/A'
  let centileColor = 'var(--acceptable)'
  if (comp.centile != null) {
    if (comp.centile <= 25) {
      centileStatus = 'Excellent'
      centileColor = 'var(--optimal-dark)'
    } else if (comp.centile <= 50) {
      centileStatus = 'Good'
      centileColor = 'var(--optimal-dark)'
    } else if (comp.centile <= 75) {
      centileStatus = 'Acceptable'
      centileColor = 'var(--acceptable)'
    } else {
      centileStatus = 'Elevated'
      centileColor = 'var(--elevated)'
    }
  }

  // Fat scale (0-50%)
  const fatScale = [
    { w: '20%', c: '#00D9FF', lbl: 'Lean' },
    { w: '20%', c: '#7C3AED', lbl: '25%' },
    { w: '20%', c: '#FB923C', lbl: '35%' },
    { w: '20%', c: '#EF4444', lbl: '45%' },
    { w: '20%', c: '#991B1B', lbl: 'Obese' }
  ]

  return `
    <div class="page">
      ${pageHeader(pt, 'BODY FAT ANALYSIS', 'Your Composition Status · Progress Tracking')}
      <div class="page-body">
        <div class="grid-2" style="gap: 8mm; flex: 0;">
          <div>
            <div class="dx-img-frame" style="height: 160px;">
              <img src="${esc(fatGradientUrl)}" alt="Fat gradient trends" />
            </div>
          </div>
          <div>
            <div class="card">
              <div class="card-title">60-Day Goal</div>
              <div class="card-value">${targetFatPct ? pct(targetFatPct) + '%' : 'Not available'}</div>
              <div class="card-sub">Personalized fat loss target</div>
            </div>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 2mm;">
          <div style="font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted);">Body Fat Scale (0–50%)</div>
          <div class="scale-bar" style="background: linear-gradient(to right, #00D9FF 0%, #7C3AED 20%, #FB923C 40%, #EF4444 70%, #991B1B 100%);">
            <div class="scale-marker" style="left: ${Math.min(Math.max(comp.fat_pct / 50 * 100, 2), 98)}%;">
              <div class="scale-marker-dot"></div>
              <div class="scale-marker-line"></div>
              <div class="scale-marker-label">${fatPct}%</div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-title">Percentile Rank</div>
          <div class="card-value" style="color: ${centileColor};">${centileStatus}</div>
          <div class="card-sub">${comp.centile != null ? comp.centile + 'th percentile (age and gender matched)' : 'Age-matched data not available'}</div>
        </div>

        <div class="guidance-box">
          <div class="guidance-title">INTERPRETATION & GUIDANCE</div>
          <div class="guidance-text">
            Your current body fat percentage places you in the ${centileStatus.toLowerCase()} range for your age and gender. This analysis considers your regional fat distribution to identify areas for targeted improvement. Focus on maintaining lean muscle while achieving fat loss through progressive resistance training and nutrition management.
          </div>
        </div>
      </div>
      ${pageFooter(2, 9)}
    </div>
  `
}

/* ─────────────────────────────────────────────────────────────────────────
   PAGE 3: REGIONAL ANALYSIS
───────────────────────────────────────────────────────────────────────────── */
function page3(reportData) {
  const { patient: pt, composition: comp } = reportData

  const regions = [
    { name: 'Trunk', key: 'Trunk', sample: 'sample-002' },
    { name: 'Android', key: 'Android', sample: 'sample-004' },
    { name: 'Arms', key: 'Arms', sample: 'sample-007' },
    { name: 'Gynoid', key: 'Gynoid', sample: 'sample-006' },
    { name: 'Legs', key: 'Legs', sample: 'sample-010' }
  ]

  const regionGrid = regions.map(r => {
    const data = comp.regions?.[r.key]
    if (!data) return ''
    const samplePath = `/tmp/claude-1000/-home-sdrc-projects-sdrc-dexa/2ccadac3-ed24-437a-be2d-f697c2efbd1f/scratchpad/${r.sample}.png`
    const fatClass = getFatColorClass(data.fat_pct)
    return `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 3mm;">
        <div class="dx-img-frame" style="width: 60mm; height: 60mm;">
          <img src="${esc(samplePath)}" alt="${r.name} region" />
        </div>
        <div class="metric-value ${fatClass}" style="font-size: 28px;">${pct(data.fat_pct)}%</div>
      </div>
    `
  }).join('')

  const regionTableRows = regions.map(r => {
    const data = comp.regions?.[r.key]
    if (!data) return ''
    return `
      <tr>
        <td>${r.name}</td>
        <td>${pct(data.fat_pct)}%</td>
        <td>${kg2(data.total_g)}</td>
        <td style="color: var(--optimal);">${kg2(data.lean_g)}</td>
        <td style="color: var(--elevated);">${kg2(data.fat_g)}</td>
        <td>${kg2(data.bone_g)}</td>
      </tr>
    `
  }).join('')

  return `
    <div class="page">
      ${pageHeader(pt, 'REGIONAL ANALYSIS', 'Regional Fat Distribution · Body Composition Breakdown')}
      <div class="page-body">
        <div class="grid-5" style="gap: 4mm;">
          ${regionGrid}
        </div>

        <table class="region-table">
          <thead>
            <tr>
              <th>Region</th>
              <th>Fat %</th>
              <th>Total (kg)</th>
              <th style="color: var(--optimal);">Lean (kg)</th>
              <th style="color: var(--elevated);">Fat (kg)</th>
              <th>Bone (kg)</th>
            </tr>
          </thead>
          <tbody>
            ${regionTableRows}
          </tbody>
        </table>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm;">
          <div class="card">
            <div class="card-title">Distribution Pattern</div>
            <div class="card-value">${comp.ag_ratio ? pct(comp.ag_ratio) : 'N/A'}</div>
            <div class="card-sub">Android/Gynoid Ratio</div>
          </div>
          <div class="card">
            <div class="card-title">Upper Body</div>
            <div class="card-value status-elevated">${comp.android_fat_pct ? pct(comp.android_fat_pct) : 'N/A'}%</div>
            <div class="card-sub">Android Fat %</div>
          </div>
          <div class="card">
            <div class="card-title">Lower Body</div>
            <div class="card-value status-optimal">${comp.gynoid_fat_pct ? pct(comp.gynoid_fat_pct) : 'N/A'}%</div>
            <div class="card-sub">Gynoid Fat %</div>
          </div>
        </div>
      </div>
      ${pageFooter(3, 9)}
    </div>
  `
}

/* ─────────────────────────────────────────────────────────────────────────
   PAGE 4: SECTIONAL ANALYSIS
───────────────────────────────────────────────────────────────────────────── */
function page4(reportData) {
  const { patient: pt, composition: comp, images: img } = reportData

  const samplePath = '/tmp/claude-1000/-home-sdrc-projects-sdrc-dexa/2ccadac3-ed24-437a-be2d-f697c2efbd1f/scratchpad/sample-009.png'
  const sectionalUrl = imgSrc(samplePath, img?.composite_url)

  const calloutRegions = [
    { name: 'Trunk', key: 'Trunk' },
    { name: 'Android', key: 'Android' },
    { name: 'Arms', key: 'Arms' },
    { name: 'Gynoid', key: 'Gynoid' },
    { name: 'Legs', key: 'Legs' }
  ]

  const callouts = calloutRegions.map(r => {
    const data = comp.regions?.[r.key]
    if (!data) return ''
    const fatClass = getFatColorClass(data.fat_pct)
    return `
      <div class="card">
        <div style="font-weight: 600; margin-bottom: 2mm;">${r.name}</div>
        <div class="card-value ${fatClass}">${pct(data.fat_pct)}%</div>
        <div class="card-sub">Regional fat composition</div>
      </div>
    `
  }).join('')

  return `
    <div class="page">
      ${pageHeader(pt, 'SECTIONAL ANALYSIS', 'Central Body Breakdown · Regional Callout Map')}
      <div class="page-body">
        <div class="grid-2" style="gap: 8mm; flex: 1;">
          <div class="dx-img-frame" style="height: 100%; min-height: 200mm;">
            <img src="${esc(sectionalUrl)}" alt="Sectional body diagram" style="max-width: 200mm; max-height: 250mm;" />
          </div>
          <div style="display: flex; flex-direction: column; gap: 4mm;">
            ${callouts}
          </div>
        </div>

        <div class="guidance-box">
          <div class="guidance-title">SECTIONAL METHODOLOGY</div>
          <div class="guidance-text">
            This sectional view maps your body into distinct regions: trunk (core), android (upper body/abdomen), gynoid (lower body), and appendicular (arms and legs). Regional fat distribution patterns help identify metabolic risk and guide targeted interventions.
          </div>
        </div>
      </div>
      ${pageFooter(4, 9)}
    </div>
  `
}

/* ─────────────────────────────────────────────────────────────────────────
   PAGE 5: BILATERAL SYMMETRY (Part 1)
───────────────────────────────────────────────────────────────────────────── */
function page5(reportData) {
  const { patient: pt, bilateral: bilateral } = reportData

  const armImgs = [
    { side: 'Left', sample: 'sample-011' },
    { side: 'Right', sample: 'sample-012' }
  ]

  const legImgs = [
    { side: 'Left', sample: 'sample-013' },
    { side: 'Right', sample: 'sample-014' }
  ]

  const armBalance = bilateral?.arms
    ? Math.abs((bilateral.arms.left?.fat_pct || 0) - (bilateral.arms.right?.fat_pct || 0))
    : null
  const legBalance = bilateral?.legs
    ? Math.abs((bilateral.legs.left?.fat_pct || 0) - (bilateral.legs.right?.fat_pct || 0))
    : null

  const armStatus = armBalance != null
    ? armBalance < 15 ? '✓ Normal' : armBalance < 25 ? '⚠ Notable' : '✗ Significant'
    : 'N/A'

  const legStatus = legBalance != null
    ? legBalance < 10 ? '✓ Normal' : legBalance < 15 ? '⚠ Notable' : '✗ Significant'
    : 'N/A'

  return `
    <div class="page">
      ${pageHeader(pt, 'LEFT VS RIGHT SYMMETRY', 'Bilateral Composition Analysis · Body Balance Assessment')}
      <div class="page-body">
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6mm; margin-bottom: 6mm;">
          <div class="dx-img-frame" style="height: 100px;">
            <img src="/tmp/claude-1000/-home-sdrc-projects-sdrc-dexa/2ccadac3-ed24-437a-be2d-f697c2efbd1f/scratchpad/sample-011.png" alt="Left arm" />
          </div>
          <div style="display: flex; align-items: center; justify-content: center;">
            <div style="text-align: center;">
              <div style="font-size: 24px; font-weight: 900; color: var(--optimal-dark);">⚖</div>
              <div style="font-size: 11px; font-weight: 600; margin-top: 2mm;">${armStatus}</div>
              <div style="font-size: 9px; color: var(--text-muted); margin-top: 1mm;">${armBalance ? armBalance.toFixed(1) + '%' : 'N/A'}</div>
            </div>
          </div>
          <div class="dx-img-frame" style="height: 100px;">
            <img src="/tmp/claude-1000/-home-sdrc-projects-sdrc-dexa/2ccadac3-ed24-437a-be2d-f697c2efbd1f/scratchpad/sample-012.png" alt="Right arm" />
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm; margin-bottom: 6mm;">
          <div style="text-align: center;">
            <div class="bilateral-value">${bilateral?.arms?.left?.fat_pct ? pct(bilateral.arms.left.fat_pct) + '%' : 'N/A'}</div>
            <div style="font-size: 9px; color: var(--text-muted); margin-top: 1mm;">Left Arm Fat</div>
          </div>
          <div></div>
          <div style="text-align: center;">
            <div class="bilateral-value">${bilateral?.arms?.right?.fat_pct ? pct(bilateral.arms.right.fat_pct) + '%' : 'N/A'}</div>
            <div style="font-size: 9px; color: var(--text-muted); margin-top: 1mm;">Right Arm Fat</div>
          </div>
        </div>

        <hr style="border: none; border-top: 1px solid var(--border); margin: 4mm 0;" />

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6mm; margin-bottom: 6mm;">
          <div class="dx-img-frame" style="height: 100px;">
            <img src="/tmp/claude-1000/-home-sdrc-projects-sdrc-dexa/2ccadac3-ed24-437a-be2d-f697c2efbd1f/scratchpad/sample-013.png" alt="Left leg" />
          </div>
          <div style="display: flex; align-items: center; justify-content: center;">
            <div style="text-align: center;">
              <div style="font-size: 24px; font-weight: 900; color: var(--optimal-dark);">⚖</div>
              <div style="font-size: 11px; font-weight: 600; margin-top: 2mm;">${legStatus}</div>
              <div style="font-size: 9px; color: var(--text-muted); margin-top: 1mm;">${legBalance ? legBalance.toFixed(1) + '%' : 'N/A'}</div>
            </div>
          </div>
          <div class="dx-img-frame" style="height: 100px;">
            <img src="/tmp/claude-1000/-home-sdrc-projects-sdrc-dexa/2ccadac3-ed24-437a-be2d-f697c2efbd1f/scratchpad/sample-014.png" alt="Right leg" />
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm;">
          <div style="text-align: center;">
            <div class="bilateral-value">${bilateral?.legs?.left?.fat_pct ? pct(bilateral.legs.left.fat_pct) + '%' : 'N/A'}</div>
            <div style="font-size: 9px; color: var(--text-muted); margin-top: 1mm;">Left Leg Fat</div>
          </div>
          <div></div>
          <div style="text-align: center;">
            <div class="bilateral-value">${bilateral?.legs?.right?.fat_pct ? pct(bilateral.legs.right.fat_pct) + '%' : 'N/A'}</div>
            <div style="font-size: 9px; color: var(--text-muted); margin-top: 1mm;">Right Leg Fat</div>
          </div>
        </div>
      </div>
      ${pageFooter(5, 9)}
    </div>
  `
}

/* ─────────────────────────────────────────────────────────────────────────
   PAGE 6: BILATERAL SYMMETRY (Part 2)
───────────────────────────────────────────────────────────────────────────── */
function page6(reportData) {
  const { patient: pt, bilateral: bilateral } = reportData

  const trunkBalance = bilateral?.trunk
    ? Math.abs((bilateral.trunk.left?.fat_pct || 0) - (bilateral.trunk.right?.fat_pct || 0))
    : null

  let symmetryStatus = 'N/A'
  let symmetryColor = 'var(--acceptable)'
  if (trunkBalance != null) {
    if (trunkBalance < 10) {
      symmetryStatus = 'Well-Balanced'
      symmetryColor = 'var(--optimal-dark)'
    } else if (trunkBalance < 15) {
      symmetryStatus = 'Slight Imbalance'
      symmetryColor = 'var(--acceptable)'
    } else {
      symmetryStatus = 'Significant Imbalance'
      symmetryColor = 'var(--elevated)'
    }
  }

  return `
    <div class="page">
      ${pageHeader(pt, 'SYMMETRY ASSESSMENT', 'Sectional & Whole Body Balance · Imbalance Detection')}
      <div class="page-body">
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6mm; margin-bottom: 6mm;">
          <div class="dx-img-frame" style="height: 100px;">
            <img src="/tmp/claude-1000/-home-sdrc-projects-sdrc-dexa/2ccadac3-ed24-437a-be2d-f697c2efbd1f/scratchpad/sample-015.png" alt="Left trunk" />
          </div>
          <div style="display: flex; align-items: center; justify-content: center;">
            <div style="text-align: center;">
              <div style="font-size: 24px; font-weight: 900; color: ${symmetryColor};">⚖</div>
              <div style="font-size: 11px; font-weight: 600; margin-top: 2mm;">${symmetryStatus}</div>
              <div style="font-size: 9px; color: var(--text-muted); margin-top: 1mm;">${trunkBalance ? trunkBalance.toFixed(1) + '%' : 'N/A'}</div>
            </div>
          </div>
          <div class="dx-img-frame" style="height: 100px;">
            <img src="/tmp/claude-1000/-home-sdrc-projects-sdrc-dexa/2ccadac3-ed24-437a-be2d-f697c2efbd1f/scratchpad/sample-016.png" alt="Right trunk" />
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm; margin-bottom: 6mm;">
          <div style="text-align: center;">
            <div class="bilateral-value">${bilateral?.trunk?.left?.fat_pct ? pct(bilateral.trunk.left.fat_pct) + '%' : 'N/A'}</div>
            <div style="font-size: 9px; color: var(--text-muted); margin-top: 1mm;">Left Trunk Fat</div>
          </div>
          <div></div>
          <div style="text-align: center;">
            <div class="bilateral-value">${bilateral?.trunk?.right?.fat_pct ? pct(bilateral.trunk.right.fat_pct) + '%' : 'N/A'}</div>
            <div style="font-size: 9px; color: var(--text-muted); margin-top: 1mm;">Right Trunk Fat</div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm;">
          <div class="card bg-optimal" style="text-align: center;">
            <div style="font-size: 14px; font-weight: 700;">Well-Balanced</div>
            <div style="font-size: 9px; margin-top: 2mm;">Symmetrical fat distribution</div>
          </div>
          <div class="card bg-acceptable" style="text-align: center;">
            <div style="font-size: 14px; font-weight: 700;">Slight Imbalance</div>
            <div style="font-size: 9px; margin-top: 2mm;">Minor asymmetry detected</div>
          </div>
          <div class="card bg-elevated" style="text-align: center;">
            <div style="font-size: 14px; font-weight: 700;">Significant Imbalance</div>
            <div style="font-size: 9px; margin-top: 2mm;">Warrants clinical review</div>
          </div>
        </div>

        <div class="guidance-box" style="margin-top: 6mm;">
          <div class="guidance-title">WHOLE-BODY SYMMETRY ASSESSMENT</div>
          <div class="guidance-text">
            Your overall bilateral symmetry status is: <strong>${symmetryStatus}</strong>. Body asymmetry is natural, but significant imbalances may indicate postural issues, training imbalances, or underlying muscle weakness. Address asymmetry through targeted unilateral exercises and corrective programming.
          </div>
        </div>
      </div>
      ${pageFooter(6, 9)}
    </div>
  `
}

/* ─────────────────────────────────────────────────────────────────────────
   PAGE 7: BONE HEALTH
───────────────────────────────────────────────────────────────────────────── */
function page7(reportData) {
  const { patient: pt, bone } = reportData

  const boneRegions = [
    { label: 'Head', sample: 'sample-017', value: 'N/A' },
    { label: 'Spine', sample: 'sample-018', value: bone?.spine_t?.toFixed(1) || 'N/A' },
    { label: 'Hip', sample: 'sample-019', value: bone?.hip_t?.toFixed(1) || 'N/A' },
    { label: 'Forearm', sample: 'sample-020', value: 'N/A' },
    { label: 'Ribs', sample: 'sample-021', value: 'N/A' },
    { label: 'Pelvis', sample: 'sample-022', value: 'N/A' },
    { label: 'L. Arm', sample: 'sample-023', value: 'N/A' },
    { label: 'R. Arm', sample: 'sample-024', value: 'N/A' }
  ]

  const boneGrid = boneRegions.map(b => `
    <div class="bone-region-card">
      <div class="dx-img-frame" style="width: 100%; height: 80px;">
        <img src="/tmp/claude-1000/-home-sdrc-projects-sdrc-dexa/2ccadac3-ed24-437a-be2d-f697c2efbd1f/scratchpad/${b.sample}.png" alt="${b.label}" class="bone-region-img" />
      </div>
      <div class="bone-region-label">${b.label}</div>
      <div class="bone-region-value">${b.value}</div>
    </div>
  `).join('')

  // T-score marker position (convert T-score to percentage)
  const tMarkerPct = Math.min(Math.max(((bone?.total_t || -1) + 4) / 8 * 100, 0), 100)

  const tInterpretation = getTScoreInterpretation(bone?.total_t)

  return `
    <div class="page">
      ${pageHeader(pt, 'BONE HEALTH', 'Skeletal Density Analysis · Fracture Risk Assessment')}
      <div class="page-body">
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm; margin-bottom: 6mm;">
          <div class="card">
            <div class="card-title">BMD</div>
            <div class="card-value">${bone?.total_bmd?.toFixed(2) || 'N/A'}</div>
            <div class="card-sub">g/cm²</div>
          </div>
          <div class="card">
            <div class="card-title">T-Score</div>
            <div class="card-value status-optimal">${bone?.total_t?.toFixed(1) ? (bone.total_t >= 0 ? '+' : '') + bone.total_t.toFixed(1) : 'N/A'}</div>
            <div class="card-sub">${tInterpretation}</div>
          </div>
          <div class="card">
            <div class="card-title">Z-Score</div>
            <div class="card-value">${bone?.total_z?.toFixed(1) ? (bone.total_z >= 0 ? '+' : '') + bone.total_z.toFixed(1) : 'N/A'}</div>
            <div class="card-sub">Age-matched</div>
          </div>
        </div>

        <div style="margin-bottom: 6mm;">
          <div style="font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted); margin-bottom: 2mm;">T-Score Scale (WHO)</div>
          <div class="scale-bar" style="background: linear-gradient(to right, #991B1B 0%, #EF4444 25%, #FB923C 50%, #7C3AED 75%, #00D9FF 100%); height: 24px;">
            <div class="scale-marker" style="left: ${tMarkerPct}%;">
              <div class="scale-marker-dot"></div>
              <div class="scale-marker-line"></div>
              <div class="scale-marker-label" style="font-size: 11px; font-weight: 700;">${bone?.total_t?.toFixed(1) || '—'}</div>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 8px; color: var(--text-muted); margin-top: 2mm; letter-spacing: 0.05em; text-transform: uppercase; font-weight: 600;">
            <span>Osteoporosis</span>
            <span>Osteopenia</span>
            <span>Normal</span>
          </div>
        </div>

        <div class="grid-2x4">
          ${boneGrid}
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm; margin-top: 6mm;">
          <div class="guidance-box" style="border-left-color: var(--optimal);">
            <div class="guidance-title">WHAT IS T/Z SCORE?</div>
            <div class="guidance-text">T-score compares your bone density to healthy 30-year-old peak. Z-score compares to same age and gender. Both are measured in standard deviations (SD).</div>
          </div>
          <div class="guidance-box" style="border-left-color: var(--elevated);">
            <div class="guidance-title">WHEN TO BE CONCERNED?</div>
            <div class="guidance-text">T ≥ -1.0: Normal. T -1.0 to -2.5: Osteopenia. T &lt; -2.5: Osteoporosis (clinical intervention recommended).</div>
          </div>
          <div class="guidance-box" style="border-left-color: var(--optimal);">
            <div class="guidance-title">HOW TO IMPROVE?</div>
            <div class="guidance-text">Resistance training, adequate calcium and vitamin D intake, and weight-bearing exercise strengthen bone. Consult healthcare providers for medical management if needed.</div>
          </div>
        </div>
      </div>
      ${pageFooter(7, 9)}
    </div>
  `
}

/* ─────────────────────────────────────────────────────────────────────────
   PAGE 8: ANDROID-GYNOID RATIO
───────────────────────────────────────────────────────────────────────────── */
function page8(reportData) {
  const { patient: pt, composition: comp } = reportData
  const male = (pt.gender || '').toLowerCase().startsWith('m')

  const agRatio = comp.ag_ratio || 0

  // Body shape interpretation
  let shapeVariant = 'Rectangle'
  let shapeEmoji = '▭'
  if (agRatio < 0.75) {
    shapeVariant = 'Pear'
    shapeEmoji = '🍐'
  } else if (agRatio < 0.85) {
    shapeVariant = 'Hourglass'
    shapeEmoji = '⌛'
  } else if (agRatio < 1.0) {
    shapeVariant = 'Triangle'
    shapeEmoji = '△'
  } else if (agRatio < 1.15) {
    shapeVariant = 'Rectangle'
    shapeEmoji = '▭'
  } else {
    shapeVariant = 'Round'
    shapeEmoji = '⭕'
  }

  return `
    <div class="page">
      ${pageHeader(pt, 'ANDROID-GYNOID RATIO', 'Body Shape & Fat Distribution · Shape Classification')}
      <div class="page-body">
        <div class="card" style="background: linear-gradient(135deg, rgba(0,217,255,0.1) 0%, rgba(251,147,60,0.1) 100%); border: 2px solid var(--optimal); text-align: center; padding: 6mm;">
          <div style="font-size: 14px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: var(--text-muted); margin-bottom: 2mm;">A/G Ratio</div>
          <div style="font-size: 48px; font-weight: 900; color: var(--optimal-dark);">${pct(agRatio)}</div>
          <div class="card-sub">Android (upper) ÷ Gynoid (lower)</div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 4mm; margin: 8mm 0;">
          <div class="card" style="text-align: center; ${shapeVariant === 'Pear' ? 'border: 2px solid var(--optimal);' : ''} background: ${shapeVariant === 'Pear' ? 'rgba(0,217,255,0.1)' : 'var(--light-base)'};">
            <div style="font-size: 32px; margin-bottom: 2mm;">🍐</div>
            <div style="font-weight: 600;">Pear</div>
            <div style="font-size: 8px; color: var(--text-muted); margin-top: 1mm;">Gynoid-dominant</div>
          </div>
          <div class="card" style="text-align: center; ${shapeVariant === 'Hourglass' ? 'border: 2px solid var(--optimal);' : ''} background: ${shapeVariant === 'Hourglass' ? 'rgba(0,217,255,0.1)' : 'var(--light-base)'};">
            <div style="font-size: 32px; margin-bottom: 2mm;">⌛</div>
            <div style="font-weight: 600;">Hourglass</div>
            <div style="font-size: 8px; color: var(--text-muted); margin-top: 1mm;">Balanced</div>
          </div>
          <div class="card" style="text-align: center; ${shapeVariant === 'Triangle' ? 'border: 2px solid var(--acceptable);' : ''} background: ${shapeVariant === 'Triangle' ? 'rgba(167,139,250,0.1)' : 'var(--light-base)'};">
            <div style="font-size: 32px; margin-bottom: 2mm;">△</div>
            <div style="font-weight: 600;">Triangle</div>
            <div style="font-size: 8px; color: var(--text-muted); margin-top: 1mm;">Android-dominant</div>
          </div>
          <div class="card" style="text-align: center; ${shapeVariant === 'Rectangle' ? 'border: 2px solid var(--acceptable);' : ''} background: ${shapeVariant === 'Rectangle' ? 'rgba(167,139,250,0.1)' : 'var(--light-base)'};">
            <div style="font-size: 32px; margin-bottom: 2mm;">▭</div>
            <div style="font-weight: 600;">Rectangle</div>
            <div style="font-size: 8px; color: var(--text-muted); margin-top: 1mm;">Uniform</div>
          </div>
          <div class="card" style="text-align: center; ${shapeVariant === 'Round' ? 'border: 2px solid var(--elevated);' : ''} background: ${shapeVariant === 'Round' ? 'rgba(251,147,60,0.1)' : 'var(--light-base)'};">
            <div style="font-size: 32px; margin-bottom: 2mm;">⭕</div>
            <div style="font-weight: 600;">Round</div>
            <div style="font-size: 8px; color: var(--text-muted); margin-top: 1mm;">Central obesity</div>
          </div>
        </div>

        <div class="guidance-box">
          <div class="guidance-title">BODY SHAPE INTERPRETATION</div>
          <div class="guidance-text">
            Your body shape is classified as <strong>${shapeVariant}</strong>.
            ${agRatio < 0.8 ? 'Your gynoid-dominant pattern (lower body fat distribution) is associated with lower metabolic risk.' : ''}
            ${agRatio >= 0.8 && agRatio <= 1.0 ? 'Your balanced fat distribution suggests even risk profile across body regions.' : ''}
            ${agRatio > 1.0 ? 'Your android-dominant pattern (upper body/abdominal fat) is associated with higher metabolic risk. Focus on visceral fat reduction through cardio and resistance training.' : ''}
          </div>
        </div>

        <div class="guidance-box" style="border-left-color: var(--elevated);">
          <div class="guidance-title">METABOLIC RISK PROFILE</div>
          <div class="guidance-text">
            Android (upper body/central) fat distribution is linked to increased risk for insulin resistance and cardiovascular disease. Gynoid (lower body) fat is metabolically less concerning. Work with your healthcare team to develop targeted interventions based on your A/G pattern.
          </div>
        </div>
      </div>
      ${pageFooter(8, 9)}
    </div>
  `
}

/* ─────────────────────────────────────────────────────────────────────────
   PAGE 9: REGIONAL LEAN TISSUE TRENDS
───────────────────────────────────────────────────────────────────────────── */
function page9(reportData) {
  const { patient: pt, composition: comp } = reportData

  const sections = [
    { title: 'Arms', key: 'Arms', sample: 'sample-007' },
    { title: 'Legs', key: 'Legs', sample: 'sample-010' },
    { title: 'Trunk', key: 'Trunk', sample: 'sample-002' }
  ]

  const sectionRows = sections.map(sec => {
    const data = comp.regions?.[sec.key]
    if (!data) return ''
    return `
      <div style="display: grid; grid-template-columns: 0.6fr 1fr; gap: 6mm; margin-bottom: 6mm; padding-bottom: 6mm; border-bottom: 1px solid var(--border);">
        <div class="dx-img-frame" style="height: 140px;">
          <img src="/tmp/claude-1000/-home-sdrc-projects-sdrc-dexa/2ccadac3-ed24-437a-be2d-f697c2efbd1f/scratchpad/${sec.sample}.png" alt="${sec.title}" />
        </div>
        <div style="display: flex; flex-direction: column; gap: 4mm;">
          <div>
            <table class="region-table" style="width: 100%;">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Lean Mass (kg)</th>
                  <th>Δ vs Baseline</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Baseline</strong></td>
                  <td>${kg2(data.lean_g)}</td>
                  <td>—</td>
                </tr>
                <tr>
                  <td><strong>Current</strong></td>
                  <td>${kg2(data.lean_g)}</td>
                  <td><span style="color: var(--optimal);">No prior scan</span></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="card">
            <div style="font-size: 10px; font-weight: 600; color: var(--text-muted); letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 2mm;">Regional Status</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4mm;">
              <div>
                <div class="metric-value status-optimal" style="font-size: 18px;">${pct(data.lean_pct)}%</div>
                <div style="font-size: 9px; color: var(--text-muted);">Lean %</div>
              </div>
              <div>
                <div class="metric-value" style="font-size: 18px;">${kg2(data.total_g)}</div>
                <div style="font-size: 9px; color: var(--text-muted);">Total (kg)</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `
  }).join('')

  return `
    <div class="page">
      ${pageHeader(pt, 'LEAN TISSUE TRENDS', 'Regional Muscle Mass Changes · Progress Tracking')}
      <div class="page-body">
        ${sectionRows}

        <div class="guidance-box" style="margin-top: 6mm;">
          <div class="guidance-title">LEAN MASS PRESERVATION</div>
          <div class="guidance-text">
            Maintaining or building lean muscle mass is critical during fat loss. Regional lean tissue trends show muscle development in specific areas. Continue resistance training to preserve or enhance muscle quality while reducing fat mass. Compare future scans to track progress.
          </div>
        </div>
      </div>
      ${pageFooter(9, 9)}
    </div>
  `
}

/* ─────────────────────────────────────────────────────────────────────────
   MAIN EXPORT
───────────────────────────────────────────────────────────────────────────── */
export function generateComprehensiveHtml(reportData) {
  const pages = [
    page1(reportData),
    page2(reportData),
    page3(reportData),
    page4(reportData),
    page5(reportData),
    page6(reportData),
    page7(reportData),
    page8(reportData),
    page9(reportData)
  ]

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes" />
      <title>SDRC DEXA Comprehensive Report</title>
      <style>${CSS}</style>
    </head>
    <body>
      <div class="pages">
        ${pages.join('')}
      </div>
    </body>
    </html>
  `
}
