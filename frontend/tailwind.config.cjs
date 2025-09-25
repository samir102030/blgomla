/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // New Brand Color Palette
        'sunset-yellow': '#FFD600',
        'midnight-blue': '#002B5B',
        'teal-green': '#009688',
        'crimson-red': '#D32F2F',
        'royal-purple': '#673AB7',
        'charcoal-gray': '#333333',
        'cool-gray': '#9E9E9E',
        'snow-white': '#FAFAFA',

        // Legacy primary colors (keeping for compatibility)
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
