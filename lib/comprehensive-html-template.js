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

  const clinicalSummary = summaryItems(comp, calc, bone, pt.gender)
  const fatLossData = fatLossTargets(comp, calc, pt.gender)
  const rmr = calc.rmr_kcal ? Math.round(calc.rmr_kcal) : null

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

<!-- PAGE 1: AT A GLANCE -->
<div data-page="1">
  <header class="dx-head">
    <h1 class="dx-title">BODY COMPOSITION</h1>
    <p class="dx-sub">Your DEXA Analysis <span class="dx-sub-date">• ${tbFmtDate(pt.scan_date)}</span></p>
  </header>
  <div class="dx-flow">
    <article class="dx-patient">
      <div class="dx-patient-info">
        <div class="dx-pi"><span class="k">Patient</span> <span class="v">${esc(pt.name || '')}</span></div>
        <div class="dx-pi"><span class="k">Age</span> <span class="v">${pt.age || 'N/A'} years</span></div>
        <div class="dx-pi"><span class="k">Height</span> <span class="v">${pt.height_cm || 'N/A'} cm</span></div>
        <div class="dx-pi"><span class="k">Gender</span> <span class="v">${pt.gender || 'N/A'}</span></div>
      </div>
      <div class="dx-patient-bf"><span class="lbl">Body Fat</span><span class="big">${pct(comp.fat_pct)}</span></div>
    </article>

    <div class="dx-2" style="grid-template-columns:0.5fr 1.5fr;gap:6mm;">
      <div class="dx-img-frame">
        ${img.fat_lean_url ? `<img src="${esc(img.fat_lean_url)}" alt="Body composition">` : '<div style="color:var(--text-muted);font-size:12px;">Imagery</div>'}
      </div>
      <div style="display:flex;flex-direction:column;gap:4mm;">
        <div>
          <div class="dx-kicker">YOUR <span class="lite">COMPOSITION BREAKDOWN</span></div>
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:4mm;margin-top:4mm;">
            <div style="padding:5mm;background:linear-gradient(135deg, #FB923C15, #FB923C08);border-radius:10px;border-top:3px solid var(--elevated);">
              <div style="font-size:11px;color:var(--text-muted);font-weight:600;margin-bottom:2mm;">Fat Mass</div>
              <div style="font-size:28px;font-weight:900;color:var(--elevated);">${kg(comp.fat_g)}</div>
              <div style="font-size:11px;color:var(--text-secondary);margin-top:1mm;">${pct(comp.fat_pct)}</div>
            </div>
            <div style="padding:5mm;background:linear-gradient(135deg, #00D9FF15, #00D9FF08);border-radius:10px;border-top:3px solid var(--optimal);">
              <div style="font-size:11px;color:var(--text-muted);font-weight:600;margin-bottom:2mm;">Lean Mass</div>
              <div style="font-size:28px;font-weight:900;color:var(--optimal);">${kg(comp.lean_g)}</div>
              <div style="font-size:11px;color:var(--text-secondary);margin-top:1mm;">${pct(comp.lean_pct)}</div>
            </div>
            <div style="padding:5mm;background:linear-gradient(135deg, #00D9FF15, #00D9FF08);border-radius:10px;border-top:3px solid var(--optimal);">
              <div style="font-size:11px;color:var(--text-muted);font-weight:600;margin-bottom:2mm;">Bone Mineral</div>
              <div style="font-size:28px;font-weight:900;color:var(--optimal);">${kg2(comp.bmc_g)}</div>
              <div style="font-size:11px;color:var(--text-secondary);margin-top:1mm;"></div>
            </div>
            <div style="padding:5mm;background:var(--light-2);border-radius:10px;border-top:3px solid var(--text-secondary);">
              <div style="font-size:11px;color:var(--text-muted);font-weight:600;margin-bottom:2mm;">Total Weight</div>
              <div style="font-size:28px;font-weight:900;color:var(--text-primary);">${kg(comp.total_g)}</div>
              <div style="font-size:11px;color:var(--text-secondary);margin-top:1mm;"></div>
            </div>
          </div>
        </div>
        <div style="padding:5mm;background:var(--light-2);border-radius:10px;border-left:4px solid var(--optimal);">
          <p class="dx-copy" style="margin:0;font-size:12px;">DEXA directly measures all three components—no algorithms. This is the clinical gold standard.</p>
        </div>
      </div>
    </div>
    <div class="dx-dark">
      <h3>Why DEXA?</h3>
      <p style="color:#E8EAEF;margin-top:2mm;">DEXA directly measures bone, lean, and fat mass—no algorithms or assumptions. It's the gold standard in body composition analysis.</p>
    </div>
  </div>
  <footer class="dx-foot">
    <div class="dx-foot-q">Diagnostic Body Composition Report<br><a href="https://www.sdrc.in" style="color:inherit;text-decoration:none;">SDRC</a> • <a href="https://labit.online" style="color:inherit;text-decoration:none;">Labit</a><br><span class="dx-foot-gen">High-precision DEXA analysis</span></div>
    <div style="display:flex;gap:10px;align-items:center;">
      <div style="font-size:10px;color:var(--text-muted);font-weight:600;">1 / 7</div>
      <div class="dx-foot-logo">
        <img src="${_BASE}/sdrc-logo.png" alt="SDRC" />
        <img src="${_BASE}/labit-logo.png" alt="Labit" />
      </div>
    </div>
  </footer>
</div>

