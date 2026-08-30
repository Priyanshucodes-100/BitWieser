export const THEME = {
  ink: '#000000',
  ink900: '#141414',
  ink800: '#262626',
  ink700: '#333333',
  navy: '#141414',
  navy600: '#262626',
  crimson: '#FFB4B4',
  crimsonBright: '#FFB4B4',
  teal: '#A8A8A8',
  teal400: '#F5F5F5',
  beige: '#F5F5F5',
  beigeDim: '#A8A8A8',
  lead: '#F5D98A',
  cream: '#000000',
  text: '#F5F5F5',
} as const

/** WCAG 2.0 AA palette. CSS variables in src/index.css are the source of truth. */
export const PALETTE = {
  dark: {
    bg: '#000000',
    fg: '#F5F5F5',
    muted: '#A8A8A8',
    panel: '#141414',
    raised: '#262626',
    border: '#8A8A8A',
    primary: '#E8E8E8',
    primaryFg: '#000000',
    primaryHover: '#D4D4D4',
    danger: '#FFB4B4',
    dangerBg: '#3B1414',
    warn: '#F5D98A',
    warnBg: '#3A2F12',
    ok: '#A8E6C5',
    okBg: '#143326',
    focus: '#F5F5F5',
    track: '#848484',
  },
  light: {
    bg: '#FFFFFF',
    fg: '#0A0A0A',
    muted: '#575757',
    panel: '#FFFFFF',
    raised: '#F0F0F0',
    border: '#767676',
    primary: '#0A0A0A',
    primaryFg: '#FFFFFF',
    primaryHover: '#171717',
    danger: '#7F1D1D',
    dangerBg: '#FEE2E2',
    warn: '#713F12',
    warnBg: '#FEF3C7',
    ok: '#14532D',
    okBg: '#DCFCE7',
    focus: '#0A0A0A',
    track: '#767676',
  },
} as const

export const DISCLAIMERS = [
  'Offline — synthetic data',
  'IP is first-seen peer, not identity',
  'No live-intercept or seized data',
] as const

export const BANNER_COPY = 'Synthetic data. IP ≠ identity. Leads, not proof.'

export const CASE_NAME = 'RansomPay'
export const DATASET_NAME = 'RansomPay synthetic capture'
export const SIH_ID = '26146'
export const TARGET_EVENT_COUNT = 128
