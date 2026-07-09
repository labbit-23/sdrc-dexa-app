/** @file Core osteo report computation — shared with Labit BMD module. */

function classify(t) {
  if (t == null) return 'unknown'
  const t1 = Math.round(t * 10) / 10  // round to 1dp — matches displayed value
  if (t1 <= -2.5) return 'osteoporosis'
  if (t1 <= -1.0) return 'osteopenia'
  return 'normal'
}

function lowestT(...vals) {
  const valid = vals.filter(v => v != null)
  return valid.length ? Math.min(...valid) : null
}

// T or Z > +4 on any diagnostic sub-region indicates hip prosthesis artifact
function isImplantSide(femur) {
  for (const key of ['Neck', 'Total']) {
    const r = femur[key]
    if (!r) continue
    if ((r.T != null && r.T > 4) || (r.Z != null && r.Z > 4)) return true
  }
  return false
}

function parseRegion(raw) {
  const bmd = parseFloat(raw.bmd)
  if (isNaN(bmd) || bmd === 0) return undefined
  return {
    bmd,
    bmc:  raw.bmc  != null ? parseFloat(raw.bmc)  || undefined : undefined,
    area: raw.area != null ? parseFloat(raw.area) || undefined : undefined,
    T:    raw.T    != null ? parseFloat(raw.T)    ?? undefined : undefined,
    Z:    raw.Z    != null ? parseFloat(raw.Z)    ?? undefined : undefined,
    pYA:  raw.pYA  != null ? parseFloat(raw.pYA)  || undefined : undefined,
  }
}

function parseSpine(raw) {
  const out = {}
  for (const [key, val] of Object.entries(raw || {})) {
    const r = parseRegion(val)
    if (!r) continue
    if (['L1','L2','L3','L4','L1-L4'].includes(key)) out[key] = r
  }
  return out
}

function parseFemur(raw) {
  const out = {}
  for (const [key, val] of Object.entries(raw || {})) {
    const r = parseRegion(val)
    if (!r) continue
    if (['Neck','Trochanter','Wards','Total'].includes(key)) out[key] = r
  }
  return out
}

function parseForearm(raw) {
  const out = {}
  for (const [key, val] of Object.entries(raw || {})) {
    const r = parseRegion(val)
    if (!r) continue
    if (['Distal','Total'].includes(key)) out[key] = r
  }
  return out
}

/**
 * Compute a fully resolved OsteoReportData object from raw MDB/XPS data.
 *
 * @param {object} raw          - RawOsteoData (patient + session)
 * @param {string} patientId    - MRN or display ID
 * @param {string} imageBaseUrl - Base URL for image assets (used when not pulling from Storage)
 * @returns {object}            - OsteoReportData
 */
