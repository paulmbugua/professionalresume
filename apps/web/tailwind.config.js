import plugin from 'tailwindcss/plugin'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#A259FF',
        secondary: '#8B30FF',
        plum: '#2A1E5C',
        softPink: '#FF70A6',
        softGray: '#FDF7F3',
        mutedGray: '#A8A6B8',
        darkText: '#333333',
        gold: '#FFD700',
      },
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
        display: ['Montserrat', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 4px 8px rgba(162, 89, 255, 0.3)',
      },
      borderRadius: {
        lg: '12px',
      },
    },
  },
  plugins: [
    // Ensure base font-size is always 16px
    plugin(function ({ addBase }) {
      addBase({
        'html': { fontSize: '100%' },  // 1rem = browser default (16px)
        'body': { fontSize: '1rem' },  // explicitly set body to 16px
      })
    }),
  ],
}