<!-- PAGE 2: BODY FAT SCALE -->
<div data-page="2">
  <header class="dx-head">
    <h1 class="dx-title">BODY COMPOSITION</h1>
    <p class="dx-sub">How You Compare <span class="dx-sub-date">• Percentile Analysis</span></p>
  </header>
  <div class="dx-flow">
    <div style="margin-bottom:6mm;">
      <div class="dx-kicker">YOUR POSITION ON THE SCALE</div>
      <div class="dx-scale" style="margin-top:6mm;">
        <div class="dx-scale-marker" style="left:${Math.min(Math.max(comp.fat_pct / 43 * 100, 1), 99)}%"><span class="dx-scale-marker-val">${pct(comp.fat_pct)}</span><span class="dx-scale-marker-tri">▼</span></div>
        <div class="dx-scale-track"><span style="background:linear-gradient(90deg, #00F5A0, #00E68D)"></span><span style="background:linear-gradient(90deg, #1FD68F, #00D97B)"></span><span style="background:linear-gradient(90deg, #3FBE70, #00C566)"></span><span style="background:linear-gradient(90deg, #C9A06E, #E6956D)"></span><span style="background:linear-gradient(90deg, #E67A4C, #FF6B4B)"></span><span style="background:linear-gradient(90deg, #FF006E, #CC0056)"></span></div>
        <div class="dx-scale-ends"><span style="color:var(--success);">Lean</span><span style="color:var(--danger);">High</span></div>
      </div>
    </div>

    <div class="dx-2" style="grid-template-columns:0.5fr 1.5fr;gap:6mm;align-items:center;">
      <div class="dx-img-frame">
        ${img.composite_url ? `<img src="${esc(img.composite_url)}" alt="Body scan">` : '<div style="color:var(--text-muted);font-size:12px;">Scan imagery</div>'}
      </div>
      <div>
        <h3 style="font-size:20px;margin-bottom:4mm;">Your Percentile Rank</h3>
        ${comp.centile ? (() => {
          const c = parseInt(comp.centile);
          let color, gradient, status, interpretation, guidance;
          // NOTE: Higher percentile = higher body fat = WORSE (inverted from typical thinking)
          if (c <= 25) { color = 'var(--optimal)'; gradient = 'linear-gradient(135deg, var(--optimal), var(--optimal-dark))'; status = 'Excellent'; interpretation = 'Lower body fat than 75% of peers'; guidance = '✓ Outstanding composition. Maintain your training & nutrition protocol.'; }
          else if (c <= 50) { color = 'var(--optimal)'; gradient = 'linear-gradient(135deg, var(--optimal), var(--optimal-dark))'; status = 'Good'; interpretation = 'Lower body fat than 50% of peers'; guidance = '✓ Strong composition. Continue current routine or optimize further.'; }
          else if (c <= 75) { color = 'var(--acceptable)'; gradient = 'linear-gradient(135deg, var(--acceptable), var(--acceptable-dark))'; status = 'Acceptable'; interpretation = 'Higher body fat than 25% of peers'; guidance = '⚡ Room for improvement. Add 3–4×/week resistance training and increase protein intake.'; }
          else { color = 'var(--elevated)'; gradient = 'linear-gradient(135deg, var(--elevated), var(--elevated-dark))'; status = 'Elevated'; interpretation = 'Higher body fat than 75%+ of peers'; guidance = '⬆ Priority area. Focus on lean mass gain and fat loss over 6–12 months to improve health markers.'; }
          return `
          <div style="background:${gradient};padding:8mm;border-radius:12px;color:#fff;margin-bottom:5mm;">
            <div style="font-size:13px;opacity:0.85;margin-bottom:3mm;">Age-Matched Percentile</div>
            <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2mm;">
              <div style="font-size:48px;font-weight:900;line-height:1;">${c}<span style="font-size:24px;opacity:0.8;">th</span></div>
              <div style="font-size:14px;font-weight:600;opacity:0.9;">${status}</div>
            </div>
            <div style="font-size:12px;opacity:0.85;line-height:1.4;">${interpretation}</div>
          </div>
          <div style="padding:5mm;background:var(--light-2);border-radius:8px;border-left:4px solid ${color};margin-bottom:4mm;">
            <p class="dx-copy" style="margin:0;font-size:12px;font-weight:500;">${guidance}</p>
          </div>
          `;
        })() : '<div style="padding:5mm;background:var(--light-2);border-radius:8px;color:var(--text-secondary);">Percentile data unavailable</div>'}
      </div>
    </div>
  </div>
  <footer class="dx-foot">
    <div class="dx-foot-q">Based on DEXA scan data<br>Age-matched statistical analysis<br><span class="dx-foot-gen">Professional diagnostic reference</span></div>
    <div style="display:flex;gap:10px;align-items:center;">
      <div style="font-size:10px;color:var(--text-muted);font-weight:600;">2 / 7</div>
      <div class="dx-foot-logo">
        <img src="${_BASE}/sdrc-logo.png" alt="SDRC" />
        <img src="${_BASE}/labit-logo.png" alt="Labit" />
      </div>
    </div>
  </footer>
</div>

