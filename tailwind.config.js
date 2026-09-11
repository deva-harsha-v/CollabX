/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: '#0f172a',
        light: '#f8fafc',
        primary: '#0284c7',
        secondary: '#0d9488',
        accent: '#06b6d4',
        cta: '#ef4444',
        'cta-hover': '#dc2626',
      },
      fontFamily: {
        heading: ['Outfit', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      keyframes: {
        float: {
          '0%': { transform: 'translate(0, 0) scale(1)' },
          '100%': { transform: 'translate(50px, 50px) scale(1.2)' },
        }
      },
      animation: {
        float: 'float 20s infinite ease-in-out alternate',
      }
    },
  },
  plugins: [],
}
