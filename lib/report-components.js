/** @file Shared content model functions for BMD/body composition reports.
 *  Returns plain data objects — templates render them with their own styling.
 */

import { kg } from './report-utils.js'

// ── Body Fat Categories (ACE + Obesity Classification) ──────────────────
export function aceCategory(fatPct, gender) {
  const male = gender?.toLowerCase().startsWith('m')
  const [athHi, fitHi, normHi, softHi] = male ? [13, 17, 24, 29] : [20, 24, 31, 36]

  if (fatPct <= athHi) return { level: 'athletic', threshold: athHi }
  if (fatPct <= fitHi) return { level: 'fitness', threshold: fitHi }
  if (fatPct <= normHi) return { level: 'normal', threshold: normHi }
  if (fatPct <= softHi) return { level: 'overweight', threshold: softHi }
  return { level: 'obese', threshold: 100 }
}


// ── Clinical Summary Items ──────────────────────────────────────────────
/**
 * Generate clinical findings for the summary page.
 * @param {boolean} isComposition - true for body composition reports, false/undefined for osteo reports
 * @returns {Array<{status: 'good'|'warn'|'alert'|'info', title: string, body: string}>}
 */
export function summaryItems(comp, calc, bone, gender, isComposition = false) {
  const out = []
  const male = gender?.toLowerCase().startsWith('m')

  // ── Body Fat % (ACE) ──────────────────────────────────────────────────
  const ace = aceCategory(comp.fat_pct, gender)
  const aceLabel = {
    athletic: { status: 'good', label: 'Athletic' },
    fitness: { status: 'good', label: 'Fitness' },
    normal: { status: 'good', label: 'Normal' },
    overweight: { status: 'warn', label: 'Overweight' },
    obese: { status: 'alert', label: 'Obese' },
  }[ace.level]

  // Add descriptions for overweight and obese categories
  const categoryDesc = ace.level === 'overweight'
    ? ` (${male ? '25–29%' : '32–36%'}): Metabolic warning zone.`
    : ace.level === 'obese'
    ? ` (${male ? '30%+' : '37%+'}): Elevated health risk.`
    : ''

  out.push({
    status: aceLabel.status,
    title: `Body Fat: ${aceLabel.label}`,
    body: `${comp.fat_pct}% (${kg(comp.fat_g)} kg) — ${aceLabel.label}${categoryDesc} for ${gender === 'Male' ? 'men' : 'women'}${comp.centile != null ? ` · ${comp.centile}th centile vs peers` : ''}.`,
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
  const fmiThresholdModerate = male ? 6 : 9
  const fmiThresholdHigh = male ? 9 : 13
  const fmiStatus = calc.fmi >= fmiThresholdHigh ? (male ? 'warn' : 'alert')
    : calc.fmi >= fmiThresholdModerate ? 'warn'
    : 'info'
  const fmiPhrase = calc.fmi >= fmiThresholdHigh
    ? `${calc.fmi} kg/m² — elevated, indicating excess body fat despite preserved muscle`
    : calc.fmi >= fmiThresholdModerate
    ? `${calc.fmi} kg/m² — mildly elevated, indicating excess body fat despite preserved muscle`
    : `${calc.fmi} kg/m² — normal range`

  out.push({
    status: fmiStatus,
    title: 'Fat Mass Index',
    body: fmiPhrase,
  })

  // ── Bone Density ───────────────────────────────────────────────────────
  // For composition reports: only show if NOT normal (dedicated BMD page covers normal)
  // For osteo reports: always show BMD (it's the focus)
  if (bone.classification !== 'normal' || !isComposition) {
    const boneStatus = bone.classification === 'low_mass' ? 'warn'
      : bone.classification === 'unknown' ? 'info'
      : 'alert'
    const bonePhrase = bone.classification === 'low_mass'
      ? `T-score ${bone.total_t.toFixed(1)} — below peak bone mass`
      : bone.classification === 'unknown'
      ? `T-score reference range not available for this age`
      : `T-score ${bone.total_t.toFixed(1)} — osteoporosis — clinical review recommended`

    out.push({
      status: boneStatus,
      title: 'Bone Density',
      body: bonePhrase,
    })
  }

  return out
}

// ── Fat-Loss Targets ──────────────────────────────────────────────────────
/**
 * Fat-loss targets to reach goal BF%, assuming lean mass is preserved.
 * @returns {{currentWeight, leanKg, fatPct, targets, sarcopeniaRisk, preservationNote}} | null if BF% already healthy
 */
export function fatLossTargets(comp, calc, gender) {
  const male = gender?.toLowerCase().startsWith('m')
  const [athHi, fitHi, normHi, softHi, obeseLo] = male ? [13, 17, 24, 29, 30] : [20, 24, 31, 36, 37]

  // No targets if already at elite athletic level
  if (comp.fat_pct <= athHi) return null  // Already athletic

  const leanKg = comp.lean_g / 1000
  const fatKg = comp.fat_g / 1000
  const boneKg = comp.bmc_g / 1000
  const currentWeight = fatKg + leanKg + boneKg

  // Verify: fat_pct should match the composition total
  const derivedFatPct = currentWeight > 0 ? parseFloat((fatKg / currentWeight * 100).toFixed(1)) : 0
  if (Math.abs(derivedFatPct - comp.fat_pct) > 0.5) {
    console.warn(`⚠️ Body composition mismatch: comp.fat_pct=${comp.fat_pct}% but masses give ${derivedFatPct}%. Check: fat_g=${comp.fat_g}, lean_g=${comp.lean_g}, bmc_g=${comp.bmc_g}`)
  }

  // ALMI (appendicular lean mass index) reference ranges by gender
  const almiLo = male ? 7.26 : 5.67
  const almiHi = male ? 9.2 : 7.5

  // Sarcopenia threshold (only flag if ALM data is available and below threshold)
  const sarcopeniaRisk = calc.alm_available && calc.almi < almiLo
  const almiLow = calc.alm_available && calc.almi < almiLo

  // Smart targeting based on obesity categories
  let targetPercentages = []

  if (comp.fat_pct >= obeseLo) {
    // Visibly Obese (30%+ men, 37%+ women): 2 targets
    // Target 1: Midpoint toward soft (progressive step)
    const mid = Math.round((comp.fat_pct + softHi) / 2 / 5) * 5  // Round to nearest 5
    // Target 2: Upper overweight range
    targetPercentages = [mid, softHi - 2]
  } else if (comp.fat_pct > softHi) {
    // Overweight/Soft (25-29% men, 32-36% women): 2 targets
    // Target 1: Exit overweight into normal
    // Target 2: Reach fitness range
    targetPercentages = [normHi, fitHi - 2]
  } else if (comp.fat_pct > fitHi) {
    // Normal/Fit: 1 target
    // Target: Reach fitness range
    targetPercentages = [fitHi]
  } else {
    // Already in athletic or better: no targets
    targetPercentages = []
  }

  // Determine if we should show multiple lean mass scenarios
  // For low ALMI: show all scenarios (maintenance + gains) to illustrate lean mass building opportunity
  // For normal/high ALMI: show only maintenance scenario (aligned with "maintain lean, lose fat" guidance)
  const showMultipleScenarios = almiLow

  // Generate targets with appropriate lean mass scenarios
  const allTargets = targetPercentages
    .filter(pct => pct < comp.fat_pct)
    .map(pct => {
      // Scenario 1: Lean mass maintained (always calculated)
      const lean1 = leanKg
      const weight1 = parseFloat((lean1 / (1 - pct / 100)).toFixed(1))
      const fatLoss1 = parseFloat((fatKg - (weight1 - lean1 - boneKg)).toFixed(1))
      const almi1 = calc.almi_available ? parseFloat((calc.almi * (lean1 / leanKg)).toFixed(2)) : null

      if (!showMultipleScenarios) {
        // For healthy ALMI: single scenario (lean maintained)
        return {
          pct,
          weightRange: weight1.toFixed(1),
          fatLossRange: Math.max(0, fatLoss1).toFixed(1),
          scenarios: [
            { label: 'Lean maintained', weight: weight1, fatLoss: Math.max(0, fatLoss1), almi: almi1 }
          ]
        }
      }

      // For low ALMI: show all 3 scenarios with range
      // Scenario 2: +2 kg lean mass gain (moderate resistance training)
      const lean2 = leanKg + 2
      const weight2 = parseFloat((lean2 / (1 - pct / 100)).toFixed(1))
      const fatLoss2 = parseFloat((fatKg - (weight2 - lean2 - boneKg)).toFixed(1))
      const almi2 = calc.almi_available ? parseFloat((calc.almi * (lean2 / leanKg)).toFixed(2)) : null

      // Scenario 3: +4 kg lean mass gain (consistent resistance training)
      const lean3 = leanKg + 4
      const weight3 = parseFloat((lean3 / (1 - pct / 100)).toFixed(1))
      const fatLoss3 = parseFloat((fatKg - (weight3 - lean3 - boneKg)).toFixed(1))
      const almi3 = calc.almi_available ? parseFloat((calc.almi * (lean3 / leanKg)).toFixed(2)) : null

      const minWeight = Math.min(weight1, weight2, weight3)
      const maxWeight = Math.max(weight1, weight2, weight3)
      const minFatLoss = Math.min(fatLoss1, fatLoss2, fatLoss3)
      const maxFatLoss = Math.max(fatLoss1, fatLoss2, fatLoss3)

      return {
        pct,
        weightRange: `${minWeight.toFixed(1)}–${maxWeight.toFixed(1)}`,
        fatLossRange: `${Math.max(0, minFatLoss).toFixed(1)}–${Math.max(0, maxFatLoss).toFixed(1)}`,
        scenarios: [
          { label: 'Lean maintained', weight: weight1, fatLoss: Math.max(0, fatLoss1), almi: almi1 },
          { label: 'Moderate gain (+2 kg)', weight: weight2, fatLoss: Math.max(0, fatLoss2), almi: almi2 },
          { label: 'High gain (+4 kg)', weight: weight3, fatLoss: Math.max(0, fatLoss3), almi: almi3 }
        ]
      }
    })

  // If ALMI is low, provide recomposition guidance instead
  if (almiLow) {
    return {
      currentWeight,
      leanKg,
      fatKg,
      boneKg,
      fatPct: comp.fat_pct,
      targets: [],
      sarcopeniaRisk,
      almiLow: true,
      preservationNote: 'Your appendicular lean mass is below the normal range. Recommended focus: body recomposition (building muscle while managing fat) rather than weight loss alone.',
    }
  }

  // If no targets and ALMI is normal: no weight management guidance needed
  if (allTargets.length === 0) return null

  // ALMI analysis for patient guidance
  const almiRating = calc.almi_rating ?? 'unknown'
  const almiGuidance = almiRating === 'low'
    ? `⚠️ Lean mass is below healthy range (${almiLo}–${almiHi}). Priority: build muscle through resistance training 3–4× per week before aggressive fat loss.`
    : almiRating === 'high'
    ? `✓ Lean mass is well-developed (ALMI: ${calc.almi?.toFixed(2)} kg/m²). Pursue fat loss while maintaining it through resistance training 2–3× per week.`
    : `✓ Lean mass is normal (ALMI: ${calc.almi?.toFixed(2)} kg/m²). Maintain or increase through resistance training while pursuing fat loss.`

  const successNote = 'Progress is best assessed by repeat DEXA: fat mass should decrease, lean mass should be maintained or increase, and body fat percentage should reduce. Weight alone does not show whether the change is fat or muscle.'

  return {
    currentWeight,
    currentFat: fatKg,
    currentLean: leanKg,
    currentBone: boneKg,
    fatPct: comp.fat_pct,
    currentAlmi: calc.almi?.toFixed(2) ?? 'N/A',
    almiRange: `${almiLo}–${almiHi}`,
    almiStatus: almiRating,
    almiGuidance,
    targets: allTargets,
    sarcopeniaRisk,
    almiLow: false,
    preservationNote: 'These estimated weights are based on body composition targets, not BMI alone. Actual healthy weight may be higher if lean mass increases through resistance training. The key goal is to reduce fat mass while maintaining or increasing lean mass.',
    successNote,
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

// ── Forearm Summary ─────────────────────────────────────────────────────────
export function forearmSummary(left_forearm, right_forearm) {
  const hasLeft  = Object.keys(left_forearm ?? {}).length > 0
  const hasRight = Object.keys(right_forearm ?? {}).length > 0
  if (!hasLeft && !hasRight) return null

  // Display order: 3 Radius sites (diagnostic) + Ulna Total + Both Total (reference)
  const displayRegions = ['Radius UD', 'Radius 33%', 'Radius Total', 'Ulna Total', 'Both Total']
  const diagnosticSites = ['Radius UD', 'Radius 33%', 'Radius Total']

  const rows = displayRegions.map(region => ({
    region,
    isDiagnostic: diagnosticSites.includes(region),
    left: left_forearm?.[region] || null,
    right: right_forearm?.[region] || null,
  }))

  // Primary diagnostic: Radius 33% — use the lowest (worst) T-score if both sides present
  const leftRadius33 = left_forearm?.['Radius 33%']
  const rightRadius33 = right_forearm?.['Radius 33%']
  let primaryDiagnostic = leftRadius33 || rightRadius33

  // If both sides have Radius 33% data, use the one with lower (worse) T-score
  if (leftRadius33 && rightRadius33 && leftRadius33.T != null && rightRadius33.T != null) {
    primaryDiagnostic = leftRadius33.T <= rightRadius33.T ? leftRadius33 : rightRadius33
  }

  return { rows, hasLeft, hasRight, primaryDiagnostic }
}