<!-- PAGE 3: REGIONAL COMPOSITION -->
<div data-page="3">
  <header class="dx-head">
    <h1 class="dx-title">BODY COMPOSITION</h1>
    <p class="dx-sub">Regional Breakdown <span class="dx-sub-date">• Where Your Mass Lives</span></p>
  </header>
  <div class="dx-flow">
    <div class="dx-2" style="grid-template-columns:0.5fr 1.5fr;gap:6mm;margin-bottom:4mm;">
      <div class="dx-img-frame">
        ${img.fat_lean_url || img.fat_gradient_url ? `<img src="${esc(img.fat_lean_url || img.fat_gradient_url)}" alt="Regional composition">` : '<div style="color:var(--text-muted);font-size:12px;">Regional analysis</div>'}
      </div>
      <div>
        <div class="dx-kicker">FAT DISTRIBUTION <span class="lite">PATTERN</span></div>

        <!-- A/G Ratio Value & Status -->
        ${comp.ag_ratio ? (() => {
          const ag = parseFloat(comp.ag_ratio);
          let status, color, bgColor, explanation;
          if (ag < 0.85) { status = 'Gynoid-Dominant'; color = 'var(--optimal)'; bgColor = 'linear-gradient(135deg, #00D9FF22, #00D9FF11)'; explanation = 'Fat stored more in hips/thighs (lower metabolic risk)'; }
          else if (ag <= 1.0) { status = 'Balanced'; color = 'var(--optimal)'; bgColor = 'linear-gradient(135deg, #00D9FF22, #00D9FF11)'; explanation = 'Even fat distribution (optimal pattern)'; }
          else if (ag <= 1.2) { status = 'Acceptable'; color = 'var(--acceptable)'; bgColor = 'linear-gradient(135deg, #A78BFA22, #A78BFA11)'; explanation = 'Slight abdominal preference (monitor)'; }
          else { status = 'Android-Dominant'; color = 'var(--elevated)'; bgColor = 'linear-gradient(135deg, #FB923C22, #FB923C11)'; explanation = 'More abdominal fat (higher metabolic risk)'; }
          return `
          <div style="background:${bgColor};padding:6mm;border-radius:10px;border-left:4px solid ${color};margin:4mm 0;">
            <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2mm;">
              <div style="font-size:32px;font-weight:900;color:${color};">${Number(ag).toFixed(2)}</div>
              <div style="font-size:12px;font-weight:600;color:${color};">${status}</div>
            </div>
            <div style="font-size:11px;color:var(--text-secondary);line-height:1.5;">${explanation}</div>
          </div>
          `;
        })() : '<div style="padding:5mm;background:var(--light-2);border-radius:8px;color:var(--text-secondary);">No A/G ratio data available</div>'}

        <!-- Reference Scale -->
        <div style="margin-top:4mm;">
          <div style="font-size:10px;color:var(--text-muted);font-weight:600;margin-bottom:2mm;letter-spacing:0.3px;text-transform:uppercase;">Reference</div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:2mm;">
            <div style="padding:2mm 1mm;text-align:center;background:#00D9FF11;border-radius:4px;border-top:2px solid var(--optimal);">
              <div style="font-size:9px;color:var(--text-secondary);margin-bottom:1mm;">&lt;0.85</div>
              <div style="font-size:11px;font-weight:700;color:var(--optimal);">Gynoid</div>
            </div>
            <div style="padding:2mm 1mm;text-align:center;background:#00D9FF11;border-radius:4px;border-top:2px solid var(--optimal);">
              <div style="font-size:9px;color:var(--text-secondary);margin-bottom:1mm;">0.85–1</div>
              <div style="font-size:11px;font-weight:700;color:var(--optimal);">Balanced</div>
            </div>
            <div style="padding:2mm 1mm;text-align:center;background:#A78BFA11;border-radius:4px;border-top:2px solid var(--acceptable);">
              <div style="font-size:9px;color:var(--text-secondary);margin-bottom:1mm;">1–1.2</div>
              <div style="font-size:11px;font-weight:700;color:var(--acceptable);">Okay</div>
            </div>
            <div style="padding:2mm 1mm;text-align:center;background:#FB923C11;border-radius:4px;border-top:2px solid var(--elevated);">
              <div style="font-size:9px;color:var(--text-secondary);margin-bottom:1mm;">&gt;1.2</div>
              <div style="font-size:11px;font-weight:700;color:var(--elevated);">Android</div>
            </div>
          </div>
        </div>

        <div style="padding:5mm;background:var(--light-2);border-radius:8px;margin-top:4mm;">
          <p class="dx-copy" style="margin:0;font-size:12px;">A/G ratio indicates where fat is stored. Gynoid (hips/thighs) is metabolically favorable; Android (abdomen) requires more attention to cardiovascular and metabolic health.</p>
        </div>
      </div>
    </div>

    <div style="margin-top:4mm;">
      <div class="dx-kicker" style="margin-bottom:4mm;">TISSUE MASS <span class="lite">BY REGION</span></div>
      <div style="overflow-x:auto;">
        <div style="min-width:100%;">
          <div class="dx-reg-row head"><div class="rh"></div><div>Trunk</div><div>Android</div><div>Arms</div><div>Gynoid</div><div>Legs</div></div>
          <div class="dx-reg-row plain"><div class="rh">Fat %</div><div>${pct(trunk.fat_pct)}</div><div>${pct(android.fat_pct)}</div><div>${pct(arms.fat_pct)}</div><div>${pct(gynoid.fat_pct)}</div><div>${pct(legs.fat_pct)}</div></div>
          <div class="dx-reg-spacer"></div>
          <div class="dx-reg-row lean"><div class="rh">Lean</div><div>${trunk.lean_g ? kg(trunk.lean_g) : '—'}</div><div>${android.lean_g ? kg(android.lean_g) : '—'}</div><div>${arms.lean_g ? kg(arms.lean_g) : '—'}</div><div>${gynoid.lean_g ? kg(gynoid.lean_g) : '—'}</div><div>${legs.lean_g ? kg(legs.lean_g) : '—'}</div></div>
          <div class="dx-reg-spacer"></div>
          <div class="dx-reg-row fat"><div class="rh">Fat</div><div>${trunk.fat_g ? kg(trunk.fat_g) : '—'}</div><div>${android.fat_g ? kg(android.fat_g) : '—'}</div><div>${arms.fat_g ? kg(arms.fat_g) : '—'}</div><div>${gynoid.fat_g ? kg(gynoid.fat_g) : '—'}</div><div>${legs.fat_g ? kg(legs.fat_g) : '—'}</div></div>
          <div class="dx-reg-spacer"></div>
          <div class="dx-reg-row boner"><div class="rh">Bone</div><div>${trunk.bone_g ? kg2(trunk.bone_g) : '—'}</div><div>${android.bone_g ? kg2(android.bone_g) : '—'}</div><div>${arms.bone_g ? kg2(arms.bone_g) : '—'}</div><div>${gynoid.bone_g ? kg2(gynoid.bone_g) : '—'}</div><div>${legs.bone_g ? kg2(legs.bone_g) : '—'}</div></div>
        </div>
      </div>
    </div>

    <div class="dx-cards3" style="margin-top:4mm;gap:3mm;">
      <div class="dx-card3" style="padding:4mm 5mm;"><h4 style="font-size:13px;margin-bottom:1mm;">💪 Balance</h4><div style="font-size:11px;line-height:1.4;">Unbalanced regions reduce performance and increase injury risk.</div></div>
      <div class="dx-card3" style="padding:4mm 5mm;"><h4 style="font-size:13px;margin-bottom:1mm;">🔍 Insight</h4><div style="font-size:11px;line-height:1.4;">Each region reflects your training history and metabolism.</div></div>
      <div class="dx-card3 fill-accent" style="padding:4mm 5mm;"><h4 style="font-size:13px;margin-bottom:1mm;color:#fff;">✓ Action</h4><ul style="padding-left:12px;margin:0;font-size:11px;line-height:1.4;"><li>Target weak regions</li><li>Progressive overload</li></ul></div>
    </div>
  </div>
  <footer class="dx-foot">
    <div class="dx-foot-q">Segmental body composition analysis<br>DEXA scan reference data<br><span class="dx-foot-gen">Professional diagnostic standard</span></div>
    <div style="display:flex;gap:10px;align-items:center;">
      <div style="font-size:10px;color:var(--text-muted);font-weight:600;">3 / 7</div>
      <div class="dx-foot-logo">
        <img src="${_BASE}/sdrc-logo.png" alt="SDRC" />
        <img src="${_BASE}/labit-logo.png" alt="Labit" />
      </div>
    </div>
  </footer>
