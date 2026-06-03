/**
 * @file SDRC DEXA — "Editorial" report template.
 * Warm editorial aesthetic: Geist + Instrument Serif, cream paper, terracotta accent.
 * Drop-in alongside bmd-html-template.js — same data contract, same opts shape.
 */

import { densitometryChart } from './densitometry-chart.js'
import { esc, tbFmtDate, kg, kg2, pct } from './report-utils.js'
import { summaryItems, fatLossTargets, scanDelta, muscleContext, boneGuide, almiBadge, boneClassBadge, centileText } from './report-components.js'

const _BASE = process.env.NEXT_PUBLIC_BASEPATH || ''

/* ── helpers ─────────────────────────────────────────────────────────────── */
function clamp(v) { return Math.min(Math.max(v, 1), 99) }

/* ── CSS ──────────────────────────────────────────────────────────────────── */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap');
  :root {
    --paper:       #F5F1EA;
    --paper-2:     #EFEAE0;
    --ink:         #2D2419;
    --ink-2:       #4A3F30;
    --muted:       #7A7164;
    --hairline:    #D9D2C5;
    --hairline-2:  #C9C1B1;
    --accent:      #C84A2C;
    --accent-soft: #E8B5A3;
    --sage:        #5C7A4D;
    --amber:       #B8862C;
    --slate:       #4A5366;
    --olive:       #5E6B30;
    --olive-deep:  #3D4520;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: "Geist", ui-sans-serif, system-ui, -apple-system, sans-serif;
    color: var(--ink);
    background: #E5DFD3;
    -webkit-font-smoothing: antialiased;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .pages { display: flex; flex-direction: column; align-items: center; gap: 14mm; padding: 14mm 0; }
  .page {
    width: 210mm; height: 297mm;
    background: var(--paper); color: var(--ink);
    padding: 16mm;
    position: relative; overflow: hidden;
    display: flex; flex-direction: column;
  }
  /* page header */
  .ph {
    display: grid; grid-template-columns: 1fr auto; align-items: center;
    gap: 10mm; padding-bottom: 4mm; margin-bottom: 0;
  }
  .ph.ruled { border-bottom: 1px solid var(--hairline); }
  .brand-row { display: flex; align-items: center; gap: 10px; }
  .brand-logo { height: 32px; width: auto; display: block; }
  .brand-div { width: 1px; height: 20px; background: var(--hairline-2); }
  .brand-text .b1 { font-size: 9.5px; letter-spacing: .18em; text-transform: uppercase; font-weight: 600; white-space: nowrap; }
  .brand-text .b2 { font-size: 9px; color: var(--muted); letter-spacing: .16em; text-transform: uppercase; margin-top: 1px; white-space: nowrap; }
  .pat-block { text-align: right; font-size: 9.5px; line-height: 1.5; color: var(--muted); white-space: nowrap; }
  .pat-block .pname { color: var(--ink); font-weight: 600; font-size: 11px; letter-spacing: .06em; text-transform: uppercase; }
  /* page title */
  .pt { margin-top: 5mm; display: grid; grid-template-columns: auto 1fr; gap: 8mm; align-items: baseline; }
  .pt-num { font-family: "Instrument Serif", serif; font-style: italic; font-size: 52px; line-height: .9; color: var(--accent); letter-spacing: -.02em; }
  .pt-txt .kicker { font-size: 10px; letter-spacing: .22em; text-transform: uppercase; color: var(--muted); margin-bottom: 3px; font-weight: 500; }
  .pt-txt h1 { margin: 0; font-family: "Instrument Serif", serif; font-weight: 400; font-size: 30px; letter-spacing: -.01em; line-height: 1.08; }
  .pt-txt h1 em { font-style: italic; color: var(--accent); }
  /* page body + footer */
  .pb { flex: 1; padding-top: 6mm; display: flex; flex-direction: column; gap: 8mm; min-height: 0; }
  .pf { border-top: 1px solid var(--hairline); padding-top: 3mm; margin-top: auto; display: flex; justify-content: space-between; align-items: center; font-size: 9px; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); flex-shrink: 0; }
  .pf .pno { font-family: "Instrument Serif", serif; font-style: italic; font-size: 13px; text-transform: none; letter-spacing: 0; color: var(--ink); }
  /* cover stripe (page 1 only) */
  .cover-stripe { position: absolute; left: 0; right: 0; top: 0; height: 6mm; background: var(--accent); }
  /* layout */
  .row-2  { display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; }
  .row-2a { display: grid; grid-template-columns: 1.25fr 1fr; gap: 8mm; }
  .with-scan { display: grid; grid-template-columns: 52mm 1fr; gap: 8mm; flex: 1; min-height: 0; }
  .with-scan > .col { display: flex; flex-direction: column; gap: 5mm; min-width: 0; }
  /* panel */
  .panel { border: 1px solid var(--hairline); padding: 5mm; background: var(--paper); }
  .panel.dark {
    background: var(--olive-deep); color: var(--paper); border-color: var(--olive-deep);
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .panel.dark .muted { color: rgba(245,241,234,0.6); }
  .ptitle { font-family: "Instrument Serif", serif; font-style: italic; font-size: 18px; margin: 0 0 3mm 0; line-height: 1.1; font-weight: 400; }
  .ptitle small { display: block; font-family: "Geist", sans-serif; font-style: normal; font-size: 9.5px; letter-spacing: .18em; text-transform: uppercase; color: var(--muted); margin-bottom: 2mm; font-weight: 500; }
  /* primitives */
  .kicker { font-size: 10px; letter-spacing: .22em; text-transform: uppercase; color: var(--muted); font-weight: 500; }
  .hair { border: 0; border-top: 1px solid var(--hairline); margin: 0; }
  .pill { display: inline-flex; align-items: center; gap: 6px; padding: 3px 9px 3px 7px; border-radius: 999px; font-size: 9.5px; letter-spacing: .08em; text-transform: uppercase; font-weight: 500; background: var(--paper-2); border: 1px solid var(--hairline); color: var(--ink-2); }
  .pill::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
  .pill.sage   { color: var(--sage);   background: #E5EBDD; border-color: #C7D3B8; }
  .pill.amber  { color: var(--amber);  background: #F0E5C9; border-color: #D9C68A; }
  .pill.accent { color: var(--accent); background: #F4DDD3; border-color: #E6B7A2; }
  /* stacked bar */
  .stack { display: flex; height: 20px; border-radius: 3px; overflow: hidden; box-shadow: inset 0 0 0 1px var(--hairline); }
  .stack > span { display: flex; align-items: center; padding: 0 8px; font-size: 10px; font-weight: 500; color: var(--paper); letter-spacing: .02em; white-space: nowrap; }
  .seg-fat  { background: var(--accent); }
  .seg-lean { background: var(--olive); }
  .seg-bmc  { background: var(--slate); }
  .legend { display: flex; gap: 12px; font-size: 10px; color: var(--ink-2); margin-top: 5px; }
  .dot { width: 8px; height: 8px; border-radius: 2px; display: inline-block; margin-right: 5px; vertical-align: -1px; }
  /* tiles */
  .tiles { display: grid; grid-template-columns: repeat(3, 1fr); border: 1px solid var(--hairline); }
  .tile { padding: 5mm; border-right: 1px solid var(--hairline); display: flex; flex-direction: column; gap: 2mm; }
  .tile:last-child { border-right: 0; }
  .tile .v { font-family: "Instrument Serif", serif; font-size: 40px; line-height: 1; letter-spacing: -.02em; }
  .tile .v small { font-family: "Geist", sans-serif; font-size: 12px; color: var(--muted); margin-left: 4px; font-weight: 400; }
  .tile .sub { font-size: 9.5px; color: var(--muted); line-height: 1.4; }
  /* scale bar */
  .scale-bar { position: relative; height: 18px; display: flex; border-radius: 2px; overflow: hidden; }
  .scale-bar > span { font-size: 9px; font-weight: 500; color: var(--paper); display: grid; place-items: center; letter-spacing: .04em; min-width: 0; overflow: hidden; }
  .scale-marker { position: absolute; top: -6px; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; z-index: 2; }
  .scale-marker .dot-m { width: 12px; height: 12px; background: var(--paper); border: 2px solid var(--ink); border-radius: 50%; }
  .scale-marker .stem { width: 1px; height: 22px; background: var(--ink); margin-top: -1px; }
  .scale-marker .mv { font-family: "Instrument Serif", serif; font-style: italic; font-size: 13px; color: var(--ink); margin-top: 3px; line-height: 1; white-space: nowrap; }
  /* data table */
  table.data { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
  table.data th, table.data td { text-align: right; padding: 5px 7px; font-size: 10.5px; border-bottom: 1px solid var(--hairline); }
  table.data th:first-child, table.data td:first-child { text-align: left; }
  table.data thead th { font-size: 9px; letter-spacing: .14em; text-transform: uppercase; color: var(--muted); font-weight: 500; border-bottom: 1px solid var(--hairline-2); padding-bottom: 7px; padding-top: 0; }
  table.data tbody td.r { color: var(--ink); }
  table.data tbody td.tag { text-align: left; font-size: 9.5px; letter-spacing: .06em; text-transform: uppercase; font-weight: 500; color: var(--muted); }
  table.data tbody td.tag.sage   { color: var(--sage); }
  table.data tbody td.tag.amber  { color: var(--amber); }
  table.data tbody td.tag.accent { color: var(--accent); }
  table.data tbody tr:last-child td { border-bottom: 0; }
  /* region rows */
  .region-row { display: grid; grid-template-columns: 60px 1fr 100px; align-items: center; gap: 10px; padding: 3.5mm 0; border-bottom: 1px solid var(--hairline); }
  .region-row:last-child { border-bottom: 0; }
  .region-row .rname { font-family: "Instrument Serif", serif; font-style: italic; font-size: 20px; line-height: 1; }
  .region-row .rtotal { text-align: right; font-variant-numeric: tabular-nums; font-size: 10px; color: var(--ink-2); }
  .region-row .rtotal strong { font-family: "Instrument Serif", serif; font-size: 16px; font-weight: 400; color: var(--ink); display: block; line-height: 1.1; }
  /* findings */
  .findings { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm; }
  .finding { border: 1px solid var(--hairline); padding: 4mm; display: flex; flex-direction: column; gap: 1.5mm; background: var(--paper); position: relative; }
  .finding::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--sage); }
  .finding.caution::before  { background: var(--amber); }
  .finding.attention::before { background: var(--accent); }
  .finding h4 { margin: 0; font-family: "Instrument Serif", serif; font-style: italic; font-size: 15px; font-weight: 400; line-height: 1.15; }
  .finding p  { margin: 0; font-size: 10px; line-height: 1.5; color: var(--ink-2); }
  /* scan slot */
  .scan { position: relative; padding: 4mm 3mm; border: 1px solid var(--hairline); background: repeating-linear-gradient(45deg, transparent 0 6px, rgba(200,74,44,.03) 6px 7px), var(--paper-2); display: flex; flex-direction: column; align-items: center; gap: 3mm; }
  .scan.tall { flex: 1; }
  .scan-img { width: 100%; height: auto; flex: 1; object-fit: contain; display: block; mix-blend-mode: multiply; }
  .scan-tag { position: absolute; top: 4mm; right: 4mm; font-size: 8px; letter-spacing: .16em; text-transform: uppercase; color: var(--accent); background: var(--paper); border: 1px solid var(--accent-soft); padding: 2px 6px; border-radius: 999px; }
  .scan-caption { font-size: 9px; color: var(--muted); letter-spacing: .1em; text-transform: uppercase; text-align: center; }
  .scan-disc { font-size: 8px; color: var(--muted); text-align: center; font-style: italic; }
  /* copy */
  .copy { font-size: 10.5px; line-height: 1.55; color: var(--ink-2); }
  .copy p { margin: 0 0 2mm 0; }
  .copy p:last-child { margin-bottom: 0; }
  .copy strong { color: var(--ink); font-weight: 600; }
  /* activity */
  .activity { display: grid; grid-template-columns: repeat(4, 1fr); border: 1px solid var(--hairline); }
  .activity > div { padding: 3.5mm 4mm; border-right: 1px solid var(--hairline); }
  .activity > div:last-child { border-right: 0; }
  .activity .lvl  { font-size: 9px; letter-spacing: .16em; text-transform: uppercase; color: var(--muted); }
  .activity .kcal { font-family: "Instrument Serif", serif; font-size: 24px; line-height: 1.1; }
  /* letterhead = print on brown paper: strip all cream backgrounds */
  body.lh { background: transparent; }
  body.lh .page { background: transparent; box-shadow: none; }
  body.lh .panel { background: transparent; }
  body.lh .scan { background: transparent; border-color: var(--hairline-2); }
  body.lh .scan-img { mix-blend-mode: multiply; }
  body.lh .tile { background: transparent; }
  /* print */
  @page { size: A4; margin: 0; }
  @media print {
    body { background: transparent; }
    .pages { gap: 0; padding: 0; }
    .page { box-shadow: none; page-break-after: always; break-after: page; background: transparent; }
    .page:last-child { page-break-after: auto; }
    .scan { background: transparent; border-color: var(--hairline-2); }
    .scan-img { mix-blend-mode: multiply; }
    .panel.dark { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`

/* ── Shared chrome ───────────────────────────────────────────────────────── */
function pageHeader(pt, subtitle) {
  return `
  <header class="ph ruled" style="margin-top:${subtitle === 'Whole-Body Report' ? '3mm' : '0'}">
    <div class="brand-row">
      <img class="brand-logo" src="https://www.sdrc.in/assets/sdrc-logo-full.png" alt="SDRC Diagnostics" />
      <div class="brand-div"></div>
      <div class="brand-text">
        <div class="b1">DEXA · Body Composition</div>
        <div class="b2">${esc(subtitle)}</div>
      </div>
    </div>
    <div class="pat-block">
      <div class="pname">${esc(pt.name)}</div>
      <div>${esc(pt.gender)} · ${pt.age}y · ${pt.height_cm} cm · ${pt.weight_entered_kg} kg</div>
      <div>ID ${esc(pt.id)} · Scan ${esc(pt.scan_date)} ${esc(pt.scan_time)}</div>
    </div>
  </header>`
}

function pageTitle(num, kicker, title) {
  return `
  <div class="pt">
    <div class="pt-num">${num}</div>
    <div class="pt-txt">
      <div class="kicker">${esc(kicker)}</div>
      <h1>${title}</h1>
    </div>
  </div>`
}

function pageFooter(label, num, total) {
  return `
  <footer class="pf">
    <span>SDRC · DEXA Reporting · ${esc(label)}</span>
    <span class="pno">${String(num).padStart(2, '0')} / ${String(total).padStart(2, '0')}</span>
  </footer>`
}

/* ── Scale marker ────────────────────────────────────────────────────────── */
function scaleMarker(leftPct, label) {
  return `
  <div class="scale-marker" style="left:${clamp(leftPct).toFixed(1)}%">
    <div class="dot-m"></div>
    <div class="stem"></div>
    <div class="mv">${esc(label)}</div>
  </div>`
}

/* ── Stacked bar ─────────────────────────────────────────────────────────── */
function compStack(fatPct, leanPct, bonePct) {
  const fp = Number(fatPct).toFixed(1)
  const lp = Number(leanPct).toFixed(1)
  const bp = Number(bonePct).toFixed(1)
  return `
  <div class="stack">
    <span class="seg-fat"  style="width:${fp}%">${fatPct > 14 ? `Fat ${fp}%` : ''}</span>
    <span class="seg-lean" style="width:${lp}%">${leanPct > 18 ? `Lean ${lp}%` : ''}</span>
    <span class="seg-bmc"  style="width:${bp}%"></span>
  </div>`
}

/* ── Pill ────────────────────────────────────────────────────────────────── */
function pill(cls, text) {
  return `<span class="pill ${cls}">${esc(text)}</span>`
}

/* ── Region row ──────────────────────────────────────────────────────────── */
function regionRow(name, d) {
  return `
  <div class="region-row">
    <div class="rname">${esc(name)}</div>
    <div>
      ${compStack(d.fat_pct, d.lean_pct, d.bone_pct)}
      <div class="legend">
        <span>F ${pct(d.fat_pct)}%</span>
        <span>L ${pct(d.lean_pct)}%</span>
        <span>BMC ${pct(d.bone_pct)}%</span>
      </div>
    </div>
    <div class="rtotal"><strong>${kg2(d.total_g)} kg</strong>total mass</div>
  </div>`
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE 1 — BODY COMPOSITION SUMMARY
═══════════════════════════════════════════════════════════════════════════ */
function page1(data, lh, pageNum, total) {
  const { patient: pt, composition: comp, computed: calc } = data
  const male = (pt.gender || '').toLowerCase().startsWith('m')

  const aceMax  = male ? 35 : 45
  const aceBands = male
    ? [{ w: '40%', c: '#6E8F5C', lbl: 'Athletic' }, { w: '11.4%', c: '#92AE6E', lbl: 'Fit' },
       { w: '20%',  c: '#B59A4F', lbl: 'Normal'  }, { w: '28.6%', c: '#C84A2C', lbl: 'Excess' }]
    : [{ w: '46.7%', c: '#6E8F5C', lbl: 'Athletic' }, { w: '8.9%', c: '#92AE6E', lbl: 'Fit' },
       { w: '15.6%', c: '#B59A4F', lbl: 'Normal'  }, { w: '28.8%', c: '#C84A2C', lbl: 'Excess' }]
  const aceTicks = male
    ? ['&lt; 14', '14–18', '18–25', '&gt; 25']
    : ['&lt; 21', '21–25', '25–32', '&gt; 32']
  const aceMarkerPct = (comp.fat_pct / aceMax) * 100

  const [athHi, fitHi, normHi] = male ? [14, 18, 25] : [21, 25, 32]
  const aceLabel   = comp.fat_pct < athHi ? 'Athletic' : comp.fat_pct < fitHi ? 'Fit range' : comp.fat_pct < normHi ? 'Normal range' : 'Above target'
  const acePillCls = comp.fat_pct < normHi ? 'sage' : 'amber'

  const almiTagLabel = !calc.alm_available ? 'N/A'
    : calc.almi_rating === 'high' ? '↑ Excellent' : calc.almi_rating === 'low' ? '↓ Below reference' : '● Normal range'
  const almiTagCls = !calc.alm_available ? '' : calc.almi_rating === 'high' ? 'sage' : calc.almi_rating === 'low' ? 'accent' : ''
  const fmiTagLabel = calc.fat_risk === 'low' ? '● Normal' : calc.fat_risk === 'moderate' ? '↑ Borderline elevated' : '↑ Elevated'
  const fmiTagCls   = calc.fat_risk === 'low' ? '' : calc.fat_risk === 'moderate' ? 'amber' : 'accent'

  const totalKg = (comp.total_g / 1000).toFixed(1)
  const leanPctOfTotal = (comp.lean_g / comp.total_g * 100)
  const bonePctOfTotal = (comp.bmc_g  / comp.total_g * 100)

  return `
<section class="page">
  <div class="cover-stripe"></div>
  ${pageHeader(pt, 'Whole-Body Report', lh)}
  ${pageTitle('01', 'Summary', `What are my key <em>body composition</em> numbers?`)}
  <div class="pb">
    <div class="with-scan">
      <div class="scan tall">
        <span class="scan-tag">DEXA scan</span>
        <img class="scan-img" src="${esc(data.images.composite_url)}" alt="Whole-body DEXA scan" />
        <div class="scan-caption">Whole-body · ${esc(pt.scan_date)}</div>
        <div class="scan-disc">Image not for diagnosis</div>
      </div>
      <div class="col">
        <!-- Hero -->
        <div style="display:grid;grid-template-columns:1fr auto;gap:8mm;align-items:end">
          <div>
            <div class="kicker" style="margin-bottom:3mm">Body fat percentage</div>
            <div style="font-family:'Instrument Serif',serif;font-size:116px;line-height:.85;letter-spacing:-.04em;font-variant-numeric:tabular-nums">
              ${pct(comp.fat_pct)}<sup style="font-size:24px;vertical-align:top;margin-left:4px;color:var(--accent);font-style:italic">%</sup>
            </div>
            <div style="font-family:'Instrument Serif',serif;font-style:italic;font-size:16px;color:var(--ink-2);line-height:1.25;margin-top:2mm">
              ${aceLabel} for ${male ? 'men' : 'women'}${comp.centile != null ? ` · ${comp.centile}th centile vs peers` : ''}.
            </div>
          </div>
          ${calc.alm_available ? `
          <aside style="text-align:right">
            <div class="kicker">Appendicular lean mass</div>
            <div style="font-family:'Instrument Serif',serif;font-size:48px;line-height:1;letter-spacing:-.02em;margin:2mm 0;color:${calc.almi_rating === 'high' ? 'var(--sage)' : calc.almi_rating === 'normal' ? 'var(--muted)' : 'var(--accent)'}">${calc.almi}<span style="font-size:18px;color:var(--muted);font-style:italic">kg/m²</span></div>
            <div>${pill(calc.almi_rating === 'high' ? 'sage' : calc.almi_rating === 'normal' ? 'amber' : 'accent', calc.almi_rating === 'high' ? 'Excellent' : calc.almi_rating === 'normal' ? 'Normal' : 'Below threshold')}</div>
          </aside>` : `<div>${pill(acePillCls, aceLabel)}</div>`}
        </div>
        <!-- Tiles -->
        <div class="tiles">
          <div class="tile">
            <span class="kicker" style="font-size:9.5px">Fat mass</span>
            <div class="v">${kg(comp.fat_g)}<small>kg</small></div>
            <div class="sub">${pct(comp.fat_pct)}% of total</div>
          </div>
          <div class="tile">
            <span class="kicker" style="font-size:9.5px">Lean mass</span>
            <div class="v">${kg(comp.lean_g)}<small>kg</small></div>
            <div class="sub">${pct(leanPctOfTotal)}% of total</div>
          </div>
          <div class="tile">
            <span class="kicker" style="font-size:9.5px">RMR</span>
            <div class="v">${Number(calc.rmr_kcal).toLocaleString()}<small>kcal/d</small></div>
            <div class="sub">Katch-McArdle</div>
          </div>
        </div>
        <!-- Composition bar -->
        <div>
          <div class="ptitle"><small>Body composition</small>Three tissues, measured directly</div>
          ${compStack(comp.fat_pct, leanPctOfTotal, bonePctOfTotal)}
          <div class="legend">
            <span><i class="dot" style="background:var(--accent)"></i>Fat ${kg(comp.fat_g)} kg</span>
            <span><i class="dot" style="background:var(--olive)"></i>Lean ${kg(comp.lean_g)} kg</span>
            <span><i class="dot" style="background:var(--slate)"></i>BMC ${kg2(comp.bmc_g)} kg</span>
            <span style="margin-left:auto;color:var(--muted)">Total · ${totalKg} kg</span>
          </div>
        </div>
        <!-- Indices table -->
        <div>
          <div class="ptitle"><small>Body &amp; lean mass indices</small>Mass normalised to height</div>
          <table class="data">
            <tbody>
              ${calc.alm_available ? `
              <tr>
                <td>ALM <span style="color:var(--muted)">— Appendicular Lean Mass</span></td>
                <td class="tag"></td>
                <td class="r"><strong>${calc.alm_kg}</strong> <span style="color:var(--muted)">kg</span></td>
              </tr>
              <tr>
                <td>ALMI <span style="color:var(--muted)">— Lean Mass Index</span></td>
                <td class="tag ${almiTagCls}">${almiTagLabel}</td>
                <td class="r"><strong>${calc.almi}</strong> <span style="color:var(--muted)">kg/m²</span></td>
              </tr>` : `
              <tr>
                <td>ALM / ALMI</td>
                <td class="tag" colspan="2">No regional data for this scan</td>
              </tr>`}
              <tr>
                <td>FMI <span style="color:var(--muted)">— Fat Mass Index</span></td>
                <td class="tag ${fmiTagCls}">${fmiTagLabel}</td>
                <td class="r"><strong style="${calc.fat_risk !== 'low' ? 'color:var(--amber)' : ''}">${calc.fmi}</strong> <span style="color:var(--muted)">kg/m²</span></td>
              </tr>
              <tr>
                <td>BMI</td>
                <td class="tag">Muscle-driven — read indices</td>
                <td class="r"><strong>${pt.bmi_entered}</strong></td>
              </tr>
              <tr>
                <td>Total Body Mass (scan)</td>
                <td class="tag">Fat + Lean + BMC</td>
                <td class="r"><strong>${totalKg}</strong> <span style="color:var(--muted)">kg</span></td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- ACE scale -->
        <div>
          <div class="ptitle"><small>ACE category · ${male ? 'men' : 'women'}</small>Body fat % vs fixed reference bands</div>
          <div class="scale-bar" style="margin-top:1mm">
            ${aceBands.map(b => `<span style="background:${b.c};flex:${b.w}">${b.lbl}</span>`).join('')}
            ${scaleMarker(aceMarkerPct, `${pct(comp.fat_pct)}%`)}
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:5px;font-size:9px;color:var(--muted)">
            ${aceTicks.map(t => `<span>${t}</span>`).join('')}
          </div>
        </div>
      </div>
    </div>
  </div>
  ${pageFooter('', pageNum, total)}
</section>`
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE 2 — FAT DISTRIBUTION
═══════════════════════════════════════════════════════════════════════════ */
function page2(data, lh, pageNum, total) {
  const { patient: pt, composition: comp, computed: calc } = data
  const male = (pt.gender || '').toLowerCase().startsWith('m')

  const agMarkerPct = ((comp.ag_ratio - 0.6) / 0.8) * 100
  const agPillCls   = comp.ag_ratio < 0.8 ? 'sage' : comp.ag_ratio < 1.0 ? 'amber' : 'accent'
  const agLabel     = comp.ag_ratio < 0.8 ? 'Gynoid distribution' : comp.ag_ratio < 1.0 ? 'Balanced' : 'Mild central pattern'
  const agNote = male
    ? comp.ag_ratio >= 1.0
      ? `A/G = android fat% ÷ gynoid fat%. High lower-body muscle can elevate the ratio without true abdominal excess. The cleaner indicator is android fat% at <strong>${pct(comp.android_fat_pct)}%</strong>.`
      : 'Android/Gynoid ratio reflects fat distribution pattern. Lower ratio indicates more favourable lower-body fat storage.'
    : comp.ag_ratio >= 1.0
      ? 'Central fat pattern in women is associated with higher cardiometabolic risk. Aerobic activity targeting abdominal fat is recommended.'
      : 'Favourable lower-body fat distribution — typical and metabolically preferable for women.'

  const fmiMax      = male ? 15 : 18
  const fmiMarker   = (calc.fmi / fmiMax) * 100
  const fmiNormalHi = male ? 6 : 9
  const fmiElevHi   = male ? 9 : 13
  const fmiW        = male ? ['40%','20%','40%'] : ['50%','22.2%','27.8%']
  const fmiLabels   = [`Normal &lt;${fmiNormalHi}`, `Elevated ${fmiNormalHi}–${fmiElevHi}`, `Obese &gt;${fmiElevHi}`]

  const android = comp.regions && comp.regions.Android
  const gynoid  = comp.regions && comp.regions.Gynoid

  return `
<section class="page">
  ${pageHeader(pt, 'Fat Distribution Analysis', lh)}
  ${pageTitle('02', 'Fat Distribution', `Where does my fat <em>sit</em>, and how does it compare to my peers?`)}
  <div class="pb">
    <div class="with-scan">
      <div class="scan tall">
        <span class="scan-tag">Fat heat-map</span>
        <img class="scan-img" src="${esc(data.images.fat_gradient_url)}" alt="Fat distribution heat-map" />
        <div class="scan-caption">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
            <div style="display:flex;align-items:center;gap:3px;font-size:9px">
              <div style="width:16px;height:12px;background:#D32F2F;border-radius:1px"></div>
              <span>Dense</span>
            </div>
            <div style="display:flex;align-items:center;gap:3px;font-size:9px">
              <div style="width:16px;height:12px;background:#90CAF9;border-radius:1px"></div>
              <span>Low fat</span>
            </div>
          </div>
        </div>
        <div class="scan-disc">Image not for diagnosis</div>
      </div>
      <div class="col">
        <!-- A/G ratio -->
        <div>
          <div class="ptitle"><small>Android / Gynoid ratio</small>Abdominal vs hip-and-thigh fat</div>
          <div style="display:grid;grid-template-columns:auto 1fr;gap:8mm;align-items:center">
            <div style="font-family:'Instrument Serif',serif;font-size:76px;line-height:.9;letter-spacing:-.03em;color:var(--accent)">${Number(comp.ag_ratio).toFixed(2)}</div>
            <div>
              <div style="margin-bottom:2mm">${pill(agPillCls, agLabel)}</div>
              <div class="copy"><p>${agNote}</p></div>
            </div>
          </div>
          <div style="margin-top:4mm">
            <div class="scale-bar">
              <span style="background:#6E8F5C;flex:2">&lt; 0.80 Gynoid</span>
              <span style="background:#B59A4F;flex:1">0.80–1.0</span>
              <span style="background:#C84A2C;flex:3">&gt; 1.0 Android</span>
              ${scaleMarker(agMarkerPct, Number(comp.ag_ratio).toFixed(2))}
            </div>
          </div>
        </div>
        <!-- Android + Gynoid panels -->
        ${android && gynoid ? `
        <div class="row-2">
          <div class="panel">
            <div class="ptitle"><small>Android · abdominal</small>${pct(android.fat_pct)}% fat · ${pct(android.lean_pct)}% lean</div>
            ${compStack(android.fat_pct, android.lean_pct, android.bone_pct)}
            <div class="legend"><span>${kg2(android.fat_g)} kg fat</span><span>${kg2(android.lean_g)} kg lean</span></div>
            <div style="margin-top:2mm">${pill(android.lean_pct > 60 ? 'sage' : 'amber', android.lean_pct > 60 ? 'Muscle-dominant' : 'Mixed')}</div>
          </div>
          <div class="panel">
            <div class="ptitle"><small>Gynoid · hip &amp; thigh</small>${pct(gynoid.fat_pct)}% fat · ${pct(gynoid.lean_pct)}% lean</div>
            ${compStack(gynoid.fat_pct, gynoid.lean_pct, gynoid.bone_pct)}
            <div class="legend"><span>${kg2(gynoid.fat_g)} kg fat</span><span>${kg2(gynoid.lean_g)} kg lean</span></div>
            <div style="margin-top:2mm">${pill(gynoid.lean_pct > 60 ? 'sage' : 'amber', gynoid.lean_pct > 60 ? 'Muscle-dominant' : 'Mixed')}</div>
          </div>
        </div>` : ''}
        <hr class="hair" />
        <!-- FMI scale -->
        <div>
          <div class="ptitle"><small>Fat Mass Index</small>Fat ÷ height² · ${calc.fmi} kg/m² · ${calc.fat_risk === 'low' ? 'normal' : calc.fat_risk === 'moderate' ? 'borderline elevated' : 'elevated'}</div>
          <div class="scale-bar">
            <span style="background:#6E8F5C;flex:${fmiW[0]}">${fmiLabels[0]}</span>
            <span style="background:#B59A4F;flex:${fmiW[1]}">${fmiLabels[1]}</span>
            <span style="background:#C84A2C;flex:${fmiW[2]}">${fmiLabels[2]}</span>
            ${scaleMarker(fmiMarker, `${calc.fmi}`)}
          </div>
          <div class="copy" style="margin-top:7mm">
            <p>${calc.fat_risk !== 'low'
              ? 'FMI is the cleaner read on adiposity than BMI — track this between scans. Modest lifestyle adjustments should bring this back into range.'
              : 'FMI within normal range — a better measure of adiposity than BMI as it is unaffected by muscle mass.'}</p>
          </div>
        </div>
        ${comp.centile != null ? `
        <div>
          <div class="ptitle"><small>Age-matched fat centile</small>vs same age &amp; sex</div>
          <div style="display:flex;align-items:center;gap:8mm">
            <div style="font-family:'Instrument Serif',serif;font-size:72px;line-height:.9;color:${comp.centile >= 75 ? 'var(--accent)' : comp.centile >= 50 ? 'var(--amber)' : 'var(--sage)'}">${comp.centile}</div>
            <div class="copy">
              <p>Body fat % is greater than that of ${comp.centile}% of ${pt.gender === 'Male' ? 'men' : 'women'} of the same age.</p>
              <p style="font-size:9px;color:var(--muted)">50th = average · Ref: ${esc(pt.ethnicity || 'White')}</p>
            </div>
          </div>
        </div>` : ''}
      </div>
    </div>
  </div>
  ${pageFooter('', pageNum, total)}
</section>`
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE 3 — REGIONAL & SYMMETRY
═══════════════════════════════════════════════════════════════════════════ */
function page3(data, lh, pageNum, total) {
  const { patient: pt, composition: comp, computed: calc } = data
  const male = (pt.gender || '').toLowerCase().startsWith('m')
  const almiLo = male ? 7.26 : 5.67
  const almiHi = male ? 9.2  : 7.5
  const almiLabel = calc.almi_rating === 'high' ? 'High muscle mass' : calc.almi_rating === 'low' ? 'Low muscle mass' : 'Normal muscle mass'
  const almiPill  = calc.almi_rating === 'high' ? 'sage' : calc.almi_rating === 'low' ? 'accent' : ''

  const armsData  = comp.regions && comp.regions.Arms
  const trunkData = comp.regions && comp.regions.Trunk
  const legsData  = comp.regions && comp.regions.Legs

  // Bilateral symmetry — data.bilateral has { arms, legs, trunk, total } each with { left, right, lean_asym, ... }
  const bilateral = data.bilateral
  const hasBilateral = bilateral && bilateral.arms

  function symRow(region, s) {
    if (!s) return ''
    function deltaCell(asym, dom) {
      const cls = asym > 25 ? 'accent' : asym > 10 ? 'amber' : ''
      const arrow = dom === 'left' ? '◀' : '▶'
      return `<td class="tag ${cls}">${asym.toFixed(1)}% ${arrow}</td>`
    }
    const f = v => v != null ? (v/1000).toFixed(2) : '—'
    return `<tr>
      <td><span style="font-family:'Instrument Serif',serif;font-style:italic;font-size:15px">${region}</span></td>
      <td class="r">${f(s.left?.lean_g)}</td><td class="r">${f(s.right?.lean_g)}</td>${deltaCell(s.lean_asym, s.lean_dom)}
      <td class="r">${f(s.left?.fat_g)}</td><td class="r">${f(s.right?.fat_g)}</td>${deltaCell(s.fat_asym, s.fat_dom)}
      <td class="r">${f(s.left?.bone_g)}</td><td class="r">${f(s.right?.bone_g)}</td><td class="tag">${s.bone_asym.toFixed(1)}%</td>
    </tr>`
  }

  const bilateralTable = hasBilateral ? `
  <div>
    <div class="ptitle"><small>Bilateral symmetry · left vs right</small>Vertical balance — complements horizontal A/G view</div>
    <table class="data">
      <thead>
        <tr>
          <th>Region</th>
          <th colspan="3" style="text-align:center;border-bottom:0"><span style="font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)">Lean (kg)</span></th>
          <th colspan="3" style="text-align:center;border-bottom:0"><span style="font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)">Fat (kg)</span></th>
          <th colspan="3" style="text-align:center;border-bottom:0"><span style="font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)">Bone (kg)</span></th>
        </tr>
        <tr>
          <th></th>
          <th>Left</th><th>Right</th><th>Δ</th>
          <th>Left</th><th>Right</th><th>Δ</th>
          <th>Left</th><th>Right</th><th>Δ</th>
        </tr>
      </thead>
      <tbody>
        ${symRow('Arms',  bilateral.arms)}
        ${symRow('Legs',  bilateral.legs)}
        ${symRow('Trunk', bilateral.trunk)}
      </tbody>
    </table>
    <div style="margin-top:3mm;font-size:9px;color:var(--muted)">Arms: &lt;15% normal, &gt;25% significant · Legs/Trunk: &lt;10% normal, &gt;15% significant</div>
  </div>` : `
  <div>
    <div class="ptitle"><small>Bilateral symmetry</small>Left vs right regional balance</div>
    <div style="font-size:10px;color:var(--muted);padding:3mm 0">Detailed left/right breakdown requires bilateral MDB analysis (labels 51–58). Not available for this scan.</div>
  </div>`

  return `
<section class="page">
  ${pageHeader(pt, 'Regional Body Composition', lh)}
  ${pageTitle('03', 'Regional Composition', `How is fat and muscle <em>distributed</em> across my body?`)}
  <div class="pb">
    <div class="row-2a">
      <div>
        <div class="ptitle"><small>Tissue breakdown by region</small>Bar width = proportion of region</div>
        ${armsData  ? regionRow('Arms',  armsData)  : ''}
        ${trunkData ? regionRow('Trunk', trunkData) : ''}
        ${legsData  ? regionRow('Legs',  legsData)  : ''}
      </div>
      ${calc.alm_available ? `
      <aside class="panel dark">
        <div class="kicker" style="color:rgba(232,181,163,.9)">Appendicular Lean Mass</div>
        <div style="font-family:'Instrument Serif',serif;font-size:72px;line-height:.9;letter-spacing:-.03em;margin:2mm 0 1mm">${calc.alm_kg}<span style="font-size:20px;font-style:italic;color:rgba(232,181,163,.7)">kg</span></div>
        <div style="font-size:10.5px;color:rgba(245,241,234,.8);margin-bottom:4mm">
          Arms ${armsData ? kg2(armsData.lean_g) : '—'} kg · Legs ${legsData ? kg2(legsData.lean_g) : '—'} kg
        </div>
        <hr style="border:0;border-top:1px solid rgba(245,241,234,.18);margin:0 0 4mm" />
        <div style="display:grid;grid-template-columns:auto 1fr;gap:6mm;align-items:end">
          <div>
            <div class="kicker" style="color:rgba(232,181,163,.9)">ALMI</div>
            <div style="font-family:'Instrument Serif',serif;font-size:44px;line-height:1;margin-top:2mm">${calc.almi}</div>
            <div style="font-size:10px;color:rgba(245,241,234,.6)">kg/m²</div>
          </div>
          <div>
            ${pill(almiPill, almiLabel)}
            <div style="font-size:9.5px;color:rgba(245,241,234,.55);margin-top:3mm;line-height:1.5">
              Low &lt;${almiLo} · Normal ${almiLo}–${almiHi} · <strong style="color:#B5CC9A">High &gt;${almiHi}</strong>
            </div>
            <div style="font-size:8.5px;color:rgba(245,241,234,.35);margin-top:2mm">Baumgartner 1998 · Cruz-Jentoft</div>
          </div>
        </div>
      </aside>` : `
      <aside class="panel">
        <div class="kicker" style="margin-bottom:2mm">ALM / ALMI</div>
        <div class="copy"><p>Regional breakdown was not stored in the MDB analysis for this scan. ALMI will be available on subsequent scans if regional analysis is retained.</p></div>
      </aside>`}
    </div>
    <hr class="hair" />
    <div>
      <div class="ptitle"><small>Why muscle mass matters</small>Sarcopenia · mortality risk · maintenance</div>
      <div class="copy" style="display:grid;grid-template-columns:1fr 1fr;gap:8mm">
        <p>Skeletal muscle mass peaks around age 25–30 and naturally declines <strong>3–8% per decade</strong> (sarcopenia). Low appendicular lean mass is independently linked to reduced strength, impaired mobility, insulin resistance, and higher all-cause mortality risk.</p>
        <p><strong style="color:var(--accent)">Resistance training</strong> 2–3× per week stimulates muscle protein synthesis at any age. <strong style="color:var(--accent)">Protein intake</strong> of ≥ 1.6 g/kg body weight/day is the minimum recommended for muscle maintenance.</p>
      </div>
    </div>
    <hr class="hair" />
    ${bilateralTable}
  </div>
  ${pageFooter('', pageNum, total)}
</section>`
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE 4 — BONE HEALTH
═══════════════════════════════════════════════════════════════════════════ */
function page4(data, lh, pageNum, total) {
  const { patient: pt, bone } = data

  const tMarkerPct = ((bone.total_t + 4) / 8) * 100
  const boneColor  = bone.classification === 'normal' ? 'var(--sage)' : bone.classification === 'low_mass' ? 'var(--amber)' : 'var(--accent)'
  const bonePill   = bone.classification === 'normal' ? 'sage' : bone.classification === 'low_mass' ? 'amber' : 'accent'
  const boneLabel  = bone.classification === 'normal' ? 'Normal bone density' : bone.classification === 'low_mass' ? 'Osteopenia' : 'Osteoporosis'
  const tSign = bone.total_t >= 0 ? '+' : ''
  const zSign = bone.total_z >= 0 ? '+' : ''

  const regionOrder = ['Head', 'Arms', 'Trunk', 'Legs', 'Ribs', 'Spine', 'Pelvis']
  const boneRows = regionOrder
    .filter(n => bone.regions[n])
    .map(n => {
      const d = bone.regions[n]
      const c = d.bmd > 1.2 ? 'var(--sage)' : d.bmd > 0.9 ? 'var(--amber)' : 'var(--accent)'
      return `<tr>
        <td><span style="font-family:'Instrument Serif',serif;font-style:italic;font-size:13px">${esc(n)}</span></td>
        <td class="r" style="color:${c}">${d.bmd.toFixed(3)}</td>
      </tr>`
    }).join('')

  const boneGuide = bone.classification === 'normal'
    ? 'Calcium 1,000–1,200 mg/d · Vitamin D 600–800 IU/d · weight-bearing activity 2–3× per week · recheck BMD in 2–3 years or sooner if risk factors change.'
    : bone.classification === 'low_mass'
      ? 'Calcium 1,200 mg/d + Vitamin D 800–1,000 IU/d · progressive resistance exercise · avoid smoking, limit alcohol · discuss pharmacological options with your clinician · repeat DXA in 1–2 years.'
      : 'FRAX fracture risk assessment recommended — discuss with your clinician promptly · anti-resorptive therapy may be indicated · Calcium 1,200 mg/d + Vitamin D 1,000–2,000 IU/d · fall prevention programme.'

  const chart = densitometryChart(pt.age, bone.total_bmd, 'totalbody', pt.gender, {
    gray: 'var(--muted)', text: 'var(--ink)',
  })

  return `
<section class="page">
  ${pageHeader(pt, 'Bone Health & Density', lh)}
  ${pageTitle('04', 'Bone Health & Density', `How <em>dense</em> and <em>strong</em> are my bones?`)}
  <div class="pb">
    <div class="with-scan">
      <div class="scan tall">
        <span class="scan-tag">Bone scan</span>
        <img class="scan-img" src="${esc(data.images.bone_roi_url || data.images.bone_url)}" alt="Bone DEXA scan" />
        <div class="scan-caption">Skeletal density</div>
        <div class="scan-disc">Image not for diagnosis</div>
      </div>
      <div class="col">
        <!-- BMD hero -->
        <div>
          <div class="ptitle"><small>Total body BMD</small>Whole-body bone mineral density</div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:6mm;align-items:center">
            <div>
              <div class="kicker" style="margin-bottom:2mm">BMD</div>
              <div style="font-family:'Instrument Serif',serif;font-size:48px;line-height:.9;letter-spacing:-.02em">${bone.total_bmd.toFixed(3)}</div>
              <div style="font-size:10.5px;color:var(--muted);margin-top:2mm">g/cm²</div>
            </div>
            <div>
              <div class="kicker" style="margin-bottom:2mm">T-score</div>
              <div style="font-family:'Instrument Serif',serif;font-size:48px;line-height:.9;letter-spacing:-.02em;color:${boneColor}">${tSign}${bone.total_t.toFixed(1)}</div>
              <div style="font-size:10.5px;color:var(--muted);margin-top:2mm">vs healthy 30-yr</div>
            </div>
            <div>
              <div class="kicker" style="margin-bottom:2mm">Z-score</div>
              <div style="font-family:'Instrument Serif',serif;font-size:48px;line-height:.9;letter-spacing:-.02em;color:${boneColor}">${zSign}${bone.total_z.toFixed(1)}</div>
              <div style="font-size:10.5px;color:var(--muted);margin-top:2mm">vs same age/sex</div>
            </div>
            ${chart}
          </div>
          <div style="margin-top:4mm">${pill(bonePill, boneLabel)}</div>
          <!-- T-score strip -->
          <div style="margin-top:5mm">
            <div class="scale-bar" style="height:22px">
              <span style="background:#C84A2C;flex:18.75">Osteoporosis</span>
              <span style="background:#B59A4F;flex:18.75">Osteopenia</span>
              <span style="background:#6E8F5C;flex:62.5">Normal bone density</span>
              ${scaleMarker(tMarkerPct, `T ${tSign}${bone.total_t.toFixed(1)}`)}
            </div>
            <div style="display:grid;grid-template-columns:18.75fr 18.75fr 37.5fr 25fr;font-size:9px;color:var(--muted);margin-top:4px;font-variant-numeric:tabular-nums">
              <span>−4</span><span>−2.5</span><span style="text-align:right">−1</span><span style="text-align:right">+4</span>
            </div>
          </div>
        </div>
        <!-- BMD by region + reference -->
        <div class="row-2a">
          <div>
            <div class="ptitle"><small>BMD by body region</small>g/cm²</div>
            <table class="data"><tbody>${boneRows}</tbody></table>
            <div style="margin-top:3mm;display:flex;gap:10px;font-size:9px;color:var(--muted)">
              <span><i class="dot" style="background:var(--sage)"></i>&gt; 1.2</span>
              <span><i class="dot" style="background:var(--amber)"></i>0.9–1.2</span>
              <span><i class="dot" style="background:var(--accent)"></i>&lt; 0.9</span>
            </div>
          </div>
          <aside style="font-size:9.5px;line-height:1.5;color:var(--ink-2)">
            <div class="kicker" style="margin-bottom:2mm">Reference</div>
            <p style="margin:0 0 1.5mm 0"><strong>T-score</strong> vs healthy 30-yr peak. <span style="color:var(--sage)">≥ −1</span> normal · <span style="color:var(--amber)">−1 to −2.5</span> osteopenia · <span style="color:var(--accent)">≤ −2.5</span> osteoporosis.</p>
            <p style="margin:0 0 3mm 0"><strong>Z-score</strong> vs same age &amp; sex. Below −2.0 = below expected for age.</p>
            <div class="kicker" style="margin-bottom:2mm">Suggestions</div>
            <p style="margin:0;color:var(--muted)">${boneGuide}</p>
          </aside>
        </div>
      </div>
    </div>
  </div>
  ${pageFooter('', pageNum, total)}
</section>`
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE 5 — CLINICAL SUMMARY
═══════════════════════════════════════════════════════════════════════════ */
function page5(data, lh, pageNum, total) {
  const { patient: pt, composition: comp, computed: calc, bone } = data
  const male = (pt.gender || '').toLowerCase().startsWith('m')

  const findings = []
  const [athHi, fitHi, normHi] = male ? [14, 18, 25] : [21, 25, 32]
  const almiLo = male ? 7.26 : 5.67

  if (comp.fat_pct < athHi)
    findings.push({ v: '', pill: 'sage', pt: 'Athletic range', h: 'Body fat — athletic', b: `${pct(comp.fat_pct)}% — well within the athletic range for ${male ? 'men' : 'women'} (ACE &lt;${athHi}%). Excellent result.` })
  else if (comp.fat_pct < fitHi)
    findings.push({ v: '', pill: 'sage', pt: 'Fit range', h: 'Body fat — fit range', b: `${pct(comp.fat_pct)}% — healthy fit range for ${male ? 'men' : 'women'} (ACE ${athHi}–${fitHi}%).` })
  else if (comp.fat_pct < normHi)
    findings.push({ v: 'caution', pill: 'amber', pt: 'Normal range', h: 'Body fat — normal but not optimal', b: `${pct(comp.fat_pct)}% within the normal band (${fitHi}–${normHi}% for ${male ? 'men' : 'women'}) but above the fit target. Lifestyle optimisation — activity plus dietary balance — is the recommended next step.` })
  else
    findings.push({ v: 'attention', pill: 'accent', pt: 'Above target', h: 'Body fat — above target range', b: `${pct(comp.fat_pct)}% exceeds the healthy range for ${male ? 'men' : 'women'} (ACE &gt;${normHi}%). Gradual reduction through consistent activity and dietary habits is recommended.` })

  if (comp.ag_ratio < 0.8)
    findings.push({ v: '', pill: 'sage', pt: 'Favourable', h: 'Fat distribution — gynoid-dominant', b: `A/G ${Number(comp.ag_ratio).toFixed(2)} — fat stored preferentially in hips and thighs. Favourable metabolic profile.` })
  else if (calc.alm_available && calc.almi_rating === 'high' && comp.ag_ratio < 1.3)
    findings.push({ v: 'caution', pill: 'amber', pt: 'Interpret with context', h: 'Fat distribution — muscular context', b: `A/G ${Number(comp.ag_ratio).toFixed(2)} reads as mild central pattern, but ALMI ${calc.almi} kg/m² shows high muscle mass. Your gynoid region is muscle-dominant${comp.regions && comp.regions.Gynoid ? ` (${pct(comp.regions.Gynoid.lean_pct)}% lean)` : ''}. The cleaner indicator is android fat% at ${pct(comp.android_fat_pct)}%.` })
  else if (comp.ag_ratio < 1.0)
    findings.push({ v: 'caution', pill: 'amber', pt: 'Mild tendency', h: 'Fat distribution — mild central tendency', b: `A/G ${Number(comp.ag_ratio).toFixed(2)} — mild central fat predominance. Focus on reducing abdominal fat through aerobic activity.` })
  else
    findings.push({ v: 'attention', pill: 'accent', pt: 'Action', h: 'Fat distribution — central pattern', b: `A/G ${Number(comp.ag_ratio).toFixed(2)} — android (abdominal) fat predominance. Lifestyle optimisation targeting abdominal fat is advised.` })

  if (!calc.alm_available)
    findings.push({ v: 'caution', pill: 'amber', pt: 'Data unavailable', h: 'Muscle mass — regional data missing', b: 'Regional MDB analysis was not stored for this scan. ALM and ALMI cannot be computed. Ensure regional body-composition data is saved at analysis time for future scans.' })
  else if (calc.almi_rating === 'high')
    findings.push({ v: '', pill: 'sage', pt: 'Excellent', h: 'Muscle mass — well above threshold', b: `ALMI ${calc.almi} kg/m² — above-average appendicular lean mass, comfortably above the ${male ? 'male' : 'female'} sarcopenia threshold of ${almiLo} kg/m².` })
  else if (calc.almi_rating === 'normal')
    findings.push({ v: '', pill: 'sage', pt: 'Normal', h: 'Muscle mass — within normal range', b: `ALMI ${calc.almi} kg/m² — within the normal reference range. Maintain with regular resistance training.` })
  else
    findings.push({ v: 'attention', pill: 'accent', pt: 'Action', h: 'Muscle mass — below reference', b: `ALMI ${calc.almi} kg/m² is below the ${male ? 'male' : 'female'} sarcopenia threshold (${almiLo} kg/m²). Progressive resistance training and adequate protein (≥ 1.6 g/kg/day) recommended.` })

  if (calc.fat_risk === 'low')
    findings.push({ v: '', pill: 'sage', pt: 'Normal', h: 'Fat Mass Index — normal', b: `FMI ${calc.fmi} kg/m² — normal range. More precise than BMI as it reflects actual fat mass independent of muscle.` })
  else if (calc.fat_risk === 'moderate')
    findings.push({ v: 'caution', pill: 'amber', pt: 'Mildly elevated', h: 'Fat Mass Index — just over target', b: `FMI ${calc.fmi} kg/m² — just into the elevated band (target &lt;${male ? 6 : 9} kg/m²). Track at the next scan; modest lifestyle changes should bring this back.` })
  else
    findings.push({ v: 'attention', pill: 'accent', pt: 'Action', h: 'Fat Mass Index — above target range', b: `FMI ${calc.fmi} kg/m² above target. Unlike BMI, FMI is not affected by muscle mass — this reflects actual fat burden.` })

  if (bone.classification === 'normal')
    findings.push({ v: '', pill: 'sage', pt: 'Normal', h: 'Bone density — normal', b: `BMD ${bone.total_bmd.toFixed(3)} g/cm² with T-score ${bone.total_t >= 0 ? '+' : ''}${bone.total_t.toFixed(1)} and Z-score ${bone.total_z >= 0 ? '+' : ''}${bone.total_z.toFixed(1)} — within the normal range.` })
  else if (bone.classification === 'low_mass')
    findings.push({ v: 'caution', pill: 'amber', pt: 'Osteopenia', h: 'Bone density — osteopenia', b: `T-score ${bone.total_t.toFixed(1)} — mildly below peak bone mass. Ensure adequate calcium (1,000–1,200 mg/day), vitamin D, and weight-bearing activity.` })
  else
    findings.push({ v: 'attention', pill: 'accent', pt: 'Action', h: 'Bone density — osteoporosis range', b: `T-score ${bone.total_t.toFixed(1)} — clinical correlation and FRAX fracture risk assessment recommended. Please discuss with your clinician.` })

  const rmr  = Number(calc.rmr_kcal)
  const tdee = [
    { lvl: 'Sedentary', kcal: Math.round(rmr * 1.2) },
    { lvl: 'Light',     kcal: Math.round(rmr * 1.375) },
    { lvl: 'Moderate',  kcal: Math.round(rmr * 1.55) },
    { lvl: 'Active',    kcal: Math.round(rmr * 1.725) },
  ]

  const _labitBadge = `<div style="display:flex;flex-direction:column;align-items:center;gap:3px;flex-shrink:0;margin-left:12px"><img src="${_BASE}/labit-logo.png" height="24" style="display:block;object-fit:contain"><a href="https://www.labit.online" target="_blank" style="font-size:6.5px;font-weight:700;color:var(--accent);letter-spacing:.4px;text-decoration:none">www.labit.online</a></div>`

  return `
<section class="page">
  ${pageHeader(pt, 'Clinical Summary', lh)}
  ${pageTitle('05', 'Clinical Summary', `What do my results <em>mean</em>, and what should I focus on?`)}
  <div class="pb">
    <div class="findings">
      ${findings.map(f => `
      <article class="finding ${f.v}">
        ${pill(f.pill, f.pt)}
        <h4>${f.h}</h4>
        <p>${f.b}</p>
      </article>`).join('')}
    </div>
    <hr class="hair" />
    <div class="row-2a">
      <div>
        <div class="ptitle"><small>Resting metabolic rate</small>Calories burned at complete rest</div>
        <div style="display:flex;align-items:baseline;gap:10px;margin-top:2mm">
          <div style="font-family:'Instrument Serif',serif;font-size:72px;line-height:.9;letter-spacing:-.03em">${rmr.toLocaleString()}</div>
          <div style="font-size:12px;color:var(--muted)">kcal / day</div>
        </div>
        <div class="copy" style="margin-top:2mm">
          <p>Derived from lean mass via <strong>Katch-McArdle</strong>${calc.alm_available && calc.almi_rating === 'high' ? ` — your ALMI of ${calc.almi} kg/m² is doing the heavy lifting here` : ''}.</p>
        </div>
      </div>
      <div>
        <div class="ptitle"><small>Total daily energy needs</small>kcal/day</div>
        <div class="activity">
          ${tdee.map(t => `<div><div class="lvl">${esc(t.lvl)}</div><div class="kcal">${t.kcal.toLocaleString()}</div></div>`).join('')}
        </div>
        <div class="copy" style="margin-top:2mm">
          <p style="font-size:9.5px;color:var(--muted)">Adjust ±500 kcal/day for ~0.5 kg/week weight loss or gain.</p>
        </div>
      </div>
    </div>
    <hr class="hair" />
    ${(() => {
      const targets = fatLossTargets(comp, calc, pt.gender)
      if (!targets) return ''
      const rows = targets.targets.map(({ pct, fatToLose, weightToLose, targetWeight }) => {
        return `<tr>
          <td style="padding:4px 8px;font-size:10px;color:var(--muted)">${pct}%</td>
          <td style="padding:4px 8px;font-size:10px;color:var(--muted);text-align:right">${fatToLose} kg</td>
          <td style="padding:4px 8px;font-size:10px;color:var(--muted);text-align:right">${weightToLose} kg</td>
          <td style="padding:4px 8px;font-size:10px;font-weight:600;color:var(--ink);text-align:right">${targetWeight} kg</td>
        </tr>`
      }).join('')
      return `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6mm;margin-bottom:4mm">
        <div>
          <div class="ptitle"><small>Weight goals</small>Fat loss targets</div>
          <table style="width:100%;border-collapse:collapse;font-size:9px">
            <thead><tr>
              <th style="padding:3px 8px;text-align:left;border-bottom:1px solid var(--hairline);color:var(--muted);font-weight:600">Target</th>
              <th style="padding:3px 8px;text-align:right;border-bottom:1px solid var(--hairline);color:var(--muted);font-weight:600">Fat</th>
              <th style="padding:3px 8px;text-align:right;border-bottom:1px solid var(--hairline);color:var(--muted);font-weight:600">Loss</th>
              <th style="padding:3px 8px;text-align:right;border-bottom:1px solid var(--hairline);color:var(--muted);font-weight:600">Weight</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <div style="font-size:8px;color:var(--muted);margin-top:2mm;line-height:1.4">${targets.preservationNote}</div>
        </div>
        <div>
          <div class="ptitle"><small>Why DEXA?</small>Gold Standard</div>
          <div style="font-size:9px;color:var(--muted);line-height:1.6">
            <p style="margin:0 0 1.5mm 0">DEXA separates fat, lean and bone tissue precisely — the only method that directly measures all three. Radiation dose &lt; 1 μSv, less than one day of background exposure.</p>
            <p style="margin:0 0 1mm 0;font-size:8.5px"><strong>Reference population:</strong> White (GE Lunar normative database). South Asian-specific T &amp; Z score references are not available on this scanner platform, which may underestimate bone loss risk in South Asian individuals.</p>
            <p style="margin:0 0 1mm 0;font-size:8.5px"><strong>Limitations:</strong> Visceral fat (VAT) estimation is not available on this scanner platform (GE Lunar DPX-NT). Trend comparison will be available after repeat scans on the same scanner.</p>
            <p style="margin:0;font-size:8.5px"><strong>For clinical use only.</strong> Interpret results with a qualified clinician.</p>
          </div>
        </div>
      </div>`
    })()}
  </div>
  <footer class="pf">
    <span style="display:flex;align-items:center;gap:8px">
      <span>Generated by</span>
      ${_labitBadge}
      <span>· Scanner ${esc(pt.scanner)} · WHO criteria · NHANES/FNIH standards</span>
    </span>
    <span class="pno">${String(pageNum).padStart(2, '0')} / ${String(total).padStart(2, '0')}</span>
  </footer>
</section>`
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE T — TRENDS (inserted between page4 and page5 when history present)
═══════════════════════════════════════════════════════════════════════════ */

/* Metric sparkline — area fill + line + dots, colored by trend direction.
   good='up'|'down' determines whether an upward move is sage or accent. */
function metricSparkline(values, good) {
  const W = 148, H = 52
  const valid = values.filter(v => v != null)
  if (valid.length < 2) return ''

  const min = Math.min(...valid), max = Math.max(...valid)
  const range = max - min || 0.001
  const idxs = values.map((v, i) => ({ v, i })).filter(x => x.v != null)
  const n = values.length
  const xOf = i => ((i / Math.max(n - 1, 1)) * (W - 12) + 6).toFixed(1)
  const yOf = v => (H - 8 - ((v - min) / range) * (H - 18)).toFixed(1)
  const pts = idxs.map(x => `${xOf(x.i)},${yOf(x.v)}`)

  // Trend color from last movement
  const last = valid[valid.length - 1], prev = valid[valid.length - 2]
  const delta = last - prev
  const improving = delta === 0 ? null : (good === 'down' ? delta < 0 : delta > 0)
  const stroke = improving === null ? 'var(--muted)' : improving ? 'var(--sage)' : 'var(--accent)'
  const fillAlpha = improving === null ? '0.06' : improving ? '0.12' : '0.10'
  const fillColor = improving === null
    ? `rgba(122,113,100,${fillAlpha})`
    : improving ? `rgba(92,122,77,${fillAlpha})` : `rgba(200,74,44,${fillAlpha})`

  // Area polygon: line + bottom edge
  const lastPt = idxs[idxs.length - 1]
  const firstPt = idxs[0]
  const areaPolygon = [...pts, `${xOf(lastPt.i)},${H - 2}`, `${xOf(firstPt.i)},${H - 2}`].join(' ')

  const dots = idxs.map((x, di) => {
    const isCurrent = di === idxs.length - 1
    return isCurrent
      ? `<circle cx="${xOf(x.i)}" cy="${yOf(x.v)}" r="4" fill="${stroke}" stroke="white" stroke-width="1.5"/>`
      : `<circle cx="${xOf(x.i)}" cy="${yOf(x.v)}" r="2.5" fill="${stroke}" opacity="0.6"/>`
  }).join('')

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="display:block;width:100%">
    <polygon points="${areaPolygon}" fill="${fillColor}"/>
    <polyline points="${pts.join(' ')}" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>
    ${dots}
  </svg>`
}

function pageTrends(data, history, _lh, pageNum, total) {
  const scans = [...history, data].slice(-5)
  const { patient: pt } = data

  const metricDefs = [
    { label: 'Body Fat',    sub: '%',     get: sc => sc.composition?.fat_pct  ?? null,                                                    unit: '%',     good: 'down' },
    { label: 'Fat Mass',    sub: 'kg',    get: sc => sc.composition?.fat_g   != null ? +(sc.composition.fat_g/1000).toFixed(1)   : null,   unit: 'kg',   good: 'down' },
    { label: 'Lean Mass',   sub: 'kg',    get: sc => sc.composition?.lean_g  != null ? +(sc.composition.lean_g/1000).toFixed(1)  : null,   unit: 'kg',   good: 'up'   },
    { label: 'ALMI',        sub: 'kg/m²', get: sc => sc.computed?.almi       ?? null,                                                      unit: 'kg/m²', good: 'up'   },
    { label: 'FMI',         sub: 'kg/m²', get: sc => sc.computed?.fmi        ?? null,                                                      unit: 'kg/m²', good: 'down' },
    { label: 'LMI',         sub: 'kg/m²', get: sc => sc.computed?.lmi        ?? null,                                                      unit: 'kg/m²', good: 'up'   },
    { label: 'RMR',         sub: 'kcal',  get: sc => sc.computed?.rmr_kcal   ?? null,                                                      unit: 'kcal',  good: 'up'   },
    { label: 'A/G Ratio',   sub: '',      get: sc => sc.composition?.ag_ratio != null ? +Number(sc.composition.ag_ratio).toFixed(2) : null, unit: '',      good: 'down' },
    { label: 'Bone Mineral',sub: 'kg',    get: sc => sc.composition?.bmc_g   != null ? +(sc.composition.bmc_g/1000).toFixed(2)   : null,   unit: 'kg',   good: 'up'   },
  ]

  // Scan date strip above cards
  const dateStrip = `
  <div style="display:flex;gap:2mm;margin-bottom:4mm;padding-bottom:3mm;border-bottom:1px solid var(--hairline)">
    <span style="font-size:9px;color:var(--muted);letter-spacing:.1em;text-transform:uppercase;flex-shrink:0;padding-top:1px">Scans:</span>
    ${scans.map((sc, i) => {
      const cur = i === scans.length - 1
      return `<span style="font-size:9px;font-weight:${cur ? 700 : 400};color:${cur ? 'var(--accent)' : 'var(--muted)'};white-space:nowrap">${tbFmtDate(sc.patient?.scan_date)}${cur ? ' ★' : ''}</span>`
    }).join('<span style="color:var(--hairline-2);font-size:9px">·</span>')}
  </div>`

  // Metric cards
  const metricCards = metricDefs.map(({ label, sub, get, good }) => {
    const vals = scans.map(sc => get(sc))
    if (vals.every(v => v == null)) return ''

    const cur  = vals[vals.length - 1]
    const prev = vals.slice(0, -1).reverse().find(v => v != null)
    const spark = metricSparkline(vals, good)

    let deltaHtml = ''
    if (cur != null && prev != null) {
      const delta = cur - prev
      const improving = delta === 0 ? null : (good === 'down' ? delta < 0 : delta > 0)
      const dColor = improving === null ? 'var(--muted)' : improving ? 'var(--sage)' : 'var(--accent)'
      const arrow = delta > 0 ? '↑' : delta < 0 ? '↓' : '→'
      const sign  = delta > 0 ? '+' : ''
      const fmt   = Math.abs(delta) < 1 ? delta.toFixed(2) : delta.toFixed(1)
      const word  = improving === null ? 'stable' : improving ? 'improving' : 'worsening'
      deltaHtml = `
      <div style="display:flex;align-items:center;gap:4px;margin-top:1mm">
        <span style="font-size:11px;font-weight:700;color:${dColor}">${sign}${fmt} ${arrow}</span>
        <span style="font-size:9px;color:${dColor};letter-spacing:.06em;text-transform:uppercase">${word}</span>
      </div>`
    }

    // Left border color = overall trend direction (first → last)
    const first = vals.find(v => v != null)
    const last  = cur
    const overallImproving = first != null && last != null
      ? (good === 'down' ? last < first : last > first)
      : null
    const borderColor = overallImproving === null ? 'var(--hairline-2)'
      : overallImproving ? 'var(--sage)' : 'var(--accent)'

    return `
    <div style="border:1px solid var(--hairline);border-left:3px solid ${borderColor};padding:4mm;display:flex;flex-direction:column;gap:1mm;background:var(--paper)">
      <div style="font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);font-weight:500">${label}</div>
      <div style="display:flex;align-items:baseline;gap:3px">
        <span style="font-family:'Instrument Serif',serif;font-size:34px;line-height:.95;letter-spacing:-.02em;font-variant-numeric:tabular-nums;color:var(--ink)">${cur ?? '—'}</span>
        ${sub ? `<span style="font-size:10px;color:var(--muted)">${esc(sub)}</span>` : ''}
      </div>
      ${deltaHtml}
      <div style="margin-top:2mm">${spark}</div>
    </div>`
  }).filter(Boolean).join('')

  // Lean preservation callout
  let leanCallout = ''
  for (let i = 1; i < scans.length; i++) {
    const prev = scans[i - 1], curr = scans[i]
    const wtPrev = prev.composition?.lean_g != null && prev.composition?.fat_g != null ? prev.composition.lean_g + prev.composition.fat_g : null
    const wtCurr = curr.composition?.lean_g != null && curr.composition?.fat_g != null ? curr.composition.lean_g + curr.composition.fat_g : null
    if (wtPrev == null || wtCurr == null) continue
    const totalLoss = wtPrev - wtCurr
    if (totalLoss <= 0) continue
    const leanLoss  = prev.composition.lean_g - curr.composition.lean_g
    const leanPct   = Math.round((leanLoss / totalLoss) * 100)
    if (leanPct > 25) {
      leanCallout = `
      <div style="border:1px solid var(--amber);border-left:3px solid var(--amber);padding:4mm;margin-top:4mm;background:var(--paper)">
        <div style="font-size:11px;font-weight:600;color:var(--amber);margin-bottom:2mm">⚠ Lean Mass Preservation</div>
        <div class="copy"><p>Lean mass comprised <strong>${leanPct}%</strong> of total weight lost between ${tbFmtDate(prev.patient?.scan_date)} and ${tbFmtDate(curr.patient?.scan_date)}. Preserving muscle during weight loss is critical — resistance training and adequate protein (&gt;1.2 g/kg) are strongly recommended. Discuss with your clinician.</p></div>
      </div>`
      break
    }
  }

  return `
<section class="page">
  ${pageHeader(pt, 'Trend Analysis')}
  ${pageTitle('T', 'Trends', `How are my numbers <em>changing</em> over time?`)}
  <div class="pb">
    ${dateStrip}
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4mm;flex:1;align-content:start">
      ${metricCards}
    </div>
    ${leanCallout}
  </div>
  ${pageFooter('Trend data', pageNum, total)}
</section>`
}

/* ═══════════════════════════════════════════════════════════════════════════
   Main export
═══════════════════════════════════════════════════════════════════════════ */
export function generateEditorialHtml(data, { letterhead = false, history = [], preview = false } = {}) {
  const trendsFn = history.length > 0
    ? [(d, lh, n, t) => pageTrends(d, history, lh, n, t)]
    : []
  const pages = [page1, page2, page3, page4, ...trendsFn, page5]
  const total  = pages.length
  const body   = pages.map((fn, i) => fn(data, letterhead, i + 1, total)).join('\n')

  if (preview) {
    return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<title>Preview — ${esc(data.patient.name)}</title>
<style>
${CSS}
body{background:#6b7280!important;padding:20px;display:flex;flex-direction:column;align-items:center;gap:0}
.page{transform:scale(0.75);transform-origin:top center;margin-bottom:calc(-297mm * 0.25 + 24px);box-shadow:0 4px 20px rgba(0,0,0,.4);flex-shrink:0}
@media print{
  body{background:transparent!important;display:block;padding:0}
  .page{transform:none!important;margin:0!important;box-shadow:none!important;page-break-after:always;display:flex}
  .page:last-child{page-break-after:auto}
}
</style></head><body><main class="pages">${body}</main></body></html>`
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>DEXA — ${esc(data.patient.name)} · Body Composition Report</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<style>${CSS}</style>
</head>
<body${letterhead ? ' class="lh"' : ''}>
<main class="pages">
${body}
</main>
</body>
</html>`
}
