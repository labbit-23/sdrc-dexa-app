

/** @file Total body DEXA report computation — shared with Labit BMD module. */

const COMP_LABELS = {
  1: 'Arms', 2: 'Legs', 3: 'Trunk', 7: 'Total', 59: 'Android', 60: 'Gynoid',
}

// Bilateral (left/right) labels — confirmed from GE Lunar DPX-NT MDB
const BILATERAL_LABELS = {
  51: 'left_arm',   52: 'left_leg',   53: 'left_trunk',   54: 'left_total',
  55: 'right_arm',  56: 'right_leg',  57: 'right_trunk',  58: 'right_total',
}

function parseBilateral(snapshot) {
  const compEntries = Object.values(snapshot.composition)
  if (!compEntries.length) return null

  const isTotalbodyEntry = rows =>
    rows.some(r => parseInt(r.label) === 7 && parseFloat(r.bone_mass || 0) > 0)
  const rows = compEntries.find(isTotalbodyEntry) ?? compEntries[0]

  const b = {}
  for (const row of rows) {
    const label = parseInt(row.label)
    const key = BILATERAL_LABELS[label]
    if (!key) continue
    const fat  = Math.round(Math.abs(parseFloat(row.fat_mass)  || 0))
    const lean = Math.round(Math.abs(parseFloat(row.lean_mass) || 0))
    const bone = Math.round(Math.abs(parseFloat(row.bone_mass) || 0))
    b[key] = { fat_g: fat, lean_g: lean, bone_g: bone }
  }

  if (!b.left_arm || !b.right_arm) return null

  // Asymmetry: % difference relative to the larger side
  function asym(l, r) {
    const mx = Math.max(l, r)
    return mx > 0 ? parseFloat(((Math.abs(l - r) / mx) * 100).toFixed(1)) : 0
  }

  function makeSide(left, right) {
    if (!left || !right) return null
    return {
      left, right,
      lean_asym: asym(left.lean_g, right.lean_g),
      fat_asym:  asym(left.fat_g,  right.fat_g),
      bone_asym: asym(left.bone_g, right.bone_g),
      lean_dom:  left.lean_g >= right.lean_g ? 'left' : 'right',
      fat_dom:   left.fat_g  >= right.fat_g  ? 'left' : 'right',
    }
  }

  return {
    arms:  makeSide(b.left_arm,   b.right_arm),
    legs:  makeSide(b.left_leg,   b.right_leg),
    trunk: makeSide(b.left_trunk, b.right_trunk),
    total: makeSide(b.left_total, b.right_total),
  }
}

function parseRegions(snapshot) {
  const compEntries = Object.values(snapshot.composition)
  if (!compEntries.length) return {}

  // When a patient has both osteo and total-body scans, mdb_snapshot.composition
  // contains entries for all img_handles.  Osteo estimated-composition rows have
  // bone_mass=0 and values in the hundreds (percentage×10 scale).  The real
  // total-body entry has bone_mass > 0 on its Total row (label=7) and values
  // in the thousands (grams).  Pick the entry that looks like true total-body.
  const isTotalbodyEntry = rows =>
    rows.some(r => parseInt(r.label) === 7 && parseFloat(r.bone_mass || 0) > 0)

  const rows = compEntries.find(isTotalbodyEntry) ?? compEntries[0]
  const out = {}

  for (const row of rows) {
    const label = parseInt(row.label)
    const name = COMP_LABELS[label]
    if (!name) continue
    const fat  = Math.abs(parseFloat(row.fat_mass)  || 0)
    const lean = Math.abs(parseFloat(row.lean_mass) || 0)
    const bone = Math.abs(parseFloat(row.bone_mass) || 0)
    const total = fat + lean + bone
    out[name] = {
      fat_g:    Math.round(fat),
      lean_g:   Math.round(lean),
      bone_g:   Math.round(bone),
      total_g:  Math.round(total),
      fat_pct:  total > 0 ? parseFloat((fat  / total * 100).toFixed(1)) : 0,
      lean_pct: total > 0 ? parseFloat((lean / total * 100).toFixed(1)) : 0,
      bone_pct: total > 0 ? parseFloat((bone / total * 100).toFixed(1)) : 0,
    }
  }
  return out
}

function boneClassify(t) {
  if (t == null) return 'unknown'
  if (t <= -2.5) return 'osteoporosis'
  if (t <= -1.0) return 'low_mass'
  return 'normal'
}

// FMI reference ranges for men (kg/m²): normal 3–6, elevated 6–9, obese >9
// For women: normal 5–9, elevated 9–13
function fatRisk(fmi, gender) {
  const male = gender.toLowerCase().startsWith('m')
  if (male) return fmi < 6 ? 'low' : fmi < 9 ? 'moderate' : 'high'
  return fmi < 9 ? 'low' : fmi < 13 ? 'moderate' : 'high'
}

