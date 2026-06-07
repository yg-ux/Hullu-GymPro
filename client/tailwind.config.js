/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        gym: {
          50:  'rgb(var(--gym-50-rgb)  / <alpha-value>)',
          100: 'rgb(var(--gym-100-rgb) / <alpha-value>)',
          200: 'rgb(var(--gym-200-rgb) / <alpha-value>)',
          300: 'rgb(var(--gym-300-rgb) / <alpha-value>)',
          400: 'rgb(var(--gym-400-rgb) / <alpha-value>)',
          500: 'rgb(var(--gym-500-rgb) / <alpha-value>)',
          600: 'rgb(var(--gym-600-rgb) / <alpha-value>)',
          700: 'rgb(var(--gym-700-rgb) / <alpha-value>)',
          800: 'rgb(var(--gym-800-rgb) / <alpha-value>)',
          900: 'rgb(var(--gym-900-rgb) / <alpha-value>)',
        },
        dark: {
          100: '#1e293b',
          200: '#0f172a',
          300: '#0c1222',
          400: '#080e19',
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
