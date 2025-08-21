/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../../packages/**/*.{js,ts,jsx,tsx}', // shared package scanning
  ],
  theme: {
    extend: {
      colors: {
        primary: '#A259FF',
        secondary: '#8B30FF',
        plum: '#2A1E5C',
        softPink: '#FF70A6',
        softGray: '#FDF7F3',
        mutedGray: '#6E6C7A',
        darkText: '#333333',
        gold: '#FFD700',
        darkBg: '#101a23',
        darkCard: '#223649',
        darkTextPrimary: '#ffffff',
        darkTextSecondary: '#4f6b88', // default (light mode)
      },
      placeholderColor: {
        darkTextSecondary: '#4f6b88', // light mode placeholder
      },
    },
  },
  variants: {
    extend: {
      placeholderColor: ['dark'], // allow dark mode variant
    },
  },
  plugins: [],
};