// ── Age-matched body fat centile ─────────────────────────────────────────────
// Source: Kelly et al. (2009) NHANES DEXA normative data, Non-Hispanic White.
// PLoS ONE 4(9):e7038. Percentile → fat% lookup per sex × age group.
// We use White norms as the best available published DEXA reference.
// Each entry: [ [percentile, fat%], ... ] in ascending order.
const CENTILE_NORMS = {
  male: [
    { maxAge: 29, pts: [[5,7.1],[10,9.4],[25,14.6],[50,20.5],[75,25.5],[90,29.8],[95,32.3]] },
    { maxAge: 39, pts: [[5,9.3],[10,12.1],[25,17.4],[50,22.6],[75,27.3],[90,31.1],[95,33.5]] },
    { maxAge: 49, pts: [[5,11.2],[10,13.7],[25,18.8],[50,24.1],[75,28.5],[90,32.2],[95,34.7]] },
    { maxAge: 59, pts: [[5,12.7],[10,15.5],[25,20.6],[50,25.9],[75,30.5],[90,34.1],[95,36.2]] },
    { maxAge: 69, pts: [[5,14.1],[10,17.0],[25,22.1],[50,27.1],[75,31.6],[90,35.0],[95,37.0]] },
    { maxAge: 999,pts: [[5,14.9],[10,17.8],[25,22.9],[50,27.7],[75,32.3],[90,35.8],[95,37.8]] },
  ],
  female: [
    { maxAge: 29, pts: [[5,16.4],[10,18.6],[25,23.0],[50,28.8],[75,34.5],[90,39.0],[95,41.7]] },
    { maxAge: 39, pts: [[5,16.9],[10,19.7],[25,25.1],[50,31.2],[75,36.8],[90,41.0],[95,43.4]] },
    { maxAge: 49, pts: [[5,18.6],[10,21.6],[25,27.4],[50,33.3],[75,38.5],[90,42.5],[95,44.8]] },
    { maxAge: 59, pts: [[5,20.8],[10,24.0],[25,30.1],[50,36.2],[75,41.3],[90,45.0],[95,47.0]] },
    { maxAge: 69, pts: [[5,22.4],[10,25.7],[25,31.8],[50,37.5],[75,42.3],[90,45.8],[95,47.6]] },
    { maxAge: 999,pts: [[5,22.6],[10,25.9],[25,32.1],[50,37.9],[75,42.8],[90,46.4],[95,48.3]] },
  ],
}

function computeCentile(fatPct, age, gender) {
  const key = gender.toLowerCase().startsWith('m') ? 'male' : 'female'
  const band = CENTILE_NORMS[key].find(b => age <= b.maxAge)
  if (!band) return null
  const pts = band.pts

  // Below lowest or above highest known point — clamp
  if (fatPct <= pts[0][1])            return Math.max(1,  pts[0][0] - 1)
  if (fatPct >= pts[pts.length-1][1]) return Math.min(99, pts[pts.length-1][0] + 1)

  // Linear interpolation between bracketing percentile points
  for (let i = 0; i < pts.length - 1; i++) {
    const [p0, f0] = pts[i]
    const [p1, f1] = pts[i + 1]
    if (fatPct >= f0 && fatPct <= f1) {
      return Math.round(p0 + (fatPct - f0) / (f1 - f0) * (p1 - p0))
    }
  }
  return null
}

// ALMI reference (appendicular lean mass index) for men: low < 7.26, normal 7.26–9.2, high > 9.2
function almiRating(almi, gender) {
  const male = gender.toLowerCase().startsWith('m')
  const lo = male ? 7.26 : 5.67
  const hi = male ? 9.20 : 7.5
  if (almi < lo) return 'low'
  if (almi > hi) return 'high'
  return 'normal'
}

