module.exports = {
  content: [
    "./pages/*.{html,js}",
    "./index.html",
    "./src/**/*.{html,js,jsx,ts,tsx}",
    "./components/**/*.{html,js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#F5F5FF", // deep-purple-50
          100: "#E8E8FF", // deep-purple-100
          200: "#D1D1FF", // deep-purple-200
          300: "#B3B3FF", // deep-purple-300
          400: "#8A8AFF", // deep-purple-400
          500: "#6B6BCC", // deep-purple-500
          600: "#5A5AAA", // deep-purple-600
          700: "#4A4A8A", // deep-purple-700
          800: "#3A3A6A", // deep-purple-800
          900: "#2A2A4A", // deep-purple-900
          DEFAULT: "#4A4A8A", // deep-purple-700
        },
        secondary: {
          50: "#F0F1FF", // purple-blue-50
          100: "#E0E3FF", // purple-blue-100
          200: "#C7CCFF", // purple-blue-200
          300: "#A8B0FF", // purple-blue-300
          400: "#8991FF", // purple-blue-400
          500: "#6B73FF", // purple-blue-500
          600: "#5A62E6", // purple-blue-600
          700: "#4A52CC", // purple-blue-700
          800: "#3A42B3", // purple-blue-800
          900: "#2A3299", // purple-blue-900
          DEFAULT: "#6B73FF", // purple-blue-500
        },
        accent: {
          50: "#F0FDFF", // cyan-50
          100: "#E0FAFF", // cyan-100
          200: "#BAF3FF", // cyan-200
          300: "#7EEBFF", // cyan-300
          400: "#00D4FF", // cyan-400
          500: "#00B8E6", // cyan-500
          600: "#009CCC", // cyan-600
          700: "#0080B3", // cyan-700
          800: "#006499", // cyan-800
          900: "#004880", // cyan-900
          DEFAULT: "#00D4FF", // cyan-400
        },
        background: "#FAFBFC", // gray-50
        surface: "#FFFFFF", // white
        text: {
          primary: "#1A1D29", // gray-900
          secondary: "#6B7280", // gray-500
        },
        success: {
          50: "#ECFDF5", // emerald-50
          100: "#D1FAE5", // emerald-100
          500: "#10B981", // emerald-500
          600: "#059669", // emerald-600
          DEFAULT: "#10B981", // emerald-500
        },
        warning: {
          50: "#FFFBEB", // amber-50
          100: "#FEF3C7", // amber-100
          500: "#F59E0B", // amber-500
          600: "#D97706", // amber-600
          DEFAULT: "#F59E0B", // amber-500
        },
        error: {
          50: "#FEF2F2", // red-50
          100: "#FEE2E2", // red-100
          500: "#EF4444", // red-500
          600: "#DC2626", // red-600
          DEFAULT: "#EF4444", // red-500
        },
        border: {
          DEFAULT: "#E5E7EB", // gray-200
          light: "rgba(229, 231, 235, 1)", // gray-200
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
        data: ['JetBrains Mono', 'monospace'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
      },
      fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      },
      boxShadow: {
        'custom': '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
        'custom-md': '0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.06)',
        'custom-lg': '0 10px 25px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
        'custom-xl': '0 20px 40px rgba(0, 0, 0, 0.1), 0 8px 16px rgba(0, 0, 0, 0.06)',
      },
      borderRadius: {
        'none': '0',
        'sm': '0.125rem',
        DEFAULT: '0.25rem',
        'md': '0.375rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        'full': '9999px',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      transitionDuration: {
        '150': '150ms',
        '200': '200ms',
        '300': '300ms',
      },
      transitionTimingFunction: {
        'ease-out': 'ease-out',
        'custom': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'loading': 'loading 1.5s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        loading: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },
    },
  },
  plugins: [
    function({ addUtilities }) {
      const newUtilities = {
        '.text-gradient': {
          background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          'background-clip': 'text',
        },
        '.border-gradient': {
          border: '1px solid',
          'border-image': 'linear-gradient(135deg, var(--color-primary), var(--color-secondary)) 1',
        },
        '.transition-custom': {
          transition: 'all 200ms ease-out',
        },
        '.transition-fast': {
          transition: 'all 150ms ease-out',
        },
        '.transition-slow': {
          transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        },
      }
      addUtilities(newUtilities)
    }
  ],
}