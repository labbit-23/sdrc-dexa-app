/**
 * Labit × SDRC brand theme
 * Single source of truth for colours and shared toolbar/logo styles.
 * Import named exports — never hard-code hex values in page files.
 */

// ── Colour palette ────────────────────────────────────────────────────────────
export const C = {
  // Labit brand
  teal:          '#0D7377',
  tealLight:     '#14a8ae',
  navy:          '#0D1B2A',
  navyMid:       '#0f2235',
  border:        '#1a3a55',
  textMuted:     '#4a7a99',
  textDim:       '#718096',

  // Section accents
  purple:        '#5b21b6',   // DICOM
  purpleBorder:  '#7c3aed',
  blue:          '#1565c0',   // Data collector card

  // Status
  green:         '#2E7D32',
  greenPastel:   '#1a5c2a',
  greenText:     '#4ade80',
  amber:         '#E65100',
  red:           '#B71C1C',
  waGreen:       '#1a5c2a',

  // Neutrals
  white:         '#FFFFFF',
  gray:          '#9E9E9E',
  lt:            '#B0BEC5',
}

// ── Shared toolbar styles ─────────────────────────────────────────────────────
/** Dark navy toolbar — used on all print/report preview pages */
export const darkToolbar = {
  height: 48,
  background: C.navyMid,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '0 16px',
  flexShrink: 0,
  borderBottom: `1px solid ${C.border}`,
}

/** Teal toolbar — used on hub, list, and data collector pages */
export const tealToolbar = {
  height: 52,
  background: C.teal,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 20px',
  flexShrink: 0,
}

/** Purple toolbar — DICOM dashboard */
export const purpleToolbar = {
  height: 44,
  background: C.purple,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 16px',
  flexShrink: 0,
  borderBottom: `1px solid ${C.purpleBorder}`,
}

// ── Page wrapper ──────────────────────────────────────────────────────────────
export const darkPage = {
  position: 'fixed',
  inset: 0,
  background: C.navy,
  display: 'flex',
  flexDirection: 'column',
  fontFamily: 'system-ui, sans-serif',
}

export const lightPage = {
  minHeight: '100vh',
  background: '#f0f4f8',
  fontFamily: 'system-ui, sans-serif',
}

// ── Logo styles ───────────────────────────────────────────────────────────────
/** SDRC logo — white pill, works on any coloured toolbar */
export const sdrcLogoStyle = {
  height: 28,
  width: 'auto',
  background: 'rgba(255,255,255,0.92)',
  borderRadius: 4,
  padding: '2px 6px',
  display: 'block',
}

/** Labit inverted logo — on dark/coloured toolbars */
export const labitInvertedStyle = {
  height: 22,
  width: 'auto',
  display: 'block',
}

/** Labit light logo — on dark toolbars, shown in a white box */
export const labitLightBoxStyle = {
  height: 26,
  width: 'auto',
  background: C.white,
  borderRadius: 6,
  padding: '3px 8px',
  display: 'block',
}

/** Labit light logo — on teal toolbars, no box needed (white bg is visible) */
export const labitLightStyle = {
  height: 32,
  background: C.white,
  borderRadius: 6,
  padding: '4px 10px',
  objectFit: 'contain',
  objectPosition: 'left center',
  width: 110,
  display: 'block',
}

// ── Common button / nav styles ────────────────────────────────────────────────
/** Ghost pill button — used in toolbars on coloured backgrounds */
export const glassBtn = {
  background: 'rgba(255,255,255,0.12)',
  color: C.white,
  textDecoration: 'none',
  padding: '5px 14px',
  borderRadius: 5,
  fontSize: 12,
  fontWeight: 600,
  border: '1px solid rgba(255,255,255,0.2)',
  cursor: 'pointer',
}

/** Toolbar text separator — label after the logos */
export const toolbarLabel = (color = C.textMuted) => ({
  fontSize: 11,
  color,
  borderLeft: `1px solid ${C.border}`,
  paddingLeft: 8,
})

/** Small teal nav link */
export const tealNavBtn = {
  background: 'rgba(255,255,255,0.15)',
  color: C.white,
  textDecoration: 'none',
  padding: '6px 14px',
  borderRadius: 5,
  fontSize: 12,
  fontWeight: 600,
  border: '1px solid rgba(255,255,255,0.25)',
}