export function computeReportData(raw, patientId, imageBaseUrl) {
  const snap  = raw.mdb_snapshot
  const bilateral = parseBilateral(snap)
  const mdbBoneRegions = raw.mdb_bone_regions ?? {}

  // ── Patient demographics — all from MDB ──────────────────────────────────
  const patRow  = Object.values(snap.patients)[0]
  const examRow = snap.exams[0]

  const heightCm        = patRow?.height_cm ?? 0
  const weightEnteredKg = patRow?.weight_kg ?? 0
  const gender          = patRow?.gender ?? 'Male'
  const heightM         = heightCm / 100
  const bmiEntered      = heightM > 0 ? parseFloat((weightEnteredKg / heightM ** 2).toFixed(1)) : 0

  // Age computed from MDB dob + scan date
  const dobDt   = patRow?.dob ? new Date(patRow.dob) : null
  const scanDt  = examRow?._acq_dt ? new Date(examRow._acq_dt) : new Date()
  const age     = dobDt ? parseFloat(((scanDt - dobDt) / 31557600000).toFixed(1)) : 0

  // Scan date/time from MDB exam acquisition timestamp
  const scanDate = examRow?._acq_dt?.slice(0, 10) ?? ''
  const scanTime = examRow?._acq_dt?.slice(11, 19) ?? ''

  // ── Composition regions — all from MDB ───────────────────────────────────
  const regions = parseRegions(snap)

  const totalRegion = regions.Total
  const fat_g   = totalRegion?.fat_g  ?? 0
  const lean_g  = totalRegion?.lean_g ?? 0
  const bmc_g   = totalRegion?.bone_g ?? 0
  const total_g = fat_g + lean_g + bmc_g
  const fat_pct = total_g > 0
    ? parseFloat((fat_g / total_g * 100).toFixed(1))
    : (totalRegion?.fat_pct ?? 0)

  const weightMeasuredKg = total_g / 1000
  const bmiMeasured = heightM > 0
    ? parseFloat((weightMeasuredKg / heightM ** 2).toFixed(1))
    : bmiEntered

  const androidFatPct = regions.Android?.fat_pct ?? 0
  const gynoidFatPct  = regions.Gynoid?.fat_pct  ?? 0
  const agRatio = gynoidFatPct > 0
    ? parseFloat((androidFatPct / gynoidFatPct).toFixed(2))
    : 0

  // ── Computed metrics ──────────────────────────────────────────────────────
  const armsLean      = regions.Arms?.lean_g ?? 0
  const legsLean      = regions.Legs?.lean_g ?? 0
  const alm_available = armsLean > 0 || legsLean > 0
  const alm_kg        = (armsLean + legsLean) / 1000
  const almi          = alm_available && heightM > 0 ? parseFloat((alm_kg / heightM ** 2).toFixed(2)) : 0
  const fmi           = heightM > 0 ? parseFloat((fat_g  / 1000 / heightM ** 2).toFixed(2)) : 0
  const lmi           = heightM > 0 ? parseFloat((lean_g / 1000 / heightM ** 2).toFixed(2)) : 0
  const rmr_kcal      = Math.round(370 + 21.6 * (lean_g / 1000))  // Katch-McArdle

  // ── Bone regions — MDB primary, xps_bone fallback for legacy records ──────
  const boneRegions = Object.keys(mdbBoneRegions).length > 0
    ? mdbBoneRegions
    : (raw.xps_bone?.regions ?? {})
  const totalBone = boneRegions['Total'] ?? {}
  const totalBmd  = totalBone.bmd ?? 0
  const totalT    = totalBone.T   ?? null
  const totalZ    = totalBone.Z   ?? null

  return {
    patient: {
      id:                  patientId,
      name:                `${patRow?.name ?? ''} ${patRow?.title ?? ''}`.trim(),
      first_name:          patRow?.name   ?? '',
      last_name:           patRow?.title  ?? '',
      gender,
      age,
      dob_str:             patRow?.dob ?? '',
      height_cm:           heightCm,
      weight_entered_kg:   weightEnteredKg,
      weight_measured_kg:  parseFloat(weightMeasuredKg.toFixed(1)),
      bmi_entered:         bmiEntered,
      bmi_measured:        bmiMeasured,
      ethnicity:           patRow?.ethnicity ?? '',
      physician:           patRow?.physician ?? '',
      scan_date:           scanDate,
      scan_time:           scanTime,
      scanner:             examRow?.scanner_id ?? '',
      software:            examRow?.acquisition_version ?? '',
    },
    composition: {
      regions,
      fat_pct,
      fat_g,
      lean_g,
      bmc_g,
      total_g,
      android_fat_pct: androidFatPct,
      gynoid_fat_pct:  gynoidFatPct,
      ag_ratio:        agRatio,
      centile:         computeCentile(fat_pct, age, gender),
    },
    computed: {
      alm_kg:        parseFloat(alm_kg.toFixed(1)),
      alm_available,
      almi,
      fmi,
      lmi,
      rmr_kcal,
      height_cm:   heightCm,
      height_m:    heightM,
      fat_risk:    fatRisk(fmi, gender),
      almi_rating: almiRating(almi, gender),
      // Fat-loss targets: weight needed to reach each BF% given current lean mass
      // Filter out rows where goal BMI would be underweight (<18.5)
      fat_loss_targets: lean_g > 0
        ? [30, 25, 20].map(pct => {
            const target_kg = parseFloat((lean_g / 1000 / (1 - pct / 100)).toFixed(1))
            const loss_kg   = parseFloat((fat_g / 1000 - (target_kg - lean_g / 1000)).toFixed(1))
            const goal_bmi  = heightM > 0 ? parseFloat((target_kg / heightM ** 2).toFixed(1)) : 0
            return {
              pct,
              target_kg,
              loss_kg: Math.max(0, loss_kg),
              goal_bmi,
              feasible: goal_bmi >= 18.5  // Flag if goal BMI would be underweight
            }
          })
        : null,
      // True if lean mass is preserved (normal/high ALMI) — surfaces callout
      lean_preserved: ['normal', 'high'].includes(almiRating(almi, gender)),
    },
    bone: {
      total_bmd:      totalBmd,
      total_t:        totalT,
      total_z:        totalZ,
      regions:        boneRegions,
      classification: boneClassify(totalT),
    },
    bilateral,
    images: {
      fat_lean_url:     `${imageBaseUrl}/img_fat_lean.png`,
      fat_gradient_url: `${imageBaseUrl}/img_fat_gradient.png`,
      bone_url:         `${imageBaseUrl}/img_bone.png`,
      bone_roi_url:     `${imageBaseUrl}/img_bone_roi.png`,
      composite_url:    `${imageBaseUrl}/img_composite.png`,
    },
  }
}
