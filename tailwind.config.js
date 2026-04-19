/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: '#0A0E1A',
        'deep-black': '#020202',
        rcb: '#CC0000',
        dc: '#004C97',
        gold: '#FFD700',
        'neon-red': '#FF2A2A',
        'neon-green': '#00FF66',
        'neon-blue': '#00BFFF',
      },
      fontFamily: {
        bebas: ['"Bebas Neue"', 'sans-serif'],
        rajdhani: ['Rajdhani', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
