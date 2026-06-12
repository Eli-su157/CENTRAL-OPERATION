// Barrel export da camada de UI compartilhada.
// Importar de '@/components/ui' em vez de paths individuais.

export { KPICard }        from './KPICard';
export type { KPIAccent, KPIBadge } from './KPICard';

export { MetricBlock }    from './MetricBlock';

export { AlertBanner, AlertBannerList } from './AlertBanner';
export type { AlertItem, AlertSeverity } from './AlertBanner';

export { SectionHeader }  from './SectionHeader';
export { EmptyState }     from './EmptyState';
export { Breadcrumb }     from './Breadcrumb';
export type { BreadcrumbItem } from './Breadcrumb';

export { EvolutionChart } from './EvolutionChart';
export type { BarSeries, LineSeries, EvolutionChartProps } from './EvolutionChart';

export { DenseTable }     from './DenseTable';
export type { DenseColumn, DenseTableFilter } from './DenseTable';
