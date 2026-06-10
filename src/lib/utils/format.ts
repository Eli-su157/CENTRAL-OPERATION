export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCurrencyFull(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatROAS(value: number): string {
  return value.toFixed(2) + 'x';
}

export function formatPercent(value: number, decimals = 1): string {
  return value.toFixed(decimals) + '%';
}

export function formatDelta(value: number, suffix = '%'): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}${suffix}`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value);
}

export function deltaColor(value: number, invertLogic = false): string {
  if (value === 0) return 'text-zinc-400';
  const positive = invertLogic ? value < 0 : value > 0;
  return positive ? 'text-emerald-400' : 'text-red-400';
}
