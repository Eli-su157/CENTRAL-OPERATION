// Shim de compatibilidade — componente renomeado para AlertBannerList em ui/.
// Mantido para não quebrar os imports existentes no app.
export { AlertBannerList as AlertsBar } from '@/components/ui/AlertBanner';
export type { AlertItem as AlertBarItem } from '@/components/ui/AlertBanner';
