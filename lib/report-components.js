/** @file Shared content model functions for BMD/body composition reports.
 *  Returns plain data objects — templates render them with their own styling.
 */

import { kg } from './report-utils.js'

// ── ACE Body Fat Categories ──────────────────────────────────────────────
function aceCategory(fatPct, gender) {
  const male = gender?.toLowerCase().startsWith('m')
  const [athHi, fitHi, normHi] = male ? [14, 18, 25] : [21, 25, 32]

  if (fatPct <= athHi) return { level: 'athletic', threshold: athHi }
  if (fatPct <= fitHi) return { level: 'fitness', threshold: fitHi }
  if (fatPct <= normHi) return { level: 'normal', threshold: normHi }
  if (fatPct <= normHi + 7) return { level: 'overweight', threshold: normHi + 7 }
  return { level: 'obese', threshold: 100 }
}

// ── Clinical Summary Items ──────────────────────────────────────────────
/**
 * Generate clinical findings for the summary page.
 * @returns {Array<{status: 'good'|'warn'|'alert'|'info', title: string, body: string}>}
 */
export function summaryItems(comp, calc, bone, gender) {
  const out = []
  const male = gender?.toLowerCase().startsWith('m')

  // ── Body Fat % (ACE) ──────────────────────────────────────────────────
  const ace = aceCategory(comp.fat_pct, gender)
  const aceLabel = {
    athletic: { status: 'good', label: 'Athletic' },
    fitness: { status: 'good', label: 'Fitness' },
    normal: { status: 'good', label: 'Normal' },
    overweight: { status: 'warn', label: 'Overweight' },
    obese: { status: 'alert', label: 'Obese class I+' },
  }[ace.level]

  out.push({
    status: aceLabel.status,
    title: `Body Fat: ${aceLabel.label}`,
    body: `${comp.fat_pct}% (${kg(comp.fat_g)} kg) — ${aceLabel.label} for ${gender === 'Male' ? 'men' : 'women'}${comp.centile != null ? ` · ${comp.centile}th centile vs peers` : ''}.`,
  })

  // ── Android/Gynoid Ratio ──────────────────────────────────────────────
  const agInterp = comp.ag_ratio < 0.8
    ? { status: 'good', phrase: 'Gynoid-dominant (lower risk profile)' }
    : comp.ag_ratio <= 1.0
    ? { status: 'info', phrase: 'Balanced fat distribution' }
    : { status: 'warn', phrase: 'Android-dominant (higher metabolic risk)' }

  out.push({
    status: agInterp.status,
    title: `Fat Distribution: A/G ${comp.ag_ratio}`,
    body: `${agInterp.phrase}. Gynoid (lower body) vs Android (upper body) ratio — lower is favourable.`,
  })

  // ── ALMI (Appendicular Lean Mass Index) ────────────────────────────────
  if (calc.alm_available) {
    const almiLo = male ? 7.26 : 5.67
    const almiStatus = calc.almi < almiLo ? 'alert' : calc.almi_rating === 'high' ? 'good' : 'good'
    const almiPhrase = calc.almi < almiLo
      ? `${calc.almi} kg/m² — below sarcopenia threshold (${almiLo})`
      : calc.almi_rating === 'high'
      ? `${calc.almi} kg/m² — excellent appendicular lean mass`
      : `${calc.almi} kg/m² — normal range`

    out.push({
      status: almiStatus,
      title: 'Muscle Mass: ALMI',
      body: almiPhrase,
    })
  }

  // ── FMI (Fat Mass Index) ───────────────────────────────────────────────
  const fmiStatus = calc.fmi > 9 ? (male ? 'warn' : 'alert') : 'info'
  const fmiPhrase = calc.fmi > 9
    ? `${calc.fmi} kg/m² — elevated fat mass relative to height`
    : `${calc.fmi} kg/m² — fat distribution reasonable`

  out.push({
    status: fmiStatus,
    title: 'Fat Mass Index',
    body: fmiPhrase,
  })

  // ── Bone Density ───────────────────────────────────────────────────────
  const boneStatus = bone.classification === 'normal' ? 'good'
    : bone.classification === 'low_mass' ? 'warn'
    : 'alert'
  const bonePhrase = bone.classification === 'normal'
    ? `T-score ${bone.total_t.toFixed(1)} — within normal range`
    : bone.classification === 'low_mass'
    ? `T-score ${bone.total_t.toFixed(1)} — below peak bone mass`
    : `T-score ${bone.total_t.toFixed(1)} — osteoporosis — clinical review recommended`

  out.push({
    status: boneStatus,
    title: 'Bone Density',
    body: bonePhrase,
  })

  return out
}

