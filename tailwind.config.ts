import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#f97316',
          hover: '#ea6c0a',
          soft: 'rgba(249,115,22,0.12)',
          border: 'rgba(249,115,22,0.25)',
        },
        surface: {
          DEFAULT: '#161616',
          elevated: '#1c1c1c',
          overlay: '#202020',
        },
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
        'card-hover': '0 8px 30px rgba(0,0,0,0.5)',
        'glow-violet': '0 0 20px rgba(124,58,237,0.15)',
        'glow-orange': '0 0 20px rgba(249,115,22,0.15)',
        'glow-emerald': '0 0 20px rgba(52,211,153,0.1)',
        'glow-red': '0 0 20px rgba(248,113,113,0.1)',
        'inner-top': 'inset 0 1px 0 rgba(255,255,255,0.04)',
      },
      backgroundImage: {
        'gradient-card': 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 100%)',
        'gradient-violet': 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
        'gradient-subtle': 'linear-gradient(180deg, #1c1c1c 0%, #161616 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
};

export default config;
