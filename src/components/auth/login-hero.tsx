const features = [
  ['Vendas reais', 'Hotmart, Paradise, Vega, Shopify'],
  ['Tráfego conectado', 'Meta Ads + Google Ads'],
  ['Financeiro unificado', 'DRE via calc.ts — fonte única'],
  ['Motor de alertas', 'ROAS, reembolso, meta, pixel'],
] as const

export default function LoginHero() {
  return (
    <div className="anim-in flex flex-col gap-8">
      <div>
        <p className="text-foreground/30 text-xs tracking-widest uppercase mb-4 num">
          Plataforma de gestão
        </p>
        <h1 className="text-foreground font-bold leading-none mb-4" style={{ fontSize: 'clamp(40px, 4.5vw, 68px)' }}>
          Sua operação inteira.<br />
          <span className="text-brand">Um lugar só.</span>
        </h1>
        <p className="text-foreground/40 text-sm max-w-xs leading-relaxed">
          Vendas, tráfego, financeiro e equipe — tudo conectado em tempo real.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {features.map(([title, sub], i) => (
          <div
            key={title}
            className="anim-in flex items-start gap-4"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="w-1 h-1 rounded-full bg-foreground/20 mt-2 shrink-0" />
            <div>
              <p className="text-foreground text-sm font-medium">{title}</p>
              <p className="text-foreground/30 text-xs mt-0.5">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-6 border-t border-border flex items-center gap-2">
        <span className="text-foreground/20 text-xs tracking-widest uppercase num">v1.0</span>
        <span className="text-foreground/10 text-xs">·</span>
        <span className="text-foreground/20 text-xs">Fases 0–10 completas</span>
      </div>
    </div>
  )
}