</div>

<!-- PAGE 4: BONE HEALTH -->
<div data-page="4">
  <header class="dx-head">
    <h1 class="dx-title">BONE HEALTH</h1>
    <p class="dx-sub">Skeletal Density Analysis <span class="dx-sub-date">• Fracture Risk Profile</span></p>
  </header>
  <div class="dx-flow">
    <div style="display:grid;grid-template-columns:0.6fr 1.4fr;gap:5mm;flex:1;min-height:0;">
      <!-- Bone Image (tall column) -->
      <div class="dx-img-frame">
        ${img.bone_roi_url ? `<img src="${esc(img.bone_roi_url)}" alt="Bone density scan">` : img.bone_url ? `<img src="${esc(img.bone_url)}" alt="Bone scan">` : '<div style="color:var(--text-muted);font-size:12px;text-align:center;">Bone imagery</div>'}
      </div>

      <!-- Metrics & Info (right column) -->
      <div style="display:flex;flex-direction:column;gap:4mm;overflow-y:auto;">
        <div style="display:grid;grid-template-columns:1fr;gap:3mm;">
          <div style="background:var(--light-2);padding:6mm;border-radius:12px;border-top:4px solid var(--optimal);">
            <div style="color:var(--text-muted);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.3px;margin-bottom:2mm;">Bone Mineral Density</div>
            <div style="font-size:32px;font-weight:900;color:var(--optimal);">${bone.total_bmd ? Number(bone.total_bmd).toFixed(3) : 'N/A'}</div>
            <div style="font-size:12px;color:var(--text-secondary);margin-top:2mm;">g/cm²</div>
          </div>

          ${bone.total_t !== null && bone.total_t !== undefined ? (() => {
            const t = parseFloat(bone.total_t);
            let color, bgColor;
            if (t > -1) { color = 'var(--optimal)'; bgColor = 'var(--light-2)'; }
            else if (t > -2.5) { color = 'var(--acceptable)'; bgColor = 'var(--light-2)'; }
            else { color = 'var(--elevated)'; bgColor = 'var(--light-2)'; }
            return `<div style="background:${bgColor};padding:6mm;border-radius:12px;border-top:4px solid ${color};">
              <div style="color:var(--text-muted);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.3px;margin-bottom:2mm;">T-Score</div>
              <div style="font-size:32px;font-weight:900;color:${color};">${Number(t).toFixed(1)}</div>
              <div style="font-size:12px;color:var(--text-secondary);margin-top:2mm;">vs Peak Adult</div>
            </div>`;
          })() : '<div style="background:var(--light-2);padding:6mm;border-radius:12px;border-top:4px solid #ccc;color:var(--text-secondary);font-size:12px;">No T-Score data</div>'}

          ${bone.total_z !== null && bone.total_z !== undefined ? (() => {
            const z = parseFloat(bone.total_z);
            let color, bgColor;
            if (Math.abs(z) <= 1) { color = 'var(--optimal)'; bgColor = 'var(--light-2)'; }
            else if (Math.abs(z) <= 2) { color = 'var(--acceptable)'; bgColor = 'var(--light-2)'; }
            else { color = 'var(--elevated)'; bgColor = 'var(--light-2)'; }
            return `<div style="background:${bgColor};padding:6mm;border-radius:12px;border-top:4px solid ${color};">
              <div style="color:var(--text-muted);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.3px;margin-bottom:2mm;">Z-Score</div>
              <div style="font-size:32px;font-weight:900;color:${color};">${Number(z).toFixed(1)}</div>
              <div style="font-size:12px;color:var(--text-secondary);margin-top:2mm;">vs Age-Matched</div>
            </div>`;
          })() : '<div style="background:var(--light-2);padding:6mm;border-radius:12px;border-top:4px solid #ccc;color:var(--text-secondary);font-size:12px;">No Z-Score data</div>'}
        </div>

        ${bone.classification ? `<div class="dx-dark"><h3>${boneGuide(bone.classification).title}</h3><ul style="padding-left:16px;color:#E8EAEF;margin:2mm 0 0 0;font-size:12px;line-height:1.7;font-weight:500;">${boneGuide(bone.classification).items.map(item => `<li>${item}</li>`).join('')}</ul></div>` : ''}
      </div>
    </div>
  </div>
  <footer class="dx-foot">
    <div class="dx-foot-q">Lumbar spine, femoral neck, total hip analysis<br>Clinical reference standards applied<br><span class="dx-foot-gen">WHO diagnostic criteria</span></div>
    <div style="display:flex;gap:10px;align-items:center;">
      <div style="font-size:10px;color:var(--text-muted);font-weight:600;">4 / 7</div>
      <div class="dx-foot-logo">
        <img src="${_BASE}/sdrc-logo.png" alt="SDRC" />
        <img src="${_BASE}/labit-logo.png" alt="Labit" />
      </div>
    </div>
  </footer>