// ── Fat-Loss Targets ──────────────────────────────────────────────────────
/**
 * Fat-loss targets to reach goal BF%, assuming lean mass is preserved.
 * @returns {{currentWeight, leanKg, fatPct, targets, sarcopeniaRisk, preservationNote}} | null if BF% already healthy
 */
export function fatLossTargets(comp, calc, gender) {
  const male = gender?.toLowerCase().startsWith('m')
  const bfThreshold = male ? 25 : 32

  if (comp.fat_pct <= bfThreshold) return null  // Already within healthy range

  const leanKg = comp.lean_g / 1000
  const fatKg = comp.fat_g / 1000
  const currentWeight = fatKg + leanKg + (comp.bmc_g / 1000)
  const heightM = calc.height_m ?? 0

  // Sarcopenia threshold (only flag if ALM data is available and below threshold)
  const almiLo = male ? 7.26 : 5.67
  const sarcopeniaRisk = calc.alm_available && calc.almi < almiLo
  const almiLow = calc.alm_available && calc.almi < almiLo

  const allTargets = [30, 25, 20]
    .map(pct => {
      const targetWeight = parseFloat((leanKg / (1 - pct / 100)).toFixed(1))
      const targetFat = parseFloat((targetWeight * (pct / 100)).toFixed(1))
      const fatToLose = parseFloat((fatKg - targetFat).toFixed(1))
      const weightToLose = parseFloat((currentWeight - targetWeight).toFixed(1))
      const goalBmi = heightM > 0 ? parseFloat((targetWeight / heightM ** 2).toFixed(1)) : 0
      const feasible = goalBmi >= 18.5
      return { pct, fatToLose, weightToLose, targetWeight, goalBmi, feasible }
    })

  const feasibleTargets = allTargets.filter(t => t.feasible)

  // If ALMI is low and all targets are infeasible, provide recomposition guidance instead
  if (almiLow && feasibleTargets.length === 0) {
    return {
      currentWeight,
      leanKg,
      fatPct: comp.fat_pct,
      targets: [],
      sarcopeniaRisk,
      almiLow: true,
      preservationNote: 'Your appendicular lean mass is below the normal range. Weight-loss targets shown below would result in an underweight BMI given your current muscle mass. Recommended focus: body recomposition rather than weight loss.',
    }
  }

  const suppressed = allTargets.length - feasibleTargets.length
  let preservationNote = 'These targets assume you preserve lean mass through resistance training (2–3× per week). Without strength work, you risk losing muscle along with fat.'
  if (suppressed > 0) {
    preservationNote += ` (${suppressed} target${suppressed > 1 ? 's' : ''} not shown — would require a body weight below the healthy BMI range.)`
  }

  return {
    currentWeight,
    leanKg,
    fatPct: comp.fat_pct,
    targets: feasibleTargets,
    sarcopeniaRisk,
    almiLow: false,
    preservationNote,
  }
}

// ── Scan Delta ────────────────────────────────────────────────────────────
/**
 * Changes since the previous scan.
 * @returns {{prevDate, items}} | null if no prior scan
 */
export function scanDelta(delta) {
  if (!delta) return null

  const items = [
    { label: 'Body Fat', value: delta.fat_pct_change, unit: '%', goodDir: 'down' },
    { label: 'Fat Mass', value: delta.fat_kg_change, unit: 'kg', goodDir: 'down' },
    { label: 'Lean Mass', value: delta.lean_kg_change, unit: 'kg', goodDir: 'up' },
    { label: 'Bone', value: delta.bmc_kg_change, unit: 'kg', goodDir: 'up' },
  ].filter(i => i.value != null)

  return { prevDate: delta.scan_date_prev, items }
}

