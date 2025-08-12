// twrnc.config.js
/** @type {import('tailwindcss-react-native').TailwindConfig} */
module.exports = {
  theme: {
    extend: {
      colors: {
        // existing
        primary: '#A259FF',
        secondary: '#8B30FF',
        plum: '#2A1E5C',
        softPink: '#FF70A6',
        softGray: '#FDF7F3',
        mutedGray: '#A8A6B8',
        darkText: '#333333',
        gold: '#FFD700',

        // light theme
        lightBg: '#ffffff',
        lightCard: '#F7F7FA',
        lightElevated: '#F0F1F5',
        lightBorder: '#E5E7EB',
        lightText: '#111827',
        lightSecondary: '#6B7280',

        // dark theme (from your FindTutorScreen palette)
        darkBg: '#111418',
        darkCard: '#1a1f24',
        darkElevated: '#283039',
        darkBorder: '#2a333d',
        darkPlaceholder: '#9caaba',
      },
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
        display: ['Montserrat', 'sans-serif'],

        // weights as separate families
        'sans-semibold': ['Poppins-SemiBold'],
        'sans-bold': ['Poppins-Bold'],
        'display-semibold': ['Montserrat-SemiBold'],
        'display-bold': ['Montserrat-Bold'],
        
      },
      boxShadow: {
        soft: '0 4px 8px rgba(162, 89, 255, 0.3)',
      },
      borderRadius: {
        lg: '12px',
      },
    },
  },
}