</div>

<!-- PAGE 5: CLINICAL INSIGHTS -->
<div data-page="5">
  <header class="dx-head">
    <h1 class="dx-title">INSIGHTS</h1>
    <p class="dx-sub">Key Findings & Status <span class="dx-sub-date">• Actionable Analysis</span></p>
  </header>
  <div class="dx-flow">
    <div class="dx-3" style="margin-bottom:6mm;">
      ${clinicalSummary.slice(0, 3).map(item => `<div style="border-left:6px solid ${item.status === 'good' ? 'var(--success)' : item.status === 'warn' ? 'var(--warning)' : 'var(--accent)'};padding:6mm;background:var(--light-2);border-radius:10px;"><h4 style="margin:0 0 2mm 0;font-size:14px;font-weight:700;color:${item.status === 'good' ? 'var(--success)' : item.status === 'warn' ? 'var(--warning)' : 'var(--accent)'};">${item.title}</h4><p style="margin:0;font-size:12px;line-height:1.6;color:var(--text-secondary);">${item.body}</p></div>`).join('')}
    </div>

    <div class="dx-dark">
      <h3>Your Action Plan</h3>
      <ul style="padding-left:16px;color:#E8EAEF;margin:3mm 0 0 0;font-size:13px;line-height:2;font-weight:500;">
        <li><strong>Strength:</strong> Resistance training 3–4× per week targeting weak regions</li>
        <li><strong>Nutrition:</strong> ${pt.gender === 'Female' ? '1.6–2.2g protein per kg lean mass, focus on calcium' : '1.6–2.2g protein per kg lean mass, daily micronutrients'}</li>
        <li><strong>Cardio:</strong> 150+ minutes moderate intensity weekly</li>
        <li><strong>Follow-up:</strong> Repeat DEXA scan in 6–12 months to track progress</li>
        <li><strong>Consult:</strong> Work with a registered nutritionist & trainer for personalized protocol</li>
      </ul>
    </div>
  </div>
  <footer class="dx-foot">
    <div class="dx-foot-q">Comprehensive body composition analysis<br>Evidence-based recommendations<br><span class="dx-foot-gen">Consult healthcare providers for medical interpretation</span></div>
    <div style="display:flex;gap:10px;align-items:center;">
      <div style="font-size:10px;color:var(--text-muted);font-weight:600;">5 / 7</div>
      <div class="dx-foot-logo">
        <img src="${_BASE}/sdrc-logo.png" alt="SDRC" />
        <img src="${_BASE}/labit-logo.png" alt="Labit" />
      </div>
    </div>
  </footer>
</div>