export function computeOsteoData(raw, patientId, imageBaseUrl) {
  const { patient: pat, session } = raw

  const scanDt   = new Date(session.scan_date)
  const scanDate = scanDt.toISOString().slice(0, 10)
  const scanTime = session.scan_date.slice(11, 19)

  const dob    = pat.dob ? new Date(pat.dob) : null
  const ageYrs = dob
    ? parseFloat(((scanDt.getTime() - dob.getTime()) / 31557600000).toFixed(1))
    : 0
  const gender       = pat.gender || 'Female'
  const premenopausal = gender.toLowerCase().startsWith('f') && ageYrs < 50

  const spine       = parseSpine(session.spine)
  const left_femur  = parseFemur(session.left_femur)
  const right_femur = parseFemur(session.right_femur)
  const left_forearm  = parseForearm(session.left_forearm)
  const right_forearm = parseForearm(session.right_forearm)

  const spineTotal = spine['L1-L4']
  const spine_t    = spineTotal?.T ?? null
  const spine_z    = spineTotal?.Z ?? null

  const left_neck_t  = left_femur.Neck?.T  ?? null
  const right_neck_t = right_femur.Neck?.T ?? null

  const left_implant  = isImplantSide(left_femur)
  const right_implant = isImplantSide(right_femur)

  // ISCD: lowest of Femoral Neck and Total Hip; exclude implant sides
  const leftHipT  = left_implant  ? null : lowestT(left_femur.Total?.T, left_neck_t)
  const rightHipT = right_implant ? null : lowestT(right_femur.Total?.T, right_neck_t)
  const lowest_hip_t = lowestT(leftHipT, rightHipT)

  // Bilateral = both sides present and display-equal to 1 dp
  const hip_bilateral =
    leftHipT != null && rightHipT != null &&
    leftHipT.toFixed(1) === rightHipT.toFixed(1)

  const lowest_hip_side =
    leftHipT == null && rightHipT == null ? null
    : leftHipT == null  ? 'right'
    : rightHipT == null ? 'left'
    : leftHipT <= rightHipT ? 'left' : 'right'

  const lowestFemur = lowest_hip_side === 'right' ? right_femur : left_femur
  const lowest_hip_z = lowestFemur?.Total?.Z ?? lowestFemur?.Neck?.Z ?? null

  // Which site (neck or total) is driving the ISCD T-score on the diagnostic side
  let lowest_hip_site = null
  if (lowestFemur && !left_implant && !right_implant) {
    const neckT  = lowestFemur.Neck?.T  ?? null
    const totalT = lowestFemur.Total?.T ?? null
    if (neckT != null && totalT != null) lowest_hip_site = neckT <= totalT ? 'neck' : 'total'
    else if (neckT  != null) lowest_hip_site = 'neck'
    else if (totalT != null) lowest_hip_site = 'total'
  }

  const overall_t     = lowestT(spine_t, leftHipT, rightHipT)
  const overall_class = classify(overall_t)

  const bmi = pat.height_cm > 0
    ? parseFloat((pat.weight_kg / (pat.height_cm / 100) ** 2).toFixed(1))
    : (pat.bmi ?? 0)

  // Estimated body composition from MDB (GE Lunar AP Spine + Femur analysis).
  // GE Lunar derives a rough fat/lean estimate from the AP Spine + Femur scan —
  // useful for comparison against a true Total Body scan.
  //
  // The MDB session is now scoped to the osteo scan's img_handle by
  // build_raw_osteo_json(), so this should only contain osteo-estimated values.
  // Values are fat_pct / android_fat_pct / gynoid_fat_pct — no true mass in grams.
  const compRaw  = session.estimated_composition || {}
  const totalComp = compRaw.Total ?? null

  const estimated_composition = totalComp ? {
    fat_pct:         totalComp.fat_pct ?? null,
    fat_kg:          null,    // osteo estimated gives percentages only, not true mass
    lean_kg:         null,
    fmi:             null,
    lmi:             null,
    android_fat_pct: compRaw.Android?.fat_pct ?? null,
    gynoid_fat_pct:  compRaw.Gynoid?.fat_pct  ?? null,
    is_estimated:    true,
  } : null

  return {
    patient: {
      id:         patientId,
      name:       `${pat.name} ${pat.title}`.trim(),
      first_name: pat.name,
      last_name:  pat.title,
      gender,
      age:        ageYrs,
      dob_str:    pat.dob || '',
      height_cm:  pat.height_cm,
      weight_kg:  pat.weight_kg,
      bmi,
      physician:  pat.physician || '',
      scan_date:  scanDate,
      scan_time:  scanTime,
      scanner:    session.scanner_serial || '',
      software:   session.software || '',
    },
    spine,
    left_femur,
    right_femur,
    left_forearm,
    right_forearm,
    estimated_composition,
    summary: {
      spine_t,
      spine_z,
      spine_class: classify(spine_t),
      left_neck_t,
      right_neck_t,
      lowest_hip_t,
      lowest_hip_z,
      lowest_hip_side,
      lowest_hip_site,
      hip_bilateral,
      overall_class,
      premenopausal,
      left_implant,
      right_implant,
    },
    images: {
      spine_url:       imageBaseUrl ? `${imageBaseUrl}/img_spine.png`       : '',
      left_femur_url:  imageBaseUrl ? `${imageBaseUrl}/img_left_femur.png`  : '',
      right_femur_url: imageBaseUrl ? `${imageBaseUrl}/img_right_femur.png` : '',
    },
  }
}
