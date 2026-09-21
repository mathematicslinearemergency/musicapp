/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0a0a0b',
          900: '#0f0f12',
          850: '#141418',
          800: '#1a1a20',
          750: '#22222a',
          700: '#2a2a33',
          600: '#3a3a45',
          500: '#52525e',
        },
        brand: {
          50: '#eefcf6',
          100: '#d6f7e8',
          200: '#aeedcf',
          300: '#78dcb0',
          400: '#3fc288',
          500: '#16a872',
          600: '#0c875b',
          700: '#0b6b4a',
          800: '#0c553c',
          900: '#0c4632',
        },
        accent: {
          400: '#f5a524',
          500: '#ec8e0a',
          600: '#d4790a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Clash Display"', 'Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.35s cubic-bezier(0.16,1,0.3,1)',
        'scale-in': 'scaleIn 0.2s ease-out',
        'spin-slow': 'spin 3s linear infinite',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'equalize': 'equalize 1s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        equalize: {
          '0%, 100%': { height: '20%' },
          '50%': { height: '100%' },
        },
      },
    },
  },
  plugins: [],
};