<!-- PAGE 6: METABOLIC PROFILE -->
${rmr ? `<div data-page="6">
  <header class="dx-head">
    <h1 class="dx-title">METABOLISM</h1>
    <p class="dx-sub">Energy Expenditure <span class="dx-sub-date">• Caloric Foundation</span></p>
  </header>
  <div class="dx-flow">
    <div style="border:none;border-radius:12px;overflow:hidden;display:grid;grid-template-columns:1fr 160px;margin-bottom:6mm;background:linear-gradient(135deg, var(--primary), var(--primary-dark));">
      <div style="padding:7mm 8mm;align-self:center;font-size:13px;color:#fff;line-height:1.6;font-weight:500;">Resting Metabolic Rate is your baseline calorie burn at rest—the foundation for all nutrition planning and body composition goals.</div>
      <div style="background:rgba(255,255,255,0.15);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1mm;padding:6mm;backdrop-filter:blur(10px);">
        <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.3px;opacity:0.9;">Your RMR</div>
        <div style="font-size:44px;font-weight:900;line-height:1;">${rmr}</div>
        <div style="font-size:10px;opacity:0.8;">kcal/day</div>
      </div>
    </div>

    <div style="margin-bottom:6mm;">
      <div class="dx-kicker">DAILY CALORIE NEEDS <span class="lite">BY ACTIVITY LEVEL</span></div>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:3mm;margin-top:5mm;">
        <div style="padding:6mm;text-align:center;background:var(--light-2);border-radius:10px;border-top:4px solid var(--acceptable);">
          <div style="color:var(--text-primary);font-size:12px;font-weight:700;">Sedentary</div>
          <div style="font-weight:900;font-size:28px;color:var(--acceptable);margin:3mm 0 1mm;">≈${Math.round(rmr * 1.2)}</div>
          <div style="font-size:10px;color:var(--text-muted);margin-bottom:2mm;">kcal/day (×1.2)</div>
          <div style="font-size:10px;color:var(--text-secondary);line-height:1.4;">Little or no exercise</div>
        </div>
        <div style="padding:6mm;text-align:center;background:var(--light-2);border-radius:10px;border-top:4px solid var(--optimal);">
          <div style="color:var(--text-primary);font-size:12px;font-weight:700;">Light</div>
          <div style="font-weight:900;font-size:28px;color:var(--optimal);margin:3mm 0 1mm;">≈${Math.round(rmr * 1.38)}</div>
          <div style="font-size:10px;color:var(--text-muted);margin-bottom:2mm;">kcal/day (×1.38)</div>
          <div style="font-size:10px;color:var(--text-secondary);line-height:1.4;">1–3 days/week, low intensity</div>
        </div>
        <div style="padding:6mm;text-align:center;background:linear-gradient(135deg, var(--optimal), var(--optimal-dark));border-radius:10px;color:#fff;border-top:4px solid var(--optimal);">
          <div style="font-size:12px;font-weight:700;">Moderate</div>
          <div style="font-weight:900;font-size:28px;margin:3mm 0 1mm;">≈${Math.round(rmr * 1.55)}</div>
          <div style="font-size:10px;opacity:0.85;margin-bottom:2mm;">kcal/day (×1.55)</div>
          <div style="font-size:10px;opacity:0.8;line-height:1.4;">3–4 days/week, mixed intensity</div>
        </div>
        <div style="padding:6mm;text-align:center;background:var(--light-2);border-radius:10px;border-top:4px solid var(--elevated);">
          <div style="color:var(--text-primary);font-size:12px;font-weight:700;">Very Active</div>
          <div style="font-weight:900;font-size:28px;color:var(--elevated);margin:3mm 0 1mm;">≈${Math.round(rmr * 1.73)}</div>
          <div style="font-size:10px;color:var(--text-muted);margin-bottom:2mm;">kcal/day (×1.73)</div>
          <div style="font-size:10px;color:var(--text-secondary);line-height:1.4;">5–6 days/week, high intensity</div>
        </div>
        <div style="padding:6mm;text-align:center;background:var(--light-2);border-radius:10px;border-top:4px solid var(--elevated);">
          <div style="color:var(--text-primary);font-size:12px;font-weight:700;">Extreme</div>
          <div style="font-weight:900;font-size:28px;color:var(--elevated);margin:3mm 0 1mm;">≈${Math.round(rmr * 1.9)}</div>
          <div style="font-size:10px;color:var(--text-muted);margin-bottom:2mm;">kcal/day (×1.9)</div>
          <div style="font-size:10px;color:var(--text-secondary);line-height:1.4;">Daily intense training</div>
        </div>
      </div>
    </div>

    <div>
      <div class="dx-kicker">PERSONALIZED TARGETS</div>
      <div class="dx-3" style="text-align:center;margin-top:5mm;">
        <div style="padding:6mm;background:linear-gradient(135deg, var(--elevated), var(--elevated-dark));border-radius:12px;color:#fff;border-top:4px solid var(--elevated);">
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.3px;margin-bottom:3mm;opacity:0.9;">Build Muscle</div>
          <div style="font-size:42px;font-weight:900;">${Math.round(rmr * 1.3)}</div>
          <div style="font-size:11px;margin-top:2mm;opacity:0.8;">+20% surplus (requires training)</div>
        </div>
        <div style="padding:6mm;background:linear-gradient(135deg, var(--optimal), var(--optimal-dark));border-radius:12px;color:#fff;border-top:4px solid var(--optimal);">
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.3px;margin-bottom:3mm;opacity:0.9;">Maintain Weight</div>
          <div style="font-size:42px;font-weight:900;">${Math.round(rmr * 1.2)}</div>
          <div style="font-size:11px;margin-top:2mm;opacity:0.8;">Matches typical activity</div>
        </div>
        <div style="padding:6mm;background:linear-gradient(135deg, var(--acceptable), var(--acceptable-dark));border-radius:12px;color:#fff;border-top:4px solid var(--acceptable);">
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.3px;margin-bottom:3mm;opacity:0.9;">Lose Fat</div>
          <div style="font-size:42px;font-weight:900;">${Math.round(rmr * 1.1)}</div>
          <div style="font-size:11px;margin-top:2mm;opacity:0.8;">−10% deficit (preserve muscle)</div>
        </div>
      </div>
    </div>
  </div>
  <footer class="dx-foot">
    <div class="dx-foot-q">RMR derived from body composition<br>Activity-adjusted TDEE estimates<br><span class="dx-foot-gen">Reference data only; personalize with trainer</span></div>
    <div style="display:flex;gap:10px;align-items:center;">
      <div style="font-size:10px;color:var(--text-muted);font-weight:600;">6 / 7</div>
      <div class="dx-foot-logo">
        <img src="${_BASE}/sdrc-logo.png" alt="SDRC" />
        <img src="${_BASE}/labit-logo.png" alt="Labit" />
      </div>
    </div>
  </footer>
</div>` : ''}

<!-- PAGE 7: FAT-LOSS TARGETS -->
${fatLossData ? `<div data-page="7">
  <header class="dx-head">
    <h1 class="dx-title">COMPOSITION GOALS</h1>
    <p class="dx-sub">Fat-Loss Targets <span class="dx-sub-date">• Preserve Lean Mass</span></p>
  </header>
  <div class="dx-flow">
    <div style="background:linear-gradient(135deg, var(--primary), var(--primary-dark));color:#fff;padding:7mm;border-radius:12px;margin-bottom:6mm;">
      <div class="dx-kicker" style="color:#fff;margin-bottom:3mm;">CURRENT STATUS</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4mm;">
        <div><div style="font-size:12px;opacity:0.85;">Current Weight</div><div style="font-size:28px;font-weight:900;margin-top:1mm;">${kg(fatLossData.currentWeight * 1000)}</div></div>
        <div><div style="font-size:12px;opacity:0.85;">Lean Mass</div><div style="font-size:28px;font-weight:900;margin-top:1mm;">${kg(fatLossData.leanKg * 1000)}</div></div>
        <div><div style="font-size:12px;opacity:0.85;">Body Fat</div><div style="font-size:28px;font-weight:900;margin-top:1mm;">${pct(fatLossData.fatPct)}</div></div>
      </div>
    </div>

    <div>
      <div class="dx-kicker" style="margin-bottom:4mm;">REACHING YOUR TARGETS</div>
      <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:6mm;">
        <thead>
          <tr style="background:var(--dark);color:#fff;">
            <th style="text-align:left;padding:10px;font-weight:700;font-size:11px;letter-spacing:0.3px;">Target BF%</th>
            <th style="text-align:center;padding:10px;font-weight:700;font-size:11px;letter-spacing:0.3px;">Fat to Lose</th>
            <th style="text-align:center;padding:10px;font-weight:700;font-size:11px;letter-spacing:0.3px;">Weight to Lose</th>
            <th style="text-align:center;padding:10px;font-weight:700;font-size:11px;letter-spacing:0.3px;">Goal Weight</th>
          </tr>
        </thead>
        <tbody>
          ${fatLossData.targets.map(t => `<tr style="border-bottom:1px solid var(--light-3);"><td style="text-align:center;padding:10px;font-weight:600;">${t.pct}%</td><td style="text-align:center;padding:10px;color:var(--accent);">${t.fatToLose}</td><td style="text-align:center;padding:10px;">${t.weightToLose}</td><td style="text-align:center;padding:10px;font-weight:700;color:var(--primary);">${t.targetWeight}</td></tr>`).join('')}
        </tbody>
      </table>

      <div style="padding:5mm;background:var(--light-2);border-radius:10px;border-left:4px solid var(--warning);">
        <p class="dx-copy" style="margin:0;font-size:12px;"><strong>💡 Important:</strong> ${fatLossData.preservationNote} Never cut more than 20% below RMR, as this compromises lean mass preservation and metabolic function.</p>
      </div>
    </div>
  </div>
  <footer class="dx-foot">
    <div class="dx-foot-q">Lean mass preservation modeled<br>Evidence-based fat loss strategies<br><span class="dx-foot-gen">Work with trainer for personalized plan</span></div>
    <div style="display:flex;gap:10px;align-items:center;">
      <div style="font-size:10px;color:var(--text-muted);font-weight:600;">7 / 7</div>
      <div class="dx-foot-logo">
        <img src="${_BASE}/sdrc-logo.png" alt="SDRC" />
        <img src="${_BASE}/labit-logo.png" alt="Labit" />
      </div>
    </div>
  </footer>
</div>` : ''}

