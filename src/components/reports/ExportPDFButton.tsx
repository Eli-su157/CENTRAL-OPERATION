'use client';

export function ExportPDFButton() {
  return (
    <button
      onClick={() => window.print()}
      className="print-hide flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-[#0c0c0f] hover:bg-white/[0.06] border border-white/[0.10] text-zinc-300 hover:text-white transition-all duration-150 group relative overflow-hidden"
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gradient-to-r from-orange-500/[0.04] to-transparent" />
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="relative z-10 text-orange-400 group-hover:text-orange-300 transition-colors">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      <span className="relative z-10">Exportar PDF</span>
    </button>
  );
}
