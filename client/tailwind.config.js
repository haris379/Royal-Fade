/** @type {import('tailwindcss').Config} */
// Design system taken from the supplied references: warm charcoal + white sections, one amber accent, one sans-serif.
// (Token names are kept from the first version so the booking and dashboard pages pick up the new palette.)
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#1c1917', 900: '#0c0a09', 800: '#161311', 700: '#1c1917' },   // blacks / dark sections
        char: { 900: '#221e1c', 800: '#2a2522', 700: '#38322f', 600: '#4d4641', 500: '#6b645d' }, // dark surfaces + borders
        gold: { 200: '#fde3b0', 300: '#fbbf6a', 400: '#f9a93b', 500: '#f7941d', 600: '#d97706', 700: '#b45309' }, // the amber accent
        cream: { 50: '#ffffff', 100: '#f5f5f4', 200: '#e7e5e4', 300: '#d6d3d1' },       // text on dark / light surfaces
        smoke: { 300: '#d0cbc5', 400: '#a8a29e', 500: '#78716c' },                      // secondary text
        paper: '#fafaf9',                                                               // page background for light sections
      },
      fontFamily: {
        display: ['"Manrope Variable"', 'Manrope', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'Arial', 'sans-serif'],
        sans: ['"Manrope Variable"', 'Manrope', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'Arial', 'sans-serif'],
      },
      boxShadow: { card: '0 1px 3px rgba(0,0,0,.08), 0 8px 24px -12px rgba(0,0,0,.15)' },
    },
  },
  plugins: [],
};
