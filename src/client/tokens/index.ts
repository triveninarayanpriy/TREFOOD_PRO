/**
 * TreFood Design System v2 Tokens
 * Strict tokens adhering to:
 * - Spacing: 4, 8, 12, 16, 24, 32, 48, 72, 96
 * - Radius: 8, 12, 20, pill
 * - Typography (Desktop / Mobile): Display 64/40, H1 44/30, H2 32/24, H3 22/18, Body 17/16, Small 14/13 (Min 13px)
 * - Colours: warm paper #FBF6EE, surface #FFFFFF, ink #1C1210, muted #6B5B54, maroon #830020, amber #FFB400
 * - Motion: 150ms hovers/presses, 250ms sheets/panels, 400ms page transitions
 */

export const SPACING = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 24,
  6: 32,
  7: 48,
  8: 72,
  9: 96,
} as const;

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 20,
  pill: 9999,
} as const;

export const BREAKPOINTS = {
  mobileMax: 767,
  desktopMin: 768,
  desktopStandard: 1280,
  desktopWide: 1440,
} as const;

export const COLORS = {
  paper: '#FBF6EE',
  surface: '#FFFFFF',
  ink: '#1C1210',
  muted: '#6B5B54',
  maroon: '#830020',
  maroonHover: '#69001A',
  amber: '#FFB400',
  amberHover: '#E5A100',
  dark: {
    paper: '#140D0B',
    surface: '#1E1412',
    surfaceRaised: '#2A1C18',
    ink: '#FBF6EE',
    muted: '#D4C5BC',
    border: '#3D2A24',
  },
} as const;

export const MOTION = {
  fast: 150, // hovers, presses
  medium: 250, // sheets, panels, modals
  slow: 400, // page transitions
  easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
} as const;

export const TYPE_SCALE = {
  desktop: {
    display: { size: 64, line: 72, weight: 800 },
    h1: { size: 44, line: 52, weight: 700 },
    h2: { size: 32, line: 40, weight: 700 },
    h3: { size: 22, line: 28, weight: 600 },
    body: { size: 17, line: 26, weight: 400 },
    small: { size: 14, line: 20, weight: 500 },
  },
  mobile: {
    display: { size: 40, line: 48, weight: 800 },
    h1: { size: 30, line: 36, weight: 700 },
    h2: { size: 24, line: 30, weight: 700 },
    h3: { size: 18, line: 24, weight: 600 },
    body: { size: 16, line: 24, weight: 400 },
    small: { size: 13, line: 18, weight: 500 },
  },
} as const;
