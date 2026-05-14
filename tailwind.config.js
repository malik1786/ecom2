/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-gold': '#e6c479',
        'perfume-gold': '#e6c479',
        'gold-deep': '#b08d41',
        'gold-light': '#f3e5c2',
        'velvet': '#673147',
        'surface': '#131313',
        'surface-container': '#201f1f',
        'surface-container-low': '#1c1b1b',
        'surface-container-high': '#2a2a2a',
        'surface-container-lowest': '#131313',
        'on-surface': '#e5e2e1',
        'on-surface-variant': '#d0c5b4',
        'outline': '#999080',
        'outline-variant': '#4d4639',
        'primary-container': '#c9a961',
        'on-primary-container': '#533d00',
        'tertiary-container': '#d3a473',
        'on-tertiary-container': '#5a3a12',
        'bg-primary': '#131313',
        'primary': '#e6c479',
        'secondary': '#ecc165',
        'tertiary': '#f1bf8c',
      },
      fontFamily: {
        'sans':      ['Outfit', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        'display':   ['"Playfair Display"', 'Georgia', 'serif'],
        'body':      ['Outfit', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        'headline':  ['"Playfair Display"', 'Georgia', 'serif'],
        'label':     ['Outfit', 'ui-sans-serif', 'sans-serif'],
        'cinzel':    ['Cinzel', 'Georgia', 'serif'],
        'cormorant': ['"Cormorant Garamond"', 'Georgia', 'serif'],
      },
      spacing: {
        'unit': '8px',
        'gutter': '24px',
        'container-max': '1440px',
        'margin-desktop': '80px',
        'margin-mobile': '20px',
        'section-gap': '120px',
      },
      boxShadow: {
        'rim': 'inset 1px 1px 0px 0px rgba(139, 105, 20, 0.5), 0 0 15px 0px rgba(139, 105, 20, 0.2)',
        'gold-glow': '0 0 28px rgba(230, 196, 121, 0.28)'
      }
    },
  },
  plugins: [],
}
