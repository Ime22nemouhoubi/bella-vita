/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Bella Vita palette — royal blue + platinum + soft white.
        // Color NAMES kept from the original (rose/burgundy/gold/cream) so that
        // every component that already uses them picks up the new palette
        // automatically without source-level changes.
        cream: '#f7f8fc',        // soft off-white background
        sand: '#e8ebf5',         // muted blue-gray subtle surface
        rose: {                  // remapped to blue scale
          50:  '#eef1fb',
          100: '#dde3f6',
          200: '#bcc6ee',
          300: '#8e9fe0',
          400: '#5d76cf',
          500: '#3a54bc',
          600: '#2a3fa3',
          700: '#1e2a8c',        // brand royal blue (from logo)
          800: '#17216e',
          900: '#131b55',
        },
        burgundy: '#1e2a8c',     // was dark red — now royal blue (primary)
        gold: '#b8bed1',         // was gold — now platinum/silver
        ink: '#0f1638',          // near-black with blue undertone
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        body: ['"Outfit"', 'system-ui', 'sans-serif'],
        arabic: ['"Tajawal"', 'Cairo', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 8px 30px -12px rgba(30, 42, 140, 0.18)',
      },
    },
  },
  plugins: [],
};
