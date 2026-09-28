/** @type {import('tailwindcss').Config} */
// Palette sampled directly from the approved mockups
// (Foodline-Mobile-01..05, 22 Sep 2026). Do not hand-pick new colours —
// add them here from the designs so every screen stays in one system.
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#3B65ED',
          pressed: '#1D47E5',
          tint: '#EAF1FD',
          border: '#D6E2FB',
        },
        ink: {
          DEFAULT: '#0B1020',
          muted: '#475776',
          faint: '#8A96AF',
        },
        surface: {
          DEFAULT: '#F7FAFD',
          card: '#FFFFFF',
          line: '#E7EDF5',
        },
        warn: { DEFAULT: '#B7791F', tint: '#FEF4D9', border: '#F5DFA8' },
        danger: { DEFAULT: '#D64545', tint: '#FDECEC' },
        good: { DEFAULT: '#1E8E5A', tint: '#E6F5EE' },
        // Added for the twelve-screen system (contracts/design.md v2 in the
        // cowork repo). Sampled from design/prototype/*.html, not hand-picked —
        // same discipline as the tokens above.
        ai: {
          DEFAULT: '#4953E4',
          deep: '#1A40DA',
          tint: '#E7E9FD',
          // Awaiting human approval — the approval gate's own colour.
          pending: '#3B45DC',
        },
        info: { DEFAULT: '#1D4FA8', tint: '#EDF3FE' },
      },
    },
  },
  plugins: [],
};