// ── ALMI Context ──────────────────────────────────────────────────────────
/**
 * Muscle mass interpretation — positive if lean is preserved, sarcopenia-focused otherwise.
 */
export function muscleContext(calc) {
  const preserved = calc.lean_preserved

  if (preserved) {
    return {
      preserved: true,
      heading: 'Muscle Mass: Well Preserved',
      intro: 'Your appendicular lean mass (ALMI) is within or above the normal reference range — this is a significant positive finding. Maintaining muscle while managing body fat is the most effective strategy for long-term metabolic health.',
      tips: [
        'Resistance training 2–3× per week is the most effective way to build and maintain lean mass at any age.',
        'Protein intake of ≥ 1.6 g/kg body weight/day supports muscle maintenance during weight loss.',
      ],
    }
  }

  return {
    preserved: false,
    heading: 'Muscle Mass — What to Know',
    intro: 'Skeletal muscle mass peaks around age 25–30 and naturally declines 3–8% per decade if not actively maintained. Low appendicular lean mass is linked to reduced strength, insulin resistance, and higher metabolic risk.',
    tips: [
      'Resistance training 2–3× per week is the most effective way to build and maintain lean mass at any age.',
      'Protein intake of ≥ 1.6 g/kg body weight/day supports muscle maintenance during weight loss.',
    ],
  }
}

// ── Bone Guidance ─────────────────────────────────────────────────────────
/**
 * Bone health recommendations by classification.
 */
export function boneGuide(classification) {
  const guides = {
    normal: {
      title: 'Bone Health — Maintenance',
      severity: 'normal',
      items: [
        'Calcium 1000–1200 mg/day through diet (dairy, leafy greens, fortified foods) or supplementation.',
        'Vitamin D 600–800 IU/day; check serum 25-OHD annually to confirm sufficiency.',
        'Regular weight-bearing activity: walking, jogging, resistance training, and balance work.',
        'Recheck BMD in 2–3 years or sooner if risk factors change.',
      ],
    },
    low_mass: {
      title: 'Bone Health — Prevention Priorities',
      severity: 'low_mass',
      items: [
        'Calcium 1200 mg/day + Vitamin D 800–1000 IU/day; supplement if dietary intake is insufficient.',
        'Progressive resistance and weight-bearing exercise to stimulate bone remodelling.',
        'Avoid smoking and limit alcohol — both accelerate bone loss significantly.',
        'Discuss pharmacological options (bisphosphonates, hormone therapy) with your clinician.',
        'Repeat DXA in 1–2 years to track progression.',
      ],
    },
    osteoporosis: {
      title: 'Bone Health — Clinical Review Recommended',
      severity: 'osteoporosis',
      items: [
        'FRAX fracture risk assessment recommended — discuss with your clinician promptly.',
        'Anti-resorptive therapy (bisphosphonates) or anabolic agents may be clinically indicated.',
        'Calcium 1200 mg/day + Vitamin D 1000–2000 IU/day.',
        'Fall prevention: balance training, home safety review, medication review for fall risk.',
        'Avoid high-impact activities that risk fragility fracture until treatment is established.',
      ],
    },
  }

  return guides[classification] || guides.normal
}

// ── Badge Data ────────────────────────────────────────────────────────────
export function almiBadge(rating) {
  const levels = {
    low: { label: 'Low', level: 'low' },
    normal: { label: 'Normal', level: 'normal' },
    high: { label: 'High', level: 'high' },
  }
  return levels[rating] || { label: '—', level: 'normal' }
}

export function boneClassBadge(classification) {
  const levels = {
    normal: { label: 'Normal', level: 'normal' },
    low_mass: { label: 'Low Bone Mass', level: 'low_mass' },
    osteoporosis: { label: 'Osteoporosis', level: 'osteoporosis' },
  }
  return levels[classification] || { label: '—', level: 'normal' }
}

// ── Centile Text ──────────────────────────────────────────────────────────
export function centileText(centile, gender) {
  if (centile == null) return null
  const pronounce = gender?.toLowerCase().startsWith('m') ? 'men' : 'women'
  return {
    sentence: `Body fat % is greater than that of ${centile}% of ${pronounce} of the same age.`,
  }
}
