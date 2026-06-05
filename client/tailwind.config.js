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
          50: 'var(--gym-50, #f0f9ff)',
          100: 'var(--gym-100, #e0f2fe)',
          200: 'var(--gym-200, #bae6fd)',
          300: 'var(--gym-300, #7dd3fc)',
          400: 'var(--gym-400, #38bdf8)',
          500: 'var(--gym-500, #0ea5e9)',
          600: 'var(--gym-600, #0284c7)',
          700: 'var(--gym-700, #0369a1)',
          800: 'var(--gym-800, #075985)',
          900: 'var(--gym-900, #0c4a6e)',
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
