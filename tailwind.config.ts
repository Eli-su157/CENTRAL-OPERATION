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
        // ── Acento único de marca ──────────────────────────────────────
        brand: {
          DEFAULT: '#f97316',   // orange-500
          hover:   '#ea6c0a',   // orange-600
          dim:     '#c2510c',   // more muted hover for inline links
          soft:    'rgba(249,115,22,0.10)',
          border:  'rgba(249,115,22,0.20)',
          glow:    'rgba(249,115,22,0.12)',
        },
        // ── Superfícies (preto terminal) ───────────────────────────────
        // base: #0A0A0A, surface1: #0D0D0D, surface2: #111111, surface3: #161616
        surface: {
          DEFAULT: '#111111',     // cards base
          elevated: '#161616',    // inputs, elevated cards
          overlay:  '#1a1a1a',    // modal backgrounds
          border:   'rgba(255,255,255,0.06)',
        },
      },
      boxShadow: {
        'card':       '0 1px 3px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.4)',
        'card-hover': '0 6px 24px rgba(0,0,0,0.6)',
        'glow-orange': '0 0 20px rgba(249,115,22,0.12)',
        'glow-emerald': '0 0 20px rgba(52,211,153,0.08)',
        'glow-red':    '0 0 20px rgba(248,113,113,0.08)',
      },
      backgroundImage: {
        'gradient-card': 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 100%)',
        'gradient-subtle': 'linear-gradient(180deg, #1a1a1a 0%, #111111 100%)',
        'gradient-orange': 'linear-gradient(135deg, #f97316 0%, #ea6c0a 100%)',
      },
      fontFamily: {
        // Adiciona fonte mono para números de terminal
        mono: ['ui-monospace', 'SFMono-Regular', 'SF Mono', 'Menlo', 'Consolas', 'monospace'],
      },
      letterSpacing: {
        'tighter-num': '-0.025em', // KPI numbers — leitura mais rápida
        'terminal':    '0.025em',  // labels uppercase estilo terminal
        'wide-label':  '0.12em',
      },
      animation: {
        'fade-in':  'fadeIn 0.15s ease-out',
        'slide-up': 'slideUp 0.15s ease-out',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(3px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
};

export default config;
