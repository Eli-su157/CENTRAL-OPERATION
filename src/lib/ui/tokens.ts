// Design tokens da Central de Operações — fonte única da verdade.
// Importados por componentes que precisam de valores em JS (não só CSS).
// Para classes Tailwind, veja globals.css e tailwind.config.ts.

export const SURFACE = {
  base:     '#09090B',   // camada 0 — fundo da app
  card:     '#18181B',   // camada 2 — cards / containers
  elevated: '#18181B',   // camada 2 — mantido por compatibilidade
  input:    '#121214',   // camada 1 — campos de formulário
  overlay:  '#121214',   // camada 1 — overlays e drawers
  nav:      '#121214',   // camada 1 — sidebar / barras de navegação
} as const;

export const BORDER = {
  default: '#27272A',               // borda padrão de cards (camada 2)
  subtle:  'rgba(255,255,255,0.04)',
  strong:  'rgba(255,255,255,0.10)',
} as const;

// Semântica de cores — USE ESTAS, nunca cores arbitrárias
export const COLOR = {
  brand:    '#f97316',  // laranja — único acento de marca
  positive: '#34d399',  // emerald-400 — positivo, lucro, ok
  negative: '#f87171',  // red-400 — negativo, perda, erro
  warning:  '#fbbf24',  // amber-400 — atenção, em andamento
  neutral:  '#71717a',  // zinc-500 — neutro, dados secundários
  muted:    '#3f3f46',  // zinc-700 — placeholders, texto muito discreto
} as const;

// Hierarquia de texto — MÍNIMO #71717A para texto visível
export const TEXT = {
  primary:   '#FFFFFF',  // títulos, valores de KPI
  secondary: '#A1A1AA',  // descrições, subtítulos (zinc-400)
  tertiary:  '#71717A',  // labels, texto de apoio (zinc-500) — piso mínimo
} as const;

// Paleta de gráficos (cores para séries de Recharts)
export const CHART = {
  bar1:    '#f97316',   // laranja — gasto / primário
  bar2:    '#22c55e',   // green-500 — faturamento / secundário
  line1:   '#a1a1aa',   // zinc-400 — linha principal
  line2:   '#52525b',   // zinc-600 — linha secundária (tracejada)
  grid:    '#27272a',   // zinc-800 — gridlines
  axis:    '#71717a',   // zinc-500 — texto dos eixos
  tooltip: '#18181b',   // zinc-900 — fundo do tooltip
} as const;

// Espaçamento canônico de página (régua única para todo o /app)
export const SPACING = {
  pagePadding:   'p-4 sm:p-6',           // padding externo de todas as páginas
  pageMaxWidth:  'max-w-5xl mx-auto',     // largura máxima padrão
  sectionGap:    'mb-8',                  // espaço entre seções
  cardGap:       'gap-4',                 // gap entre cards
  cardPadding:   'p-5',                   // padding interno de cards
} as const;

// Tipografia de KPI — aplicada via classe .num no CSS
export const TYPOGRAPHY = {
  kpiSize:    'text-2xl sm:text-[1.65rem]',
  kpiWeight:  'font-bold',
  kpiClass:   'num',                      // .num: tnum + lnum + letter-spacing -0.025em
  labelClass: 'kpi-label',               // .kpi-label: 10px uppercase tracking-[0.12em]
} as const;
