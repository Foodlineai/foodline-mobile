/**
 * Design tokens — the single source of truth.
 *
 * `tailwind.config.js` imports from this file, so there is exactly one place a
 * colour is defined. Do not hand-pick a hex anywhere else in the app; if a value
 * is missing here, add it here and say why.
 *
 * The `brand`, `ink`, `surface` and `warn` families were sampled from the
 * approved mockups (Foodline-Mobile-01..05) and must not be changed without
 * re-sampling. The `ai`, `ok`, `danger` and `info` families are new — see
 * contracts/design.md §1 — and their values are proposals to be checked against
 * the 28 Sep renders before this lands on main.
 */

export const colors = {
  // ── Sampled from the approved mockups. Do not edit without re-sampling. ──
  brand: {
    DEFAULT: '#3B65ED',
    pressed: '#1D47E5',
    tint: '#EAF1FD',
    /** Lightened top stop for the 3D gradient. Derived, not sampled. */
    lift: '#5478F0',
  },
  ink: {
    DEFAULT: '#0B1020',
    muted: '#475776',
    subtle: '#6B7894',
    disabled: '#96A8CE',
  },
  surface: {
    DEFAULT: '#F7FAFD',
    card: '#FFFFFF',
    /** Bottom stop of the card gradient. */
    cardFoot: '#FBFCFE',
    raised: '#F6F9FD',
  },
  hairline: {
    DEFAULT: '#DDE4F0',
    soft: '#EEF3FC',
  },
  warn: {
    DEFAULT: '#A2680E',
    ink: '#7A4E07',
    tint: '#FEF4D9',
    line: '#F3D9A9',
  },

  // ── New. Proposals — verify against design/reference/ before merging. ──

  /**
   * Foodline AI Indigo. Means "a machine authored this" and nothing else.
   * Never use it for an ordinary action, however much it suits the layout.
   */
  ai: {
    DEFAULT: '#4953E4',
    deep: '#1A40DA',
    tint: '#E7E9FD',
    line: '#C7CBFA',
    /**
     * Awaiting human approval. The approval gate is the product's central
     * commercial claim and needs a colour of its own.
     */
    pending: '#3B45DC',
  },
  ok: {
    DEFAULT: '#256D32',
    tint: '#F1F9EC',
    line: '#C2E6B0',
  },
  danger: {
    DEFAULT: '#C62F27',
    tint: '#FDF0EF',
    line: '#F3C6C3',
  },
  info: {
    DEFAULT: '#1D4FA8',
    tint: '#EDF3FE',
    line: '#C9D9F7',
  },
} as const;

export const radius = {
  input: 10,
  card: 14,
  sheet: 28,
  pill: 999,
} as const;

export const space = {
  screen: 18,
  gap: 12,
  gapLoose: 14,
  row: 16,
  /** Minimum tap target. Never go below this. */
  tap: 44,
} as const;

/**
 * TODO(fonts): the ERP standardised on Plus Jakarta Sans. Mobile has not been
 * confirmed. Until it is, weight carries the hierarchy and these stay undefined
 * so the platform default is used — which is legible everywhere and wrong
 * nowhere. Do not import a font family on a guess.
 */
export const type = {
  title: { fontSize: 28, lineHeight: 34, fontWeight: '600' },
  titleSm: { fontSize: 24, lineHeight: 30, fontWeight: '600' },
  section: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 14, lineHeight: 21, fontWeight: '400' },
  bodyStrong: { fontSize: 14, lineHeight: 21, fontWeight: '600' },
  small: { fontSize: 12, lineHeight: 18, fontWeight: '400' },
  overline: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  figure: { fontSize: 30, lineHeight: 36, fontWeight: '600' },
} as const;

/** SO/PO numbers, lot codes, bin codes. Anything read aloud or typed back. */
export const mono = {
  fontFamily: undefined as string | undefined, // platform default monospace
  fontVariant: ['tabular-nums'] as const,
};
