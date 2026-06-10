// Utilitários de período para relatórios semanais e mensais.

export function getPeriodDates(
  periodType: 'semanal' | 'mensal',
  periodRef: string
): { start: string; end: string } {
  if (periodType === 'mensal') {
    const [year, month] = periodRef.split('-').map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    return { start: toDateStr(start), end: toDateStr(end) };
  }
  // Semanal: '2026-W23'
  const m = periodRef.match(/^(\d{4})-W(\d{1,2})$/);
  if (!m) throw new Error(`Formato de semana inválido: ${periodRef}`);
  const year = Number(m[1]);
  const week = Number(m[2]);
  // ISO week 1 = week containing Jan 4
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const weekStart = new Date(jan4);
  weekStart.setDate(jan4.getDate() - dayOfWeek + 1 + (week - 1) * 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  return { start: toDateStr(weekStart), end: toDateStr(weekEnd) };
}

export function getCurrentPeriodRef(type: 'semanal' | 'mensal'): string {
  const now = new Date();
  if (type === 'mensal') {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
  // ISO week number
  const tmp = new Date(now);
  tmp.setHours(0, 0, 0, 0);
  tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7));
  const week1 = new Date(tmp.getFullYear(), 0, 4);
  const week = 1 + Math.round(((tmp.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${tmp.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function formatPeriodLabel(periodType: 'semanal' | 'mensal', periodRef: string): string {
  if (periodType === 'mensal') {
    const [year, month] = periodRef.split('-');
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${months[Number(month) - 1]} ${year}`;
  }
  const { start, end } = getPeriodDates(periodType, periodRef);
  const s = new Date(start + 'T12:00:00');
  const e = new Date(end + 'T12:00:00');
  return `Sem. ${periodRef.split('-W')[1]} · ${s.getDate()}/${s.getMonth() + 1} – ${e.getDate()}/${e.getMonth() + 1}`;
}

// Últimos N períodos para o seletor
export function getRecentPeriods(type: 'semanal' | 'mensal', count = 6): string[] {
  const refs: string[] = [];
  const now = new Date();
  if (type === 'mensal') {
    for (let i = 0; i < count; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      refs.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
  } else {
    const current = getCurrentPeriodRef('semanal');
    const [year, w] = current.split('-W').map(Number);
    for (let i = 0; i < count; i++) {
      const week = w - i;
      if (week > 0) {
        refs.push(`${year}-W${String(week).padStart(2, '0')}`);
      }
    }
  }
  return refs;
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}
