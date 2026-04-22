/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#E6F7FB',
          100: '#B3E8F2',
          200: '#80D9E9',
          300: '#4DC9E0',
          400: '#26BFDB',
          500: '#00B4D8',
          600: '#009DBF',
          700: '#0077B6',
          800: '#005A8C',
          900: '#023E8A',
        },
        dark: {
          50: '#F9FAFB',
          100: '#D1D5DB',
          200: '#9CA3AF',
          300: '#6B7280',
          400: '#4B5563',
          500: '#374151',
          600: '#1F2937',
          700: '#111827',
          800: '#0A0E1A',
          900: '#050709',
        },
        functional: {
          success: '#10B981',
          danger: '#EF4444',
          warning: '#F59E0B',
          info: '#6366F1',
        },
      },
      fontFamily: {
        sans: ['PingFang-SC', 'Microsoft YaHei', 'sans-serif'],
      },
      fontSize: {
        heading: ['20px', { fontWeight: '600' }],
        subheading: ['14px', { fontWeight: '500' }],
        body: ['13px', { fontWeight: '400' }],
      },
    },
  },
  plugins: [],
};