<!-- PAGE 8: TRENDS -->
${(() => {
  const allScans = [...historyForRender, reportData];
  const sortedScans = allScans.sort((a, b) => new Date(a.patient.scan_date) - new Date(b.patient.scan_date));
  const maxFat = Math.max(...sortedScans.map(s => s.composition.fat_pct));
  const minFat = Math.min(...sortedScans.map(s => s.composition.fat_pct));
  const fatRange = maxFat - minFat || 1;
  return `<div data-page="8">
  <header class="dx-head">
    <h1 class="dx-title">TRENDS</h1>
    <p class="dx-sub">Scan History <span class="dx-sub-date">• Track Your Progress</span></p>
  </header>
  <div class="dx-flow">
    <div style="padding:5mm;background:var(--light-2);border-radius:10px;border-left:4px solid var(--optimal);margin-bottom:3mm;">
      <p class="dx-copy" style="margin:0;font-size:11px;">Monitoring: <strong>fat %, lean %, centile, FMI, LMI, ALMI, T-score</strong>. Scans every 6–12 months track progress.</p>
    </div>

    <!-- Mini Trend Charts -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:2mm;margin-bottom:3mm;">
      <div><div class="dx-kicker" style="font-size:10px;margin-bottom:1mm;">FAT %</div><div style="padding:3mm;background:var(--light-2);border-radius:8px;display:flex;justify-content:space-between;align-items:flex-end;height:50px;gap:0.5mm;">${sortedScans.map((scan, idx) => { const fatPct = scan.composition.fat_pct; const normalized = (fatPct - minFat) / fatRange * 100; const isLatest = idx === sortedScans.length - 1; return `<div style="flex:1;background:${isLatest ? 'var(--optimal)' : 'var(--elevated)'};height:${Math.max(normalized, 4)}%;border-radius:2px;"></div>`; }).join('')}</div></div>
      <div><div class="dx-kicker" style="font-size:10px;margin-bottom:1mm;">LEAN %</div><div style="padding:3mm;background:var(--light-2);border-radius:8px;display:flex;justify-content:space-between;align-items:flex-end;height:50px;gap:0.5mm;">${sortedScans.map((scan, idx) => { const leanPct = scan.composition.lean_pct || ((scan.composition.lean_g / scan.composition.total_g) * 100); const maxLean = Math.max(...sortedScans.map(s => s.composition.lean_pct || ((s.composition.lean_g / s.composition.total_g) * 100))); const minLean = Math.min(...sortedScans.map(s => s.composition.lean_pct || ((s.composition.lean_g / s.composition.total_g) * 100))); const leanRange = maxLean - minLean || 1; const normalized = (leanPct - minLean) / leanRange * 100; const isLatest = idx === sortedScans.length - 1; return `<div style="flex:1;background:${isLatest ? 'var(--optimal)' : 'var(--acceptable)'};height:${Math.max(normalized, 4)}%;border-radius:2px;"></div>`; }).join('')}</div></div>
      <div><div class="dx-kicker" style="font-size:10px;margin-bottom:1mm;">FMI</div><div style="padding:3mm;background:var(--light-2);border-radius:8px;display:flex;justify-content:space-between;align-items:flex-end;height:50px;gap:0.5mm;">${sortedScans.map((scan, idx) => { const fmi = scan.computed?.fmi || 0; const fmiVals = sortedScans.map(s => s.computed?.fmi || 0).filter(v => v > 0); const maxFmi = Math.max(...fmiVals); const minFmi = Math.min(...fmiVals); const fmiRange = maxFmi - minFmi || 1; const normalized = (fmi - minFmi) / fmiRange * 100; const isLatest = idx === sortedScans.length - 1; return `<div style="flex:1;background:${isLatest ? 'var(--optimal)' : 'var(--elevated)'};height:${Math.max(normalized, 4)}%;border-radius:2px;"></div>`; }).join('')}</div></div>
      <div><div class="dx-kicker" style="font-size:10px;margin-bottom:1mm;">ALMI</div><div style="padding:3mm;background:var(--light-2);border-radius:8px;display:flex;justify-content:space-between;align-items:flex-end;height:50px;gap:0.5mm;">${sortedScans.map((scan, idx) => { const almi = scan.computed?.almi || 0; const almiVals = sortedScans.map(s => s.computed?.almi || 0).filter(v => v > 0); const maxAlmi = Math.max(...almiVals); const minAlmi = Math.min(...almiVals); const almiRange = maxAlmi - minAlmi || 1; const normalized = (almi - minAlmi) / almiRange * 100; const isLatest = idx === sortedScans.length - 1; return `<div style="flex:1;background:${isLatest ? 'var(--optimal)' : 'var(--acceptable)'};height:${Math.max(normalized, 4)}%;border-radius:2px;"></div>`; }).join('')}</div></div>
    </div>

    <div>
      <div class="dx-kicker">SCAN <span class="lite">HISTORY</span></div>
      <table style="width:100%;border-collapse:collapse;font-size:11px;margin-top:4mm;">
        <thead><tr style="background:var(--dark);color:#fff;">
          <th style="text-align:left;padding:8px;font-weight:700;font-size:10px;letter-spacing:0.3px;">Date</th>
          <th style="text-align:center;padding:8px;font-weight:700;font-size:10px;letter-spacing:0.3px;">Fat %</th>
          <th style="text-align:center;padding:8px;font-weight:700;font-size:10px;letter-spacing:0.3px;">Lean %</th>
          <th style="text-align:center;padding:8px;font-weight:700;font-size:10px;letter-spacing:0.3px;">Centile</th>
          <th style="text-align:center;padding:8px;font-weight:700;font-size:10px;letter-spacing:0.3px;">FMI</th>
          <th style="text-align:center;padding:8px;font-weight:700;font-size:10px;letter-spacing:0.3px;">LMI</th>
          <th style="text-align:center;padding:8px;font-weight:700;font-size:10px;letter-spacing:0.3px;">ALMI</th>
          <th style="text-align:center;padding:8px;font-weight:700;font-size:10px;letter-spacing:0.3px;">T-Score</th>
        </tr></thead>
        <tbody>
          ${sortedScans.map((scan, idx) => {
            const leanPct = scan.composition.lean_pct || ((scan.composition.lean_g / scan.composition.total_g) * 100);
            const isLatest = idx === sortedScans.length - 1;
            const prevScan = idx > 0 ? sortedScans[idx - 1] : null;

            // Calculate trends (good = green arrow up, bad = red arrow down)
            const getTrendIndicator = (current, prev, higherIsBetter) => {
              if (!prev) return '';
              const delta = current - prev;
              const isPositive = higherIsBetter ? delta > 0 : delta < 0;
              const color = isPositive ? 'var(--optimal)' : 'var(--elevated)';
              const arrow = delta > 0 ? '↑' : delta < 0 ? '↓' : '→';
              return '<div style="color:' + color + ';font-weight:700;font-size:12px;">' + arrow + '</div>';
            };

            const prevLeanPct = prevScan ? (prevScan.composition.lean_pct || ((prevScan.composition.lean_g / prevScan.composition.total_g) * 100)) : null;
            const prevCentile = prevScan ? prevScan.composition.centile : null;
            const prevFmi = prevScan ? prevScan.computed?.fmi : null;
            const prevLmi = prevScan ? prevScan.computed?.lmi : null;
            const prevAlmi = prevScan ? prevScan.computed?.almi : null;
            const prevTScore = prevScan ? prevScan.bone?.total_t : null;

            return `<tr style="border-bottom:1px solid var(--light-3);${isLatest ? 'background:linear-gradient(90deg, var(--optimal)15, transparent);font-weight:700;' : ''}">
              <td style="text-align:left;padding:8px;">${tbFmtDate(scan.patient.scan_date)}</td>
              <td style="text-align:center;padding:8px;">
                <div style="color:${isLatest ? 'var(--optimal)' : 'var(--text-primary)'};">${pct(scan.composition.fat_pct)}</div>
                <div style="font-size:10px;color:#999;margin-top:1px;">${getTrendIndicator(scan.composition.fat_pct, prevScan?.composition.fat_pct, false)}</div>
              </td>
              <td style="text-align:center;padding:8px;">
                <div style="color:${isLatest ? 'var(--optimal)' : 'var(--text-primary)'};">${Number(leanPct).toFixed(1)}%</div>
                <div style="font-size:10px;color:#999;margin-top:1px;">${getTrendIndicator(leanPct, prevLeanPct, true)}</div>
              </td>
              <td style="text-align:center;padding:8px;">
                <div>${scan.composition.centile || '—'}</div>
                <div style="font-size:10px;color:#999;margin-top:1px;">${getTrendIndicator(scan.composition.centile, prevCentile, false)}</div>
              </td>
              <td style="text-align:center;padding:8px;">
                <div>${scan.computed?.fmi ? Number(scan.computed.fmi).toFixed(2) : '—'}</div>
                <div style="font-size:10px;color:#999;margin-top:1px;">${getTrendIndicator(scan.computed?.fmi, prevFmi, false)}</div>
              </td>
              <td style="text-align:center;padding:8px;">
                <div>${scan.computed?.lmi ? Number(scan.computed.lmi).toFixed(2) : '—'}</div>
                <div style="font-size:10px;color:#999;margin-top:1px;">${getTrendIndicator(scan.computed?.lmi, prevLmi, true)}</div>
              </td>
              <td style="text-align:center;padding:8px;">
                <div>${scan.computed?.almi ? Number(scan.computed.almi).toFixed(2) : '—'}</div>
                <div style="font-size:10px;color:#999;margin-top:1px;">${getTrendIndicator(scan.computed?.almi, prevAlmi, true)}</div>
              </td>
              <td style="text-align:center;padding:8px;">
                <div>${scan.bone?.total_t !== null && scan.bone?.total_t !== undefined ? Number(scan.bone.total_t).toFixed(1) : '—'}</div>
                <div style="font-size:10px;color:#999;margin-top:1px;">${getTrendIndicator(scan.bone?.total_t, prevTScore, true)}</div>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  </div>
  <footer class="dx-foot">
    <div class="dx-foot-q">Multi-scan longitudinal analysis<br>Progress tracking reference<br><span class="dx-foot-gen">Repeat scans recommended every 6–12 months</span></div>
    <div style="display:flex;gap:10px;align-items:center;">
      <div style="font-size:10px;color:var(--text-muted);font-weight:600;">8 / 8</div>
      <div class="dx-foot-logo">
        <img src="${_BASE}/sdrc-logo.png" alt="SDRC" />
        <img src="${_BASE}/labit-logo.png" alt="Labit" />
      </div>
    </div>
  </footer>
</div>`;
})()}

</body>
</html>`
}

