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
        // ── Hierarquia de texto ────────────────────────────────────────
        // Piso mínimo: #71717A. Nunca usar cinza abaixo disso para texto.
        text: {
          primary:   '#FFFFFF',  // títulos, valores de KPI
          secondary: '#A1A1AA',  // descrições, subtítulos
          tertiary:  '#71717A',  // labels, texto de apoio — piso mínimo
        },
        // ── Acento único de marca ──────────────────────────────────────
        brand: {
          DEFAULT: '#f97316',   // orange-500
          hover:   '#ea6c0a',   // orange-600
          dim:     '#c2510c',   // more muted hover for inline links
          soft:    'rgba(249,115,22,0.10)',
          border:  'rgba(249,115,22,0.20)',
          glow:    'rgba(249,115,22,0.12)',
        },
        // ── Superfícies — sistema 3 camadas ───────────────────────────
        // layer0: #09090B (fundo), layer1: #121214 (nav/sidebar), layer2: #18181B (cards)
        surface: {
          DEFAULT: '#18181B',     // camada 2 — cards / containers
          nav:     '#121214',     // camada 1 — sidebar / barras de navegação
          elevated: '#18181B',    // camada 2 — mantido por compatibilidade
          overlay:  '#121214',    // camada 1 — modal backgrounds
          border:   '#27272A',    // borda padrão de cards (camada 2)
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
