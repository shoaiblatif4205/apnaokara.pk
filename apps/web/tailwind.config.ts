import type { Config } from 'tailwindcss';

// Colours match packages/shared/src/brand.ts
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#15803D',
          dark: '#166534',
          light: '#DCFCE7',
        },
        accent: {
          DEFAULT: '#C2410C',
          bright: '#F97316',
          light: '#FFEDD5',
        },
        ink: {
          DEFAULT: '#1F2937',
          muted: '#4B5563',
        },
        line: '#E5E7EB',
        page: '#F9FAFB',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        urdu: ['var(--font-urdu)', 'serif'],
      },
      maxWidth: {
        site: '1240px',
      },
    },
  },
  plugins: [],
};

export default config;
