/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#0052CC",
        secondary: "#0EA5E9",
        plum: "#0F172A",
        softPink: "#F97316",
        softGray: "#F8FAFC",
        mutedGray: "#A8A6B8",
        darkText: "#333333",
        gold: "#F97316",
        success: "#10B981",
      },
      fontFamily: {
        sans: ["Inter", "DM Sans", "Poppins", "sans-serif"],
        display: ["Poppins", "Inter", "sans-serif"],
      },
      boxShadow: {
        soft: "0 4px 14px rgba(0, 82, 204, 0.18)",
      },
      borderRadius: {
        lg: "12px",
      },
    },
  },
  plugins: [],
};
