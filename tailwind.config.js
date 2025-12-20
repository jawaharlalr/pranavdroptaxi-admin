/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        taxi: {
          yellow: '#FFC107', // Standard Taxi Yellow
          black: '#121212',  // Deep Glossy Black
          dark: '#1E1E1E',   // Card Background
          gray: '#2C2C2C',   // Border/Hover
        }
      }
    },
  },
  plugins: [],
}