/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./lib/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#6C63FF",
          50: "#F0EFFF",
          100: "#E0DEFF",
          500: "#6C63FF",
          600: "#5A52E8",
          700: "#4840D1",
        },
        streak: "#FF6B35",
        xp: "#FFD700",
      },
    },
  },
  plugins: [],
};
