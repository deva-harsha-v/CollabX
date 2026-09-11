/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dusk-base': '#221226',
        'dusk-dark': '#3a1e3e',
        'dusk-card': '#502D55',
        'dusk-mauve': '#935073',
        'dusk-peach': '#F6DBC0',
        'dusk-cream': '#F8F4E9',
      },
      fontFamily: {
        heading: ['Outfit', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
