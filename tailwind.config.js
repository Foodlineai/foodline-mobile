/** @type {import('tailwindcss').Config} */
// v3: colours come from src/theme/tokens.ts, the single source of truth — see
// that file's own header. Do not paste a hex in here; if a value is missing,
// add it in tokens.ts and say why. Key *names* below stay as the app's existing
// screens already reference them (`brand.border`, `ink.faint`, `surface.line`);
// only the numbers are new, sourced from tokens.ts instead of hand-picked.
const { colors: t, radius: tokenRadius } = require('./src/theme/tokens');

module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: t.brand.DEFAULT,
          pressed: t.brand.pressed,
          tint: t.brand.tint,
          // Not in tokens.ts (that file uses `lift`/gradient stops instead of a
          // flat tint-border); kept as-is, still used for outlined UI.
          border: '#D6E2FB',
          light: t.brand.lift,
        },
        ink: {
          DEFAULT: t.ink.DEFAULT,
          muted: t.ink.muted,
          faint: t.ink.disabled,
        },
        surface: {
          DEFAULT: t.surface.DEFAULT,
          card: t.surface.card,
          line: t.hairline.DEFAULT,
        },
        hairline: t.hairline,
        warn: { DEFAULT: t.warn.DEFAULT, tint: t.warn.tint, border: t.warn.line },
        danger: { DEFAULT: t.danger.DEFAULT, tint: t.danger.tint },
        // Renamed from this app's old `good` to tokens.ts's `ok` — one name,
        // one place. The only two usages (StatusPill, COLORS.ok) were both
        // updated in the same commit as this config.
        ok: t.ok,
        ai: t.ai,
        info: t.info,
      },
      borderRadius: {
        input: `${tokenRadius.input}px`,
        card: `${tokenRadius.card}px`,
        sheet: `${tokenRadius.sheet}px`,
      },
    },
  },
  plugins: [],
};
