// OpenFinancePlaceholder — área de conciliação reservada para Open Finance.
// Visível mas inativa. Motor construído na Fase C.

export function OpenFinancePlaceholder() {
  return (
    <div className="relative bg-[#0f0f12] border border-white/[0.06] rounded-xl p-5 overflow-hidden opacity-70">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-500">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-400">Conciliação Bancária</p>
            <p className="text-xs text-zinc-600">Tracker / Plataforma × Extrato bancário</p>
          </div>
        </div>
        <span className="badge-neutral">Em breve</span>
      </div>

      <div className="border border-dashed border-white/[0.05] rounded-lg p-6 text-center">
        <p className="text-xs text-zinc-600 max-w-sm mx-auto">
          Conecte sua conta bancária via Open Finance (Pluggy, Belvo, Klavi) para
          conciliar automaticamente lançamentos manuais com o extrato real do banco.
        </p>
        <div className="flex items-center justify-center gap-3 mt-4 opacity-50">
          {['Pluggy', 'Belvo', 'Klavi'].map(name => (
            <span key={name} className="text-[10px] bg-zinc-800 text-zinc-500 px-2 py-1 rounded font-medium">
              {name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
