/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#9a7520',
          light: '#c9a96e',
        }
      }
    }
  },
  plugins: []
}
