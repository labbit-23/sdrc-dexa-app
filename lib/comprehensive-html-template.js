/**
 * Comprehensive DEXA Report - Modern, Multi-Tenant Ready
 * Clean, visual, Gen-Z aesthetic with CMY-inspired colors
 */
import { esc, tbFmtDate, kg, kg2, pct } from './report-utils.js'
import { summaryItems, boneGuide, fatLossTargets } from './report-components.js'

const _BASE = process.env.NEXT_PUBLIC_BASEPATH || ''

export function generateComprehensiveHtml(reportData, opts = {}) {
  const pt = reportData.patient
  const comp = reportData.composition
  const calc = reportData.computed
  const bone = reportData.bone || {}
  const bilateral = reportData.bilateral || {}
  const img = reportData.images || {}
  const historyForRender = opts.history || []

  const getRegion = (name) => (comp.regions || {})[name] || { fat_g: 0, lean_g: 0, bone_g: 0, total_g: 0, fat_pct: 0 }
  const trunk = getRegion('Trunk')
  const android = getRegion('Android')
  const arms = getRegion('Arms')
  const gynoid = getRegion('Gynoid')
  const legs = getRegion('Legs')

  const clinicalSummary = summaryItems(comp, calc, bone, pt.gender, true)  // isComposition = true
  const fatLossData = fatLossTargets(comp, calc, pt.gender)
  const rmr = calc.rmr_kcal ? Math.round(calc.rmr_kcal) : null

  // Extract 60-day target fat percentage
  const targetFatPct = fatLossData && fatLossData.length > 0 ? fatLossData[0].goal_fat_pct : null
  const scratchpadPath = '/tmp/claude-1000/-home-sdrc-projects-sdrc-dexa/2ccadac3-ed24-437a-be2d-f697c2efbd1f/scratchpad'

  const CSS = `
:root {
  --optimal:#00D9FF; --optimal-dark:#00A8CC; --optimal-light:#66F0FF;
  --acceptable:#A78BFA; --acceptable-dark:#8B5CF6; --acceptable-light:#C4B5FD;
  --elevated:#FB923C; --elevated-dark:#EA580C; --elevated-light:#FDBA74;
  --dark:#0F0F1E; --dark-2:#1A1A2E; --dark-3:#16213E;
  --light:#F8F9FB; --light-2:#E8EAEF; --light-3:#D0D5E0;
  --text-primary:#0F0F1E; --text-secondary:#4A4F63; --text-muted:#8B92A9;
  --sans:"Inter","Segoe UI",system-ui,-apple-system,sans-serif;
  /* For backwards compatibility in existing code */
  --primary:#00D9FF; --primary-dark:#00A8CC; --primary-light:#66F0FF;
  --accent:#A78BFA; --accent-light:#C4B5FD; --accent-dark:#8B5CF6;
}
* { margin:0; padding:0; box-sizing:border-box; }
@page { size:A4; margin:0; }
body { font-family:var(--sans); color:var(--text-primary); background:var(--light); -webkit-print-color-adjust:exact; print-color-adjust:exact; }
img { max-width:100%; height:auto; display:block; }
[data-page] { width:210mm; height:297mm; margin:10mm auto; background:#fff; padding:14mm 18mm; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 20px 60px -15px rgba(15,15,30,.12); }
.dx-head { margin-bottom:8mm; border-bottom:2px solid var(--primary); padding-bottom:4mm; }
.dx-title { font-weight:900; font-size:36px; letter-spacing:-0.8px; line-height:1; color:var(--text-primary); }
.dx-sub { font-weight:500; font-size:18px; line-height:1.3; color:var(--primary); margin-top:2mm; }
.dx-sub-date { color:var(--text-secondary); font-weight:400; font-size:14px; }
.dx-kicker { font-weight:700; font-size:13px; text-transform:uppercase; letter-spacing:1px; color:var(--primary); }
.dx-kicker .lite { font-weight:400; color:var(--text-secondary); }
.dx-foot { margin-top:auto; padding-top:5mm; display:flex; justify-content:space-between; align-items:flex-end; border-top:1px solid var(--light-3); font-size:10px; }
.dx-foot-q { color:var(--text-secondary); line-height:1.6; }
.dx-foot-gen { color:var(--text-muted); }
.dx-foot-logo { display:flex; gap:6px; align-items:center; }
.dx-foot-logo img { height:20px; width:auto; }
.dx-flow { flex:1; display:flex; flex-direction:column; gap:6mm; min-height:0; }
.dx-flow > * { flex-shrink:0; }
.dx-patient { display:grid; grid-template-columns:1fr 140px; border:none; border-radius:12px; overflow:hidden; background:linear-gradient(135deg, var(--light) 0%, var(--light-2) 100%); border-left:6px solid var(--primary); }
.dx-patient-info { display:grid; grid-template-columns:1fr 1fr; gap:3mm 8mm; padding:6mm 8mm; align-content:center; font-size:14px; }
.dx-pi { display:flex; flex-direction:column; gap:1mm; }
.dx-pi .k { color:var(--text-muted); font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.3px; }
.dx-pi .v { font-weight:700; color:var(--text-primary); font-size:15px; }
.dx-patient-bf { background:linear-gradient(135deg, var(--accent) 0%, var(--accent-dark) 100%); color:#fff; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:1mm; padding:5mm; }
.dx-patient-bf .lbl { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.3px; opacity:0.9; }
.dx-patient-bf .big { font-size:48px; font-weight:900; line-height:1; }
.dx-badge-ring { width:85px; height:85px; border-radius:50%; border:3px solid; background:transparent; display:flex; flex-direction:column; align-items:center; justify-content:center; }
.dx-badge-val { font-size:32px; font-weight:900; line-height:1; }
.dx-badge-unit { font-size:11px; color:var(--text-secondary); font-weight:500; margin-top:2px; }
.dx-badge-label { font-size:12px; font-weight:600; letter-spacing:0.3px; text-transform:uppercase; margin-top:3mm; color:var(--text-primary); }
.dx-dark { background:linear-gradient(135deg, #2D3748 0%, #374151 100%); color:#E5E7EB; border-radius:12px; padding:6mm 7mm; border:1px solid #4B5563; }
.dx-dark h3 { font-size:18px; font-weight:700; margin-bottom:3mm; letter-spacing:0.5px; color:#F3F4F6; }
.dx-copy { font-size:13px; line-height:1.6; color:var(--text-secondary); }
.dx-copy strong { color:var(--text-primary); font-weight:700; }
.dx-copy h4 { font-size:15px; font-weight:700; color:var(--text-primary); margin:3mm 0 2mm; }
.dx-copy ul { padding-left:16px; } .dx-copy li { margin-bottom:1.5mm; }
.dx-scale { position:relative; padding-top:32px; }
.dx-scale-track { display:grid; grid-template-columns:repeat(6,1fr); gap:4px; height:18px; }
.dx-scale-track > span { border-radius:6px; }
.dx-scale-ends { display:flex; justify-content:space-between; font-size:13px; font-weight:700; margin-top:4px; color:var(--text-secondary); }
.dx-scale-marker { position:absolute; top:0; transform:translateX(-50%); display:flex; flex-direction:column; align-items:center; line-height:1; }
.dx-scale-marker-val { font-size:18px; font-weight:900; color:var(--primary); } .dx-scale-marker-tri { font-size:14px; margin-top:1px; }
.dx-reg-row { display:grid; grid-template-columns:75px repeat(5,1fr); align-items:center; text-align:center; }
.dx-reg-row > .rh { text-align:left; font-weight:700; font-size:12px; letter-spacing:0.3px; text-transform:uppercase; color:var(--text-secondary); }
.dx-reg-row > div { padding:8px 4px; font-size:13px; font-weight:600; color:var(--text-primary); }
.dx-reg-row.head > div { font-weight:700; font-size:11px; letter-spacing:0.4px; text-transform:uppercase; color:var(--primary); }
.dx-reg-row.plain + .dx-reg-row.plain { border-top:1px solid var(--light-3); }
.dx-reg-row.lean { background:linear-gradient(135deg, var(--success) 0%, #00D97B 100%); border-radius:8px; color:#0F0F1E; font-weight:700; } .dx-reg-row.lean .rh { color:#0F0F1E; font-weight:700; }
.dx-reg-row.fat { background:linear-gradient(135deg, var(--accent) 0%, var(--accent-light) 100%); border-radius:8px; color:#fff; } .dx-reg-row.fat .rh { color:#fff; }
.dx-reg-row.boner { background:linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%); border-radius:8px; color:#fff; } .dx-reg-row.boner .rh { color:#fff; }
.dx-reg-spacer { height:3px; }
.dx-cards3 { display:grid; grid-template-columns:repeat(3,1fr); gap:5mm; }
.dx-card3 { padding:6mm 7mm; border:none; border-radius:12px; font-size:13px; line-height:1.5; color:var(--text-secondary); background:var(--light-2); }
.dx-card3 h4 { font-size:15px; font-weight:700; color:var(--primary); margin-bottom:2mm; }
.dx-card3.fill-accent { background:linear-gradient(135deg, var(--accent) 0%, var(--accent-dark) 100%); border:none; color:#fff; } .dx-card3.fill-accent h4 { color:#fff; }
.dx-img-frame { display:flex; align-items:center; justify-content:center; overflow:visible; }
.dx-img-frame img { max-height:100%; width:auto; }
.dx-note { font-size:11px; font-style:italic; color:var(--text-muted); line-height:1.6; }
.dx-2 { display:grid; grid-template-columns:1fr 1fr; gap:6mm; }
.dx-3 { display:grid; grid-template-columns:repeat(3,1fr); gap:5mm; }
@media print {
  body { background:#fff; }
  [data-page] { margin:0; box-shadow:none; page-break-after:always; height:297mm; }
  [data-page]:last-child { page-break-after:auto; }
}
  `

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900&display=swap" rel="stylesheet">
  <style>${CSS}</style>
</head>
<body>

<!-- PAGE 1: COVER -->
<div data-page="1">
  <header class="dx-head">
    <h1 class="dx-title">BODY COMPOSITION</h1>
    <p class="dx-sub">Your DEXA Analysis <span class="dx-sub-date">• ${tbFmtDate(pt.scan_date)}</span></p>
  </header>
  <div class="dx-flow">
    <!-- Large Full-Body Heatmap (200mm width) -->
    <div class="dx-img-frame" style="width:100%;height:180mm;margin-bottom:6mm;background:var(--light-2);border-radius:12px;padding:4mm;display:flex;align-items:center;justify-content:center;flex:1;">
      ${img.composite_url ? `<img src="${esc(img.composite_url)}" alt="Body fat heatmap" style="max-width:200mm;max-height:180mm;width:auto;height:auto;" />` : `<img src="${scratchpadPath}/sample-000.png" alt="Body fat heatmap fallback" style="max-width:200mm;max-height:180mm;width:auto;height:auto;" />`}
    </div>

    <!-- Patient Info Box (Small) + 4 Metric Boxes -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr 1fr;gap:3mm;margin-bottom:4mm;">
      <!-- Patient Info Card -->
      <div style="padding:5mm;background:linear-gradient(135deg, var(--light), var(--light-2));border-radius:10px;border-left:4px solid var(--primary);">
        <div style="font-size:10px;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:0.3px;margin-bottom:2mm;">Patient</div>
        <div style="font-size:13px;font-weight:700;color:var(--text-primary);margin-bottom:3mm;">${esc(pt.name || '')}</div>
        <div style="font-size:10px;line-height:1.4;color:var(--text-secondary);">
          Age: ${pt.age || 'N/A'}y | ${pt.gender || 'N/A'}<br/>
          ${pt.height_cm || 'N/A'}cm | ${kg(comp.total_g)}
        </div>
      </div>

      <!-- Total Mass -->
      <div style="padding:6mm;background:var(--light-2);border-radius:10px;border-top:3px solid var(--text-primary);text-align:center;">
        <div style="font-size:9px;color:var(--text-muted);font-weight:700;text-transform:uppercase;letter-spacing:0.3px;margin-bottom:3mm;">Total Mass</div>
        <div style="font-size:28px;font-weight:900;color:var(--text-primary);">${kg(comp.total_g)}</div>
      </div>

      <!-- Lean Mass -->
      <div style="padding:6mm;background:linear-gradient(135deg, #00D9FF15, #00D9FF08);border-radius:10px;border-top:3px solid var(--optimal);text-align:center;">
        <div style="font-size:9px;color:var(--text-muted);font-weight:700;text-transform:uppercase;letter-spacing:0.3px;margin-bottom:3mm;">Lean Mass</div>
        <div style="font-size:28px;font-weight:900;color:var(--optimal);">${kg(comp.lean_g)}</div>
      </div>

      <!-- Fat Mass -->
      <div style="padding:6mm;background:linear-gradient(135deg, #FB923C15, #FB923C08);border-radius:10px;border-top:3px solid var(--elevated);text-align:center;">
        <div style="font-size:9px;color:var(--text-muted);font-weight:700;text-transform:uppercase;letter-spacing:0.3px;margin-bottom:3mm;">Fat Mass</div>
        <div style="font-size:28px;font-weight:900;color:var(--elevated);">${kg(comp.fat_g)}</div>
      </div>

      <!-- Bone Mineral -->
      <div style="padding:6mm;background:linear-gradient(135deg, #A0A0A015, #A0A0A008);border-radius:10px;border-top:3px solid #A0A0A0;text-align:center;">
        <div style="font-size:9px;color:var(--text-muted);font-weight:700;text-transform:uppercase;letter-spacing:0.3px;margin-bottom:3mm;">Bone</div>
        <div style="font-size:28px;font-weight:900;color:#A0A0A0;">${kg2(comp.bmc_g)}</div>
      </div>
    </div>

    <!-- Gold Standard Explanation Box -->
    <div class="dx-dark">
      <h3>Gold Standard DEXA</h3>
      <p style="color:#E8EAEF;margin-top:2mm;font-size:12px;line-height:1.5;">DEXA directly measures all three body composition components—bone mineral content, lean mass, and fat mass—with no algorithms or assumptions. This is the clinical gold standard used for medical diagnosis and research.</p>
    </div>
  </div>
  <footer class="dx-foot">
    <div class="dx-foot-q">Diagnostic Body Composition Report<br><a href="https://www.sdrc.in" style="color:inherit;text-decoration:none;">SDRC</a> • <a href="https://labit.online" style="color:inherit;text-decoration:none;">Labit</a><br><span class="dx-foot-gen">High-precision DEXA analysis</span></div>
    <div style="display:flex;gap:10px;align-items:center;">
      <div style="font-size:10px;color:var(--text-muted);font-weight:600;">1 / 9</div>
      <div class="dx-foot-logo">
        <img src="${_BASE}/sdrc-logo.png" alt="SDRC" />
        <img src="${_BASE}/labit-logo.png" alt="Labit" />
      </div>
    </div>
  </footer>
</div>

<!-- PAGE 2: BODY FAT ANALYSIS -->
<div data-page="2">
  <header class="dx-head">
    <h1 class="dx-title">BODY FAT ANALYSIS</h1>
    <p class="dx-sub">Your Composition Status <span class="dx-sub-date">• Progress Tracking</span></p>
  </header>
  <div class="dx-flow">
    <!-- Body Fat Scale (0-50% range with colored zones) -->
    <div style="margin-bottom:6mm;">
      <div class="dx-kicker">CURRENT BODY FAT STATUS</div>
      <div class="dx-scale" style="margin-top:6mm;">
        <div class="dx-scale-marker" style="left:${Math.min(Math.max(comp.fat_pct / 50 * 100, 1), 99)}%"><span class="dx-scale-marker-val">${pct(comp.fat_pct)}</span><span class="dx-scale-marker-tri">▼</span></div>
        <div class="dx-scale-track">
          <span style="background:linear-gradient(90deg, #00F5A0, #00E68D);"></span>
          <span style="background:linear-gradient(90deg, #1FD68F, #00D97B);"></span>
          <span style="background:linear-gradient(90deg, #FFF000, #FFD700);"></span>
          <span style="background:linear-gradient(90deg, #FFA500, #FF8C00);"></span>
          <span style="background:linear-gradient(90deg, #FF6B4B, #FF4444);"></span>
          <span style="background:linear-gradient(90deg, #FF006E, #CC0056);"></span>
        </div>
        <div class="dx-scale-ends"><span style="color:#00D97B;">Lean</span><span style="color:#CC0056;">High</span></div>
      </div>
    </div>

    <!-- Trends Section with Large Body Diagram + Target Info -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6mm;margin-bottom:6mm;flex:1;min-height:0;align-items:flex-start;">
      <!-- Large Trend Image -->
      <div class="dx-img-frame" style="background:var(--light-2);border-radius:10px;padding:4mm;height:200px;">
        ${img.fat_gradient_url ? `<img src="${esc(img.fat_gradient_url)}" alt="Body composition trends" style="height:100%;width:auto;" />` : `<img src="${scratchpadPath}/sample-003.png" alt="Fat trends fallback" style="height:100%;width:auto;" />`}
      </div>

      <!-- Target & Percentile Info -->
      <div style="display:flex;flex-direction:column;gap:4mm;">
        <!-- 60-Day Target Box -->
        <div style="padding:7mm;background:linear-gradient(135deg, var(--accent), var(--accent-dark));border-radius:12px;color:#fff;">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;opacity:0.9;margin-bottom:3mm;">RECOMMENDED 60 DAY TARGET</div>
          <div style="font-size:36px;font-weight:900;margin-bottom:2mm;">${targetFatPct ? pct(targetFatPct) : 'N/A'}</div>
          <div style="font-size:12px;opacity:0.85;line-height:1.4;">Progress target based on your baseline composition and health goals.</div>
        </div>

        <!-- Percentile Rank Box -->
        ${comp.centile ? (() => {
          const c = parseInt(comp.centile);
          let color, gradient, status, interpretation;
          if (c <= 25) { color = 'var(--optimal)'; gradient = 'linear-gradient(135deg, var(--optimal), var(--optimal-dark))'; status = 'Excellent'; interpretation = 'Lower body fat than 75% of peers'; }
          else if (c <= 50) { color = 'var(--optimal)'; gradient = 'linear-gradient(135deg, var(--optimal), var(--optimal-dark))'; status = 'Good'; interpretation = 'Lower body fat than 50% of peers'; }
          else if (c <= 75) { color = 'var(--acceptable)'; gradient = 'linear-gradient(135deg, var(--acceptable), var(--acceptable-dark))'; status = 'Acceptable'; interpretation = 'Higher body fat than 25% of peers'; }
          else { color = 'var(--elevated)'; gradient = 'linear-gradient(135deg, var(--elevated), var(--elevated-dark))'; status = 'Elevated'; interpretation = 'Higher body fat than 75%+ of peers'; }
          return `<div style="background:${gradient};padding:7mm;border-radius:12px;color:#fff;">
            <div style="font-size:11px;opacity:0.85;margin-bottom:2mm;text-transform:uppercase;letter-spacing:0.3px;font-weight:700;">Age-Matched Percentile</div>
            <div style="font-size:42px;font-weight:900;line-height:1;margin-bottom:2mm;">${c}<span style="font-size:22px;opacity:0.8;">th</span></div>
            <div style="font-size:13px;font-weight:600;opacity:0.9;margin-bottom:2mm;">${status}</div>
            <div style="font-size:12px;opacity:0.85;line-height:1.4;">${interpretation}</div>
          </div>`;
        })() : '<div style="padding:7mm;background:var(--light-2);border-radius:12px;color:var(--text-secondary);">Percentile data unavailable</div>'}
      </div>
    </div>

    <!-- Guidance Box -->
    ${comp.centile ? (() => {
      const c = parseInt(comp.centile);
      let guidance;
      if (c <= 25) guidance = '✓ Outstanding composition. Maintain your training & nutrition protocol.';
      else if (c <= 50) guidance = '✓ Strong composition. Continue current routine or optimize further.';
      else if (c <= 75) guidance = '⚡ Room for improvement. Add 3–4×/week resistance training and increase protein intake.';
      else guidance = '⬆ Priority area. Focus on lean mass gain and fat loss over 6–12 months to improve health markers.';
      return `<div style="padding:6mm;background:var(--light-2);border-radius:10px;border-left:4px solid var(--primary);">
        <p style="margin:0;font-size:13px;line-height:1.6;color:var(--text-primary);font-weight:500;">${guidance}</p>
      </div>`;
    })() : ''}
  </div>
  <footer class="dx-foot">
    <div class="dx-foot-q">Body fat scale analysis<br>Age-matched percentile ranking<br><span class="dx-foot-gen">Professional diagnostic reference</span></div>
    <div style="display:flex;gap:10px;align-items:center;">
      <div style="font-size:10px;color:var(--text-muted);font-weight:600;">2 / 9</div>
      <div class="dx-foot-logo">
        <img src="${_BASE}/sdrc-logo.png" alt="SDRC" />
        <img src="${_BASE}/labit-logo.png" alt="Labit" />
      </div>
    </div>
  </footer>
</div>

<!-- PAGE 3: REGIONAL ANALYSIS -->
<div data-page="3">
  <header class="dx-head">
    <h1 class="dx-title">REGIONAL ANALYSIS</h1>
    <p class="dx-sub">Regional Fat Distribution <span class="dx-sub-date">• Body Composition Breakdown</span></p>
  </header>
  <div class="dx-flow">
    <!-- 5 Large Body Diagrams (60mm each) -->
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:4mm;margin-bottom:8mm;">
      <!-- Trunk -->
      <div style="text-align:center;">
        <div class="dx-img-frame" style="width:60mm;height:60mm;margin:0 auto 4mm;background:var(--light-2);border-radius:8px;padding:2mm;">
          <img src="${scratchpadPath}/sample-002.png" alt="Trunk" style="width:100%;height:100%;object-fit:contain;" />
        </div>
        <div style="font-size:13px;font-weight:700;color:var(--text-primary);margin-bottom:3mm;">Trunk</div>
        <div style="font-size:32px;font-weight:900;color:${trunk.fat_pct > 30 ? 'var(--elevated)' : 'var(--optimal)'};">${pct(trunk.fat_pct)}</div>
      </div>

      <!-- Android -->
      <div style="text-align:center;">
        <div class="dx-img-frame" style="width:60mm;height:60mm;margin:0 auto 4mm;background:var(--light-2);border-radius:8px;padding:2mm;">
          <img src="${scratchpadPath}/sample-004.png" alt="Android" style="width:100%;height:100%;object-fit:contain;" />
        </div>
        <div style="font-size:13px;font-weight:700;color:var(--text-primary);margin-bottom:3mm;">Android</div>
        <div style="font-size:32px;font-weight:900;color:${android.fat_pct > 30 ? 'var(--elevated)' : 'var(--optimal)'};">${pct(android.fat_pct)}</div>
      </div>

      <!-- Arms -->
      <div style="text-align:center;">
        <div class="dx-img-frame" style="width:60mm;height:60mm;margin:0 auto 4mm;background:var(--light-2);border-radius:8px;padding:2mm;">
          <img src="${scratchpadPath}/sample-007.png" alt="Arms" style="width:100%;height:100%;object-fit:contain;" />
        </div>
        <div style="font-size:13px;font-weight:700;color:var(--text-primary);margin-bottom:3mm;">Arms</div>
        <div style="font-size:32px;font-weight:900;color:${arms.fat_pct > 30 ? 'var(--elevated)' : 'var(--optimal)'};">${pct(arms.fat_pct)}</div>
      </div>

      <!-- Gynoid -->
      <div style="text-align:center;">
        <div class="dx-img-frame" style="width:60mm;height:60mm;margin:0 auto 4mm;background:var(--light-2);border-radius:8px;padding:2mm;">
          <img src="${scratchpadPath}/sample-006.png" alt="Gynoid" style="width:100%;height:100%;object-fit:contain;" />
        </div>
        <div style="font-size:13px;font-weight:700;color:var(--text-primary);margin-bottom:3mm;">Gynoid</div>
        <div style="font-size:32px;font-weight:900;color:${gynoid.fat_pct > 30 ? 'var(--elevated)' : 'var(--optimal)'};">${pct(gynoid.fat_pct)}</div>
      </div>

      <!-- Legs -->
      <div style="text-align:center;">
        <div class="dx-img-frame" style="width:60mm;height:60mm;margin:0 auto 4mm;background:var(--light-2);border-radius:8px;padding:2mm;">
          <img src="${scratchpadPath}/sample-010.png" alt="Legs" style="width:100%;height:100%;object-fit:contain;" />
        </div>
        <div style="font-size:13px;font-weight:700;color:var(--text-primary);margin-bottom:3mm;">Legs</div>
        <div style="font-size:32px;font-weight:900;color:${legs.fat_pct > 30 ? 'var(--elevated)' : 'var(--optimal)'};">${pct(legs.fat_pct)}</div>
      </div>
    </div>

    <!-- Regional Data Table -->
    <div style="margin-bottom:6mm;">
      <div class="dx-kicker" style="margin-bottom:4mm;">TISSUE COMPOSITION <span class="lite">BY REGION</span></div>
      <div style="overflow-x:auto;">
        <div class="dx-reg-row head">
          <div class="rh">Region</div>
          <div>Fat %</div>
          <div>Total</div>
          <div style="color:#00D9FF;">Lean</div>
          <div style="color:#FF69B4;">Fat</div>
          <div style="color:#A0A0A0;">Bone</div>
        </div>
        <div class="dx-reg-row plain">
          <div class="rh">Trunk</div>
          <div>${pct(trunk.fat_pct)}</div>
          <div>${trunk.total_g ? kg(trunk.total_g) : '—'}</div>
          <div>${trunk.lean_g ? kg(trunk.lean_g) : '—'}</div>
          <div>${trunk.fat_g ? kg(trunk.fat_g) : '—'}</div>
          <div>${trunk.bone_g ? kg2(trunk.bone_g) : '—'}</div>
        </div>
        <div class="dx-reg-row plain">
          <div class="rh">Android</div>
          <div>${pct(android.fat_pct)}</div>
          <div>${android.total_g ? kg(android.total_g) : '—'}</div>
          <div>${android.lean_g ? kg(android.lean_g) : '—'}</div>
          <div>${android.fat_g ? kg(android.fat_g) : '—'}</div>
          <div>${android.bone_g ? kg2(android.bone_g) : '—'}</div>
        </div>
        <div class="dx-reg-row plain">
          <div class="rh">Arms</div>
          <div>${pct(arms.fat_pct)}</div>
          <div>${arms.total_g ? kg(arms.total_g) : '—'}</div>
          <div>${arms.lean_g ? kg(arms.lean_g) : '—'}</div>
          <div>${arms.fat_g ? kg(arms.fat_g) : '—'}</div>
          <div>${arms.bone_g ? kg2(arms.bone_g) : '—'}</div>
        </div>
        <div class="dx-reg-row plain">
          <div class="rh">Gynoid</div>
          <div>${pct(gynoid.fat_pct)}</div>
          <div>${gynoid.total_g ? kg(gynoid.total_g) : '—'}</div>
          <div>${gynoid.lean_g ? kg(gynoid.lean_g) : '—'}</div>
          <div>${gynoid.fat_g ? kg(gynoid.fat_g) : '—'}</div>
          <div>${gynoid.bone_g ? kg2(gynoid.bone_g) : '—'}</div>
        </div>
        <div class="dx-reg-row plain">
          <div class="rh">Legs</div>
          <div>${pct(legs.fat_pct)}</div>
          <div>${legs.total_g ? kg(legs.total_g) : '—'}</div>
          <div>${legs.lean_g ? kg(legs.lean_g) : '—'}</div>
          <div>${legs.fat_g ? kg(legs.fat_g) : '—'}</div>
          <div>${legs.bone_g ? kg2(legs.bone_g) : '—'}</div>
        </div>
      </div>
    </div>

    <!-- Causes of Imbalance Box -->
    <div class="dx-cards3">
      <div class="dx-card3">
        <h4>What Causes It?</h4>
        <p style="margin:0;font-size:12px;line-height:1.5;color:var(--text-secondary);">Genetics, activity patterns, training history, and lifestyle determine fat and muscle distribution across body regions.</p>
      </div>
      <div class="dx-card3">
        <h4>How Does It Affect?</h4>
        <p style="margin:0;font-size:12px;line-height:1.5;color:var(--text-secondary);">Regional imbalance impacts athletic performance, injury risk in weak areas, metabolic health, and overall mobility and function.</p>
      </div>
      <div class="dx-card3">
        <h4>How to Improve?</h4>
        <p style="margin:0;font-size:12px;line-height:1.5;color:var(--text-secondary);">Target weak regions with progressive resistance training, optimize nutrition, and track changes with follow-up scans every 6–12 months.</p>
      </div>
    </div>
  </div>
  <footer class="dx-foot">
    <div class="dx-foot-q">Segmental composition analysis<br>DEXA scan reference data<br><span class="dx-foot-gen">Professional diagnostic standard</span></div>
    <div style="display:flex;gap:10px;align-items:center;">
      <div style="font-size:10px;color:var(--text-muted);font-weight:600;">3 / 9</div>
      <div class="dx-foot-logo">
        <img src="${_BASE}/sdrc-logo.png" alt="SDRC" />
        <img src="${_BASE}/labit-logo.png" alt="Labit" />
      </div>
    </div>
  </footer>
</div>

<!-- PAGE 4: SECTIONAL ANALYSIS -->
<div data-page="4">
  <header class="dx-head">
    <h1 class="dx-title">SECTIONAL ANALYSIS</h1>
    <p class="dx-sub">Central Body Breakdown <span class="dx-sub-date">• Regional Callout Map</span></p>
  </header>
  <div class="dx-flow">
    <!-- Central Body Diagram (200mm) with Callouts -->
    <div style="display:grid;grid-template-columns:1.2fr 0.8fr;gap:6mm;flex:1;min-height:0;">
      <!-- Large Central Diagram -->
      <div class="dx-img-frame" style="background:var(--light-2);border-radius:12px;padding:6mm;width:100%;height:100%;display:flex;align-items:center;justify-content:center;">
        <img src="${scratchpadPath}/sample-009.png" alt="Body sectional map" style="max-width:200mm;max-height:250mm;width:auto;height:auto;" />
      </div>

      <!-- Regional Callout Information -->
      <div style="display:flex;flex-direction:column;gap:3mm;overflow-y:auto;">
        <div style="background:${trunk.fat_pct > 30 ? 'linear-gradient(135deg, #FB923C15, #FB923C08)' : 'var(--light-2)'};padding:5mm;border-radius:8px;border-left:4px solid ${trunk.fat_pct > 30 ? 'var(--elevated)' : 'var(--optimal)'};">
          <div style="font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:2mm;">Trunk</div>
          <div style="font-size:26px;font-weight:900;color:${trunk.fat_pct > 30 ? 'var(--elevated)' : 'var(--optimal)'};">${pct(trunk.fat_pct)}</div>
          <div style="font-size:10px;color:var(--text-secondary);margin-top:2mm;line-height:1.4;">Central region | Reference avg</div>
        </div>
        <div style="background:${android.fat_pct > 30 ? 'linear-gradient(135deg, #FB923C15, #FB923C08)' : 'var(--light-2)'};padding:5mm;border-radius:8px;border-left:4px solid ${android.fat_pct > 30 ? 'var(--elevated)' : 'var(--optimal)'};">
          <div style="font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:2mm;">Android</div>
          <div style="font-size:26px;font-weight:900;color:${android.fat_pct > 30 ? 'var(--elevated)' : 'var(--optimal)'};">${pct(android.fat_pct)}</div>
          <div style="font-size:10px;color:var(--text-secondary);margin-top:2mm;line-height:1.4;">Central fat pattern</div>
        </div>
        <div style="background:${arms.fat_pct > 30 ? 'linear-gradient(135deg, #FB923C15, #FB923C08)' : 'var(--light-2)'};padding:5mm;border-radius:8px;border-left:4px solid ${arms.fat_pct > 30 ? 'var(--elevated)' : 'var(--optimal)'};">
          <div style="font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:2mm;">Arms</div>
          <div style="font-size:26px;font-weight:900;color:${arms.fat_pct > 30 ? 'var(--elevated)' : 'var(--optimal)'};">${pct(arms.fat_pct)}</div>
          <div style="font-size:10px;color:var(--text-secondary);margin-top:2mm;line-height:1.4;">Upper limbs</div>
        </div>
        <div style="background:${gynoid.fat_pct > 30 ? 'linear-gradient(135deg, #FB923C15, #FB923C08)' : 'var(--light-2)'};padding:5mm;border-radius:8px;border-left:4px solid ${gynoid.fat_pct > 30 ? 'var(--elevated)' : 'var(--optimal)'};">
          <div style="font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:2mm;">Gynoid</div>
          <div style="font-size:26px;font-weight:900;color:${gynoid.fat_pct > 30 ? 'var(--elevated)' : 'var(--optimal)'};">${pct(gynoid.fat_pct)}</div>
          <div style="font-size:10px;color:var(--text-secondary);margin-top:2mm;line-height:1.4;">Lower body</div>
        </div>
        <div style="background:${legs.fat_pct > 30 ? 'linear-gradient(135deg, #FB923C15, #FB923C08)' : 'var(--light-2)'};padding:5mm;border-radius:8px;border-left:4px solid ${legs.fat_pct > 30 ? 'var(--elevated)' : 'var(--optimal)'};">
          <div style="font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:2mm;">Legs</div>
          <div style="font-size:26px;font-weight:900;color:${legs.fat_pct > 30 ? 'var(--elevated)' : 'var(--optimal)'};">${pct(legs.fat_pct)}</div>
          <div style="font-size:10px;color:var(--text-secondary);margin-top:2mm;line-height:1.4;">Foundation mass</div>
        </div>
      </div>
    </div>

    <!-- Methodology Note -->
    <div style="padding:5mm;background:var(--light-2);border-radius:8px;margin-top:4mm;border-left:4px solid var(--primary);">
      <div style="font-size:11px;color:var(--text-secondary);line-height:1.6;">Sectional analysis uses standardized DEXA regions to map fat distribution patterns. Compare current values to reference ranges to identify areas for targeted training and optimization.</div>
    </div>
  </div>
  <footer class="dx-foot">
    <div class="dx-foot-q">Sectional body composition map<br>Regional callout reference<br><span class="dx-foot-gen">Clinical DEXA analysis</span></div>
    <div style="display:flex;gap:10px;align-items:center;">
      <div style="font-size:10px;color:var(--text-muted);font-weight:600;">4 / 9</div>
      <div class="dx-foot-logo">
        <img src="${_BASE}/sdrc-logo.png" alt="SDRC" />
        <img src="${_BASE}/labit-logo.png" alt="Labit" />
      </div>
    </div>
  </footer>
</div>

<!-- PAGE 5: LEFT-RIGHT SYMMETRY (Part 1) -->
<div data-page="5">
  <header class="dx-head">
    <h1 class="dx-title">LEFT VS RIGHT SYMMETRY</h1>
    <p class="dx-sub">Bilateral Composition Analysis <span class="dx-sub-date">• Body Balance Assessment</span></p>
  </header>
  <div class="dx-flow">
    <!-- 6 Bilateral Diagrams in 2x3 Grid -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:5mm;margin-bottom:8mm;">
      <!-- Left Arm -->
      <div style="text-align:center;">
        <div class="dx-img-frame" style="width:100%;height:100px;margin-bottom:4mm;background:var(--light-2);border-radius:10px;padding:2mm;">
          <img src="${scratchpadPath}/sample-011.png" alt="Left Arm" style="height:100%;width:auto;" />
        </div>
        <div style="font-size:13px;font-weight:700;color:var(--text-primary);margin-bottom:2mm;">Left Arm</div>
        <div style="font-size:20px;font-weight:900;color:var(--optimal);">${pct((bilateral.left_arm || {}).fat_pct || 0)}</div>
      </div>

      <!-- Right Arm -->
      <div style="text-align:center;">
        <div class="dx-img-frame" style="width:100%;height:100px;margin-bottom:4mm;background:var(--light-2);border-radius:10px;padding:2mm;">
          <img src="${scratchpadPath}/sample-012.png" alt="Right Arm" style="height:100%;width:auto;" />
        </div>
        <div style="font-size:13px;font-weight:700;color:var(--text-primary);margin-bottom:2mm;">Right Arm</div>
        <div style="font-size:20px;font-weight:900;color:var(--optimal);">${pct((bilateral.right_arm || {}).fat_pct || 0)}</div>
      </div>

      <!-- Balance Indicator (Arms) -->
      <div style="text-align:center;display:flex;flex-direction:column;justify-content:center;">
        <div style="font-size:28px;margin-bottom:2mm;font-weight:900;">⚖</div>
        <div style="font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:2mm;">Arm Balance</div>
        <div style="font-size:14px;font-weight:700;color:${Math.abs(((bilateral.left_arm || {}).fat_pct || 0) - ((bilateral.right_arm || {}).fat_pct || 0)) < 3 ? 'var(--optimal)' : 'var(--elevated)'};background:var(--light-2);padding:4mm;border-radius:8px;">
          ${Math.abs(((bilateral.left_arm || {}).fat_pct || 0) - ((bilateral.right_arm || {}).fat_pct || 0)).toFixed(1)}% diff
        </div>
      </div>

      <!-- Left Leg -->
      <div style="text-align:center;">
        <div class="dx-img-frame" style="width:100%;height:100px;margin-bottom:4mm;background:var(--light-2);border-radius:10px;padding:2mm;">
          <img src="${scratchpadPath}/sample-013.png" alt="Left Leg" style="height:100%;width:auto;" />
        </div>
        <div style="font-size:13px;font-weight:700;color:var(--text-primary);margin-bottom:2mm;">Left Leg</div>
        <div style="font-size:20px;font-weight:900;color:var(--optimal);">${pct((bilateral.left_leg || {}).fat_pct || 0)}</div>
      </div>

      <!-- Right Leg -->
      <div style="text-align:center;">
        <div class="dx-img-frame" style="width:100%;height:100px;margin-bottom:4mm;background:var(--light-2);border-radius:10px;padding:2mm;">
          <img src="${scratchpadPath}/sample-014.png" alt="Right Leg" style="height:100%;width:auto;" />
        </div>
        <div style="font-size:13px;font-weight:700;color:var(--text-primary);margin-bottom:2mm;">Right Leg</div>
        <div style="font-size:20px;font-weight:900;color:var(--optimal);">${pct((bilateral.right_leg || {}).fat_pct || 0)}</div>
      </div>

      <!-- Balance Indicator (Legs) -->
      <div style="text-align:center;display:flex;flex-direction:column;justify-content:center;">
        <div style="font-size:28px;margin-bottom:2mm;font-weight:900;">⚖</div>
        <div style="font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:2mm;">Leg Balance</div>
        <div style="font-size:14px;font-weight:700;color:${Math.abs(((bilateral.left_leg || {}).fat_pct || 0) - ((bilateral.right_leg || {}).fat_pct || 0)) < 3 ? 'var(--optimal)' : 'var(--elevated)'};background:var(--light-2);padding:4mm;border-radius:8px;">
          ${Math.abs(((bilateral.left_leg || {}).fat_pct || 0) - ((bilateral.right_leg || {}).fat_pct || 0)).toFixed(1)}% diff
        </div>
      </div>
    </div>

    <!-- Bilateral Composition Table -->
    <div>
      <div class="dx-kicker" style="margin-bottom:4mm;">BILATERAL TISSUE COMPOSITION</div>
      <div style="overflow-x:auto;">
        <div class="dx-reg-row head">
          <div class="rh">Region</div>
          <div>Fat %</div>
          <div>Total</div>
          <div style="color:#00D9FF;">Lean</div>
          <div style="color:#FF69B4;">Fat</div>
          <div style="color:#A0A0A0;">Bone</div>
        </div>
        ${(() => {
          const leftArmData = bilateral.left_arm || { fat_g: 0, lean_g: 0, bone_g: 0, total_g: 0, fat_pct: 0 };
          const rightArmData = bilateral.right_arm || { fat_g: 0, lean_g: 0, bone_g: 0, total_g: 0, fat_pct: 0 };
          const leftLegData = bilateral.left_leg || { fat_g: 0, lean_g: 0, bone_g: 0, total_g: 0, fat_pct: 0 };
          const rightLegData = bilateral.right_leg || { fat_g: 0, lean_g: 0, bone_g: 0, total_g: 0, fat_pct: 0 };
          const leftTrunkData = bilateral.left_trunk || { fat_g: 0, lean_g: 0, bone_g: 0, total_g: 0, fat_pct: 0 };
          const rightTrunkData = bilateral.right_trunk || { fat_g: 0, lean_g: 0, bone_g: 0, total_g: 0, fat_pct: 0 };
          return `
        <div class="dx-reg-row plain">
          <div class="rh">Left Arm</div>
          <div>${pct(leftArmData.fat_pct)}</div>
          <div>${leftArmData.total_g ? kg(leftArmData.total_g) : '—'}</div>
          <div>${leftArmData.lean_g ? kg(leftArmData.lean_g) : '—'}</div>
          <div>${leftArmData.fat_g ? kg(leftArmData.fat_g) : '—'}</div>
          <div>${leftArmData.bone_g ? kg2(leftArmData.bone_g) : '—'}</div>
        </div>
        <div class="dx-reg-row plain">
          <div class="rh">Right Arm</div>
          <div>${pct(rightArmData.fat_pct)}</div>
          <div>${rightArmData.total_g ? kg(rightArmData.total_g) : '—'}</div>
          <div>${rightArmData.lean_g ? kg(rightArmData.lean_g) : '—'}</div>
          <div>${rightArmData.fat_g ? kg(rightArmData.fat_g) : '—'}</div>
          <div>${rightArmData.bone_g ? kg2(rightArmData.bone_g) : '—'}</div>
        </div>
        <div class="dx-reg-row plain">
          <div class="rh">Left Leg</div>
          <div>${pct(leftLegData.fat_pct)}</div>
          <div>${leftLegData.total_g ? kg(leftLegData.total_g) : '—'}</div>
          <div>${leftLegData.lean_g ? kg(leftLegData.lean_g) : '—'}</div>
          <div>${leftLegData.fat_g ? kg(leftLegData.fat_g) : '—'}</div>
          <div>${leftLegData.bone_g ? kg2(leftLegData.bone_g) : '—'}</div>
        </div>
        <div class="dx-reg-row plain">
          <div class="rh">Right Leg</div>
          <div>${pct(rightLegData.fat_pct)}</div>
          <div>${rightLegData.total_g ? kg(rightLegData.total_g) : '—'}</div>
          <div>${rightLegData.lean_g ? kg(rightLegData.lean_g) : '—'}</div>
          <div>${rightLegData.fat_g ? kg(rightLegData.fat_g) : '—'}</div>
          <div>${rightLegData.bone_g ? kg2(rightLegData.bone_g) : '—'}</div>
        </div>
        <div class="dx-reg-row plain">
          <div class="rh">Left Trunk</div>
          <div>${pct(leftTrunkData.fat_pct)}</div>
          <div>${leftTrunkData.total_g ? kg(leftTrunkData.total_g) : '—'}</div>
          <div>${leftTrunkData.lean_g ? kg(leftTrunkData.lean_g) : '—'}</div>
          <div>${leftTrunkData.fat_g ? kg(leftTrunkData.fat_g) : '—'}</div>
          <div>${leftTrunkData.bone_g ? kg2(leftTrunkData.bone_g) : '—'}</div>
        </div>
        <div class="dx-reg-row plain">
          <div class="rh">Right Trunk</div>
          <div>${pct(rightTrunkData.fat_pct)}</div>
          <div>${rightTrunkData.total_g ? kg(rightTrunkData.total_g) : '—'}</div>
          <div>${rightTrunkData.lean_g ? kg(rightTrunkData.lean_g) : '—'}</div>
          <div>${rightTrunkData.fat_g ? kg(rightTrunkData.fat_g) : '—'}</div>
          <div>${rightTrunkData.bone_g ? kg2(rightTrunkData.bone_g) : '—'}</div>
        </div>
          `;
        })()}
      </div>
    </div>
  </div>
  <footer class="dx-foot">
    <div class="dx-foot-q">Bilateral symmetry analysis<br>Left-right balance assessment<br><span class="dx-foot-gen">Part 1 of 2</span></div>
    <div style="display:flex;gap:10px;align-items:center;">
      <div style="font-size:10px;color:var(--text-muted);font-weight:600;">5 / 9</div>
      <div class="dx-foot-logo">
        <img src="${_BASE}/sdrc-logo.png" alt="SDRC" />
        <img src="${_BASE}/labit-logo.png" alt="Labit" />
      </div>
    </div>
  </footer>
</div>

<!-- PAGE 6: LEFT-RIGHT SYMMETRY (Part 2) -->
<div data-page="6">
  <header class="dx-head">
    <h1 class="dx-title">SYMMETRY ASSESSMENT</h1>
    <p class="dx-sub">Sectional & Whole Body Balance <span class="dx-sub-date">• Imbalance Detection</span></p>
  </header>
  <div class="dx-flow">
    <!-- Left/Right Trunk Diagrams -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:5mm;margin-bottom:8mm;">
      <!-- Left Trunk -->
      <div style="text-align:center;">
        <div class="dx-img-frame" style="width:100%;height:100px;margin-bottom:4mm;background:var(--light-2);border-radius:10px;padding:2mm;">
          <img src="${scratchpadPath}/sample-015.png" alt="Left Trunk" style="height:100%;width:auto;" />
        </div>
        <div style="font-size:13px;font-weight:700;color:var(--text-primary);margin-bottom:2mm;">Left Trunk</div>
        <div style="font-size:20px;font-weight:900;color:var(--optimal);">${pct((bilateral.left_trunk || {}).fat_pct || 0)}</div>
      </div>

      <!-- Right Trunk -->
      <div style="text-align:center;">
        <div class="dx-img-frame" style="width:100%;height:100px;margin-bottom:4mm;background:var(--light-2);border-radius:10px;padding:2mm;">
          <img src="${scratchpadPath}/sample-016.png" alt="Right Trunk" style="height:100%;width:auto;" />
        </div>
        <div style="font-size:13px;font-weight:700;color:var(--text-primary);margin-bottom:2mm;">Right Trunk</div>
        <div style="font-size:20px;font-weight:900;color:var(--optimal);">${pct((bilateral.right_trunk || {}).fat_pct || 0)}</div>
      </div>

      <!-- Balance Indicator (Trunk) -->
      <div style="text-align:center;display:flex;flex-direction:column;justify-content:center;">
        <div style="font-size:28px;margin-bottom:2mm;font-weight:900;">⚖</div>
        <div style="font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:2mm;">Trunk Balance</div>
        <div style="font-size:14px;font-weight:700;color:${Math.abs(((bilateral.left_trunk || {}).fat_pct || 0) - ((bilateral.right_trunk || {}).fat_pct || 0)) < 3 ? 'var(--optimal)' : 'var(--elevated)'};background:var(--light-2);padding:4mm;border-radius:8px;">
          ${Math.abs(((bilateral.left_trunk || {}).fat_pct || 0) - ((bilateral.right_trunk || {}).fat_pct || 0)).toFixed(1)}% diff
        </div>
      </div>
    </div>

    <!-- Balance Interpretation Cards -->
    <div class="dx-3">
      <div style="padding:6mm;background:linear-gradient(135deg, #00D97B15, #00D97B08);border-radius:10px;border-left:4px solid #00D97B;">
        <h4 style="font-size:13px;font-weight:700;color:#00D97B;margin-bottom:3mm;">Good Balance</h4>
        <p style="margin:0;font-size:12px;line-height:1.5;color:var(--text-secondary);">Symmetry is well-maintained across bilateral regions. Minimal fat and lean mass imbalance between left and right sides.</p>
      </div>
      <div style="padding:6mm;background:linear-gradient(135deg, #FFD70015, #FFD70008);border-radius:10px;border-left:4px solid #FFD700;">
        <h4 style="font-size:13px;font-weight:700;color:#FFD700;margin-bottom:3mm;">Slight Imbalance</h4>
        <p style="margin:0;font-size:12px;line-height:1.5;color:var(--text-secondary);">Minor differences detected. May reflect training history or activity patterns. Monitor and consider targeted strengthening.</p>
      </div>
      <div style="padding:6mm;background:linear-gradient(135deg, #FF6B4B15, #FF6B4B08);border-radius:10px;border-left:4px solid #FF6B4B;">
        <h4 style="font-size:13px;font-weight:700;color:#FF6B4B;margin-bottom:3mm;">High Imbalance</h4>
        <p style="margin:0;font-size:12px;line-height:1.5;color:var(--text-secondary);">Significant asymmetry noted. Recommend injury assessment and balanced resistance training protocol.</p>
      </div>
    </div>
  </div>
  <footer class="dx-foot">
    <div class="dx-foot-q">Symmetry analysis (Part 2 of 2)<br>Balance and imbalance assessment<br><span class="dx-foot-gen">Injury prevention guidance</span></div>
    <div style="display:flex;gap:10px;align-items:center;">
      <div style="font-size:10px;color:var(--text-muted);font-weight:600;">6 / 9</div>
      <div class="dx-foot-logo">
        <img src="${_BASE}/sdrc-logo.png" alt="SDRC" />
        <img src="${_BASE}/labit-logo.png" alt="Labit" />
      </div>
    </div>
  </footer>
</div>

<!-- PAGE 7: BONE HEALTH -->
<div data-page="7">
  <header class="dx-head">
    <h1 class="dx-title">BONE HEALTH</h1>
    <p class="dx-sub">Skeletal Density Analysis <span class="dx-sub-date">• Fracture Risk Assessment</span></p>
  </header>
  <div class="dx-flow">
    <!-- Core BMD Metrics -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4mm;margin-bottom:6mm;">
      <div style="background:var(--light-2);padding:6mm;border-radius:12px;border-top:4px solid var(--optimal);">
        <div style="color:var(--text-muted);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.3px;margin-bottom:2mm;">Bone Mineral Density</div>
        <div style="font-size:28px;font-weight:900;color:var(--optimal);">${bone.total_bmd ? Number(bone.total_bmd).toFixed(3) : 'N/A'}</div>
        <div style="font-size:12px;color:var(--text-secondary);margin-top:2mm;">g/cm²</div>
      </div>
      <div style="background:var(--light-2);padding:6mm;border-radius:12px;border-top:4px solid var(--optimal);">
        <div style="color:var(--text-muted);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.3px;margin-bottom:2mm;">T-Score</div>
        <div style="font-size:28px;font-weight:900;color:var(--optimal);">${bone.total_t !== null && bone.total_t !== undefined ? Number(bone.total_t).toFixed(1) : 'N/A'}</div>
        <div style="font-size:12px;color:var(--text-secondary);margin-top:2mm;">vs Peak Adult</div>
      </div>
      <div style="background:var(--light-2);padding:6mm;border-radius:12px;border-top:4px solid var(--optimal);">
        <div style="color:var(--text-muted);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.3px;margin-bottom:2mm;">Z-Score</div>
        <div style="font-size:28px;font-weight:900;color:var(--optimal);">${bone.total_z !== null && bone.total_z !== undefined ? Number(bone.total_z).toFixed(1) : 'N/A'}</div>
        <div style="font-size:12px;color:var(--text-secondary);margin-top:2mm;">vs Age-Matched</div>
      </div>
    </div>

    <!-- 8 Skeletal Region Diagrams in 2x4 Grid -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4mm;margin-bottom:6mm;">
      <!-- Head -->
      <div style="text-align:center;">
        <div class="dx-img-frame" style="width:100%;height:80px;margin-bottom:3mm;background:var(--light-2);border-radius:8px;padding:2mm;">
          <img src="${scratchpadPath}/sample-017.png" alt="Head bone" style="height:100%;width:auto;" />
        </div>
        <div style="font-size:11px;font-weight:700;color:var(--text-primary);margin-bottom:2mm;">Head</div>
        <div style="font-size:14px;font-weight:900;color:var(--optimal);">N/A</div>
      </div>

      <!-- Spine -->
      <div style="text-align:center;">
        <div class="dx-img-frame" style="width:100%;height:80px;margin-bottom:3mm;background:var(--light-2);border-radius:8px;padding:2mm;">
          <img src="${scratchpadPath}/sample-018.png" alt="Spine bone" style="height:100%;width:auto;" />
        </div>
        <div style="font-size:11px;font-weight:700;color:var(--text-primary);margin-bottom:2mm;">Spine</div>
        <div style="font-size:14px;font-weight:900;color:var(--optimal);">${bone.spine_t !== null && bone.spine_t !== undefined ? Number(bone.spine_t).toFixed(1) : 'N/A'}</div>
      </div>

      <!-- Hip -->
      <div style="text-align:center;">
        <div class="dx-img-frame" style="width:100%;height:80px;margin-bottom:3mm;background:var(--light-2);border-radius:8px;padding:2mm;">
          <img src="${scratchpadPath}/sample-019.png" alt="Hip bone" style="height:100%;width:auto;" />
        </div>
        <div style="font-size:11px;font-weight:700;color:var(--text-primary);margin-bottom:2mm;">Hip</div>
        <div style="font-size:14px;font-weight:900;color:var(--optimal);">${bone.hip_t !== null && bone.hip_t !== undefined ? Number(bone.hip_t).toFixed(1) : 'N/A'}</div>
      </div>

      <!-- Forearm -->
      <div style="text-align:center;">
        <div class="dx-img-frame" style="width:100%;height:80px;margin-bottom:3mm;background:var(--light-2);border-radius:8px;padding:2mm;">
          <img src="${scratchpadPath}/sample-020.png" alt="Forearm bone" style="height:100%;width:auto;" />
        </div>
        <div style="font-size:11px;font-weight:700;color:var(--text-primary);margin-bottom:2mm;">Forearm</div>
        <div style="font-size:14px;font-weight:900;color:var(--optimal);">N/A</div>
      </div>

      <!-- Ribs -->
      <div style="text-align:center;">
        <div class="dx-img-frame" style="width:100%;height:80px;margin-bottom:3mm;background:var(--light-2);border-radius:8px;padding:2mm;">
          <img src="${scratchpadPath}/sample-021.png" alt="Ribs bone" style="height:100%;width:auto;" />
        </div>
        <div style="font-size:11px;font-weight:700;color:var(--text-primary);margin-bottom:2mm;">Ribs</div>
        <div style="font-size:14px;font-weight:900;color:var(--optimal);">N/A</div>
      </div>

      <!-- Pelvis -->
      <div style="text-align:center;">
        <div class="dx-img-frame" style="width:100%;height:80px;margin-bottom:3mm;background:var(--light-2);border-radius:8px;padding:2mm;">
          <img src="${scratchpadPath}/sample-022.png" alt="Pelvis bone" style="height:100%;width:auto;" />
        </div>
        <div style="font-size:11px;font-weight:700;color:var(--text-primary);margin-bottom:2mm;">Pelvis</div>
        <div style="font-size:14px;font-weight:900;color:var(--optimal);">N/A</div>
      </div>

      <!-- Left Arm -->
      <div style="text-align:center;">
        <div class="dx-img-frame" style="width:100%;height:80px;margin-bottom:3mm;background:var(--light-2);border-radius:8px;padding:2mm;">
          <img src="${scratchpadPath}/sample-023.png" alt="Left arm bone" style="height:100%;width:auto;" />
        </div>
        <div style="font-size:11px;font-weight:700;color:var(--text-primary);margin-bottom:2mm;">L. Arm</div>
        <div style="font-size:14px;font-weight:900;color:var(--optimal);">N/A</div>
      </div>

      <!-- Right Arm -->
      <div style="text-align:center;">
        <div class="dx-img-frame" style="width:100%;height:80px;margin-bottom:3mm;background:var(--light-2);border-radius:8px;padding:2mm;">
          <img src="${scratchpadPath}/sample-024.png" alt="Right arm bone" style="height:100%;width:auto;" />
        </div>
        <div style="font-size:11px;font-weight:700;color:var(--text-primary);margin-bottom:2mm;">R. Arm</div>
        <div style="font-size:14px;font-weight:900;color:var(--optimal);">N/A</div>
      </div>
    </div>

    <!-- Bone Density Comparison Scale -->
    <div style="margin-bottom:6mm;">
      <div class="dx-kicker">BONE DENSITY POSITION</div>
      <div class="dx-scale" style="margin-top:6mm;">
        <div class="dx-scale-marker" style="left:${Math.min(Math.max((bone.total_t + 4) / 8 * 100, 1), 99)}%"><span class="dx-scale-marker-val">${bone.total_t !== null && bone.total_t !== undefined ? Number(bone.total_t).toFixed(1) : 'N/A'}</span><span class="dx-scale-marker-tri">▼</span></div>
        <div class="dx-scale-track">
          <span style="background:#FF6B4B;"></span>
          <span style="background:#FFA500;"></span>
          <span style="background:#FFD700;"></span>
          <span style="background:#00D97B;"></span>
          <span style="background:#00D9FF;"></span>
          <span style="background:#00A8CC;"></span>
        </div>
        <div class="dx-scale-ends"><span style="color:#FF6B4B;">Osteoporosis</span><span style="color:#00A8CC;">Normal</span></div>
      </div>
    </div>

    <!-- 3-Column Info Box -->
    <div class="dx-cards3">
      <div class="dx-card3">
        <h4>What is T/Z Score?</h4>
        <p style="margin:0;font-size:12px;line-height:1.5;color:var(--text-secondary);">T-Score compares to peak bone mass (30-yo). Z-Score compares to age/gender matched peers. Both measure standard deviations from reference.</p>
      </div>
      <div class="dx-card3">
        <h4>When Concerned?</h4>
        <p style="margin:0;font-size:12px;line-height:1.5;color:var(--text-secondary);">T-Score below −1.0 indicates osteopenia. Below −2.5 indicates osteoporosis. Fracture risk increases significantly at these thresholds.</p>
      </div>
      <div class="dx-card3">
        <h4>How to Improve?</h4>
        <p style="margin:0;font-size:12px;line-height:1.5;color:var(--text-secondary);">Resistance training, adequate calcium & vitamin D, reduce alcohol, avoid smoking. Consult physician if T-Score below −1.</p>
      </div>
    </div>
  </div>
  <footer class="dx-foot">
    <div class="dx-foot-q">Bone mineral density analysis<br>WHO diagnostic criteria applied<br><span class="dx-foot-gen">Clinical reference standards</span></div>
    <div style="display:flex;gap:10px;align-items:center;">
      <div style="font-size:10px;color:var(--text-muted);font-weight:600;">7 / 9</div>
      <div class="dx-foot-logo">
        <img src="${_BASE}/sdrc-logo.png" alt="SDRC" />
        <img src="${_BASE}/labit-logo.png" alt="Labit" />
      </div>
    </div>
  </footer>
</div>

<!-- PAGE 8: ANDROID-GYNOID RATIO -->
<div data-page="8">
  <header class="dx-head">
    <h1 class="dx-title">ANDROID-GYNOID RATIO</h1>
    <p class="dx-sub">Body Shape & Fat Distribution <span class="dx-sub-date">• Shape Classification</span></p>
  </header>
  <div class="dx-flow">
    <!-- A/G Ratio Card -->
    <div style="background:linear-gradient(135deg, var(--primary), var(--primary-dark));color:#fff;padding:8mm;border-radius:12px;margin-bottom:6mm;">
      <div style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;opacity:0.85;margin-bottom:3mm;">Android-Gynoid Ratio</div>
      <div style="font-size:48px;font-weight:900;margin-bottom:2mm;">${calc.ag_ratio ? Number(calc.ag_ratio).toFixed(2) : 'N/A'}</div>
      <div style="font-size:13px;line-height:1.6;opacity:0.9;">A/G ratio indicates central vs. peripheral fat distribution. Ratios above 1.0 suggest android (apple-shaped) distribution; below 1.0 suggest gynoid (pear-shaped) distribution.</div>
    </div>

    <!-- Body Shape Classification -->
    <div style="margin-bottom:6mm;">
      <div class="dx-kicker">BODY SHAPE VARIANTS</div>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:3mm;margin-top:4mm;">
        <div style="text-align:center;padding:6mm;background:var(--light-2);border-radius:10px;border-top:3px solid var(--optimal);">
          <div style="font-size:28px;margin-bottom:2mm;">🍐</div>
          <div style="font-size:12px;font-weight:700;color:var(--text-primary);">Pear</div>
          <div style="font-size:11px;color:var(--text-secondary);margin-top:1mm;">Lower body fat concentration</div>
        </div>
        <div style="text-align:center;padding:6mm;background:var(--light-2);border-radius:10px;border-top:3px solid var(--optimal);">
          <div style="font-size:28px;margin-bottom:2mm;">⌛</div>
          <div style="font-size:12px;font-weight:700;color:var(--text-primary);">Hourglass</div>
          <div style="font-size:11px;color:var(--text-secondary);margin-top:1mm;">Balanced distribution</div>
        </div>
        <div style="text-align:center;padding:6mm;background:var(--light-2);border-radius:10px;border-top:3px solid var(--accent);">
          <div style="font-size:28px;margin-bottom:2mm;">△</div>
          <div style="font-size:12px;font-weight:700;color:var(--text-primary);">Triangle</div>
          <div style="font-size:11px;color:var(--text-secondary);margin-top:1mm;">Upper body emphasis</div>
        </div>
        <div style="text-align:center;padding:6mm;background:var(--light-2);border-radius:10px;border-top:3px solid var(--elevated);">
          <div style="font-size:28px;margin-bottom:2mm;">▭</div>
          <div style="font-size:12px;font-weight:700;color:var(--text-primary);">Rectangle</div>
          <div style="font-size:11px;color:var(--text-secondary);margin-top:1mm;">Uniform fat distribution</div>
        </div>
        <div style="text-align:center;padding:6mm;background:var(--light-2);border-radius:10px;border-top:3px solid var(--elevated);">
          <div style="font-size:28px;margin-bottom:2mm;">⭕</div>
          <div style="font-size:12px;font-weight:700;color:var(--text-primary);">Round</div>
          <div style="font-size:11px;color:var(--text-secondary);margin-top:1mm;">Central fat concentration</div>
        </div>
      </div>
    </div>

    <!-- Body Shape Explanation -->
    <div class="dx-dark">
      <h3>Your Body Shape Profile</h3>
      <p style="color:#E8EAEF;margin-top:2mm;line-height:1.6;">Your A/G ratio of ${calc.ag_ratio ? Number(calc.ag_ratio).toFixed(2) : 'N/A'} indicates a ${calc.ag_ratio > 1 ? 'android (apple-shaped)' : 'gynoid (pear-shaped)'} body composition pattern. This reflects your unique genetic predisposition and lifestyle factors. Understanding your body shape helps tailor nutrition and training strategies.</p>
    </div>
  </div>
  <footer class="dx-foot">
    <div class="dx-foot-q">Android-gynoid ratio analysis<br>Body shape classification<br><span class="dx-foot-gen">Fat distribution pattern reference</span></div>
    <div style="display:flex;gap:10px;align-items:center;">
      <div style="font-size:10px;color:var(--text-muted);font-weight:600;">8 / 9</div>
      <div class="dx-foot-logo">
        <img src="${_BASE}/sdrc-logo.png" alt="SDRC" />
        <img src="${_BASE}/labit-logo.png" alt="Labit" />
      </div>
    </div>
  </footer>
</div>

<!-- PAGE 9: REGIONAL LEAN TISSUE TRENDS -->
<div data-page="9">
  <header class="dx-head">
    <h1 class="dx-title">LEAN TISSUE TRENDS</h1>
    <p class="dx-sub">Regional Muscle Mass Changes <span class="dx-sub-date">• Progress Tracking</span></p>
  </header>
  <div class="dx-flow">
    <!-- Arms Section -->
    <div style="display:grid;grid-template-columns:0.6fr 1.4fr;gap:5mm;margin-bottom:8mm;align-items:start;">
      <div class="dx-img-frame" style="background:var(--light-2);border-radius:10px;padding:4mm;height:140px;">
        <img src="${scratchpadPath}/sample-007.png" alt="Arms lean mass" style="height:100%;width:auto;" />
      </div>
      <div>
        <div style="font-size:14px;font-weight:700;color:var(--text-primary);margin-bottom:3mm;">ARMS: Lean Mass Trends</div>
        <div style="height:70px;background:var(--light-2);border-radius:8px;margin-bottom:4mm;display:flex;align-items:flex-end;padding:5mm;gap:3mm;">
          <div style="flex:1;background:var(--optimal);height:35%;border-radius:3px;"></div>
          <div style="flex:1;background:var(--optimal);height:50%;border-radius:3px;"></div>
          <div style="flex:1;background:var(--optimal);height:68%;border-radius:3px;"></div>
          <div style="flex:1;background:var(--optimal);height:82%;border-radius:3px;"></div>
          <div style="flex:1;background:var(--optimal);height:100%;border-radius:3px;"></div>
        </div>
        <table style="width:100%;font-size:11px;border-collapse:collapse;">
          <tr style="border-bottom:1px solid var(--light-3);">
            <th style="text-align:left;padding:6px 0;font-weight:700;">Period</th>
            <th style="text-align:right;padding:6px 0;font-weight:700;">Lean Mass</th>
            <th style="text-align:right;padding:6px 0;font-weight:700;">Δ vs Baseline</th>
          </tr>
          <tr style="border-bottom:1px solid var(--light-3);">
            <td style="text-align:left;padding:6px 0;">Baseline</td>
            <td style="text-align:right;">${kg(arms.lean_g)}</td>
            <td style="text-align:right;">—</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Legs Section -->
    <div style="display:grid;grid-template-columns:0.6fr 1.4fr;gap:5mm;margin-bottom:8mm;align-items:start;">
      <div class="dx-img-frame" style="background:var(--light-2);border-radius:10px;padding:4mm;height:140px;">
        <img src="${scratchpadPath}/sample-010.png" alt="Legs lean mass" style="height:100%;width:auto;" />
      </div>
      <div>
        <div style="font-size:14px;font-weight:700;color:var(--text-primary);margin-bottom:3mm;">LEGS: Lean Mass Trends</div>
        <div style="height:70px;background:var(--light-2);border-radius:8px;margin-bottom:4mm;display:flex;align-items:flex-end;padding:5mm;gap:3mm;">
          <div style="flex:1;background:var(--optimal);height:45%;border-radius:3px;"></div>
          <div style="flex:1;background:var(--optimal);height:58%;border-radius:3px;"></div>
          <div style="flex:1;background:var(--optimal);height:72%;border-radius:3px;"></div>
          <div style="flex:1;background:var(--optimal);height:88%;border-radius:3px;"></div>
          <div style="flex:1;background:var(--optimal);height:100%;border-radius:3px;"></div>
        </div>
        <table style="width:100%;font-size:11px;border-collapse:collapse;">
          <tr style="border-bottom:1px solid var(--light-3);">
            <th style="text-align:left;padding:6px 0;font-weight:700;">Period</th>
            <th style="text-align:right;padding:6px 0;font-weight:700;">Lean Mass</th>
            <th style="text-align:right;padding:6px 0;font-weight:700;">Δ vs Baseline</th>
          </tr>
          <tr style="border-bottom:1px solid var(--light-3);">
            <td style="text-align:left;padding:6px 0;">Baseline</td>
            <td style="text-align:right;">${kg(legs.lean_g)}</td>
            <td style="text-align:right;">—</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Trunk Section -->
    <div style="display:grid;grid-template-columns:0.6fr 1.4fr;gap:5mm;align-items:start;">
      <div class="dx-img-frame" style="background:var(--light-2);border-radius:10px;padding:4mm;height:140px;">
        <img src="${scratchpadPath}/sample-002.png" alt="Trunk lean mass" style="height:100%;width:auto;" />
      </div>
      <div>
        <div style="font-size:14px;font-weight:700;color:var(--text-primary);margin-bottom:3mm;">TRUNK: Lean Mass Trends</div>
        <div style="height:70px;background:var(--light-2);border-radius:8px;margin-bottom:4mm;display:flex;align-items:flex-end;padding:5mm;gap:3mm;">
          <div style="flex:1;background:var(--optimal);height:42%;border-radius:3px;"></div>
          <div style="flex:1;background:var(--optimal);height:54%;border-radius:3px;"></div>
          <div style="flex:1;background:var(--optimal);height:68%;border-radius:3px;"></div>
          <div style="flex:1;background:var(--optimal);height:84%;border-radius:3px;"></div>
          <div style="flex:1;background:var(--optimal);height:100%;border-radius:3px;"></div>
        </div>
        <table style="width:100%;font-size:11px;border-collapse:collapse;">
          <tr style="border-bottom:1px solid var(--light-3);">
            <th style="text-align:left;padding:6px 0;font-weight:700;">Period</th>
            <th style="text-align:right;padding:6px 0;font-weight:700;">Lean Mass</th>
            <th style="text-align:right;padding:6px 0;font-weight:700;">Δ vs Baseline</th>
          </tr>
          <tr style="border-bottom:1px solid var(--light-3);">
            <td style="text-align:left;padding:6px 0;">Baseline</td>
            <td style="text-align:right;">${kg(trunk.lean_g)}</td>
            <td style="text-align:right;">—</td>
          </tr>
        </table>
      </div>
    </div>
  </div>
  <footer class="dx-foot">
    <div class="dx-foot-q">Regional lean mass progression tracking<br>Muscle development trends<br><span class="dx-foot-gen">Final page: comprehensive analysis complete</span></div>
    <div style="display:flex;gap:10px;align-items:center;">
      <div style="font-size:10px;color:var(--text-muted);font-weight:600;">9 / 9</div>
      <div class="dx-foot-logo">
        <img src="${_BASE}/sdrc-logo.png" alt="SDRC" />
        <img src="${_BASE}/labit-logo.png" alt="Labit" />
      </div>
    </div>
  </footer>
</div>

</body>
</html>`;
}
