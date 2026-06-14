const features = [
  { index: '01', title: 'Vendas reais', sub: 'Hotmart, Paradise, Vega, Shopify' },
  { index: '02', title: 'Tráfego conectado', sub: 'Meta Ads + Google Ads' },
  { index: '03', title: 'Financeiro unificado', sub: 'DRE via calc.ts — fonte única' },
  { index: '04', title: 'Motor de alertas', sub: 'ROAS, reembolso, meta, pixel' },
] as const

export default function LoginHero() {
  return (
    <div className="flex flex-col gap-10 py-8 lg:py-0">

      {/* Eyebrow */}
      <div className="anim-in flex items-center gap-3" style={{ animationDelay: '0ms' }}>
        <span className="block w-6 h-px bg-brand/60" />
        <span className="text-brand/70 text-[10px] tracking-[0.25em] uppercase font-semibold num">
          Plataforma de gestão
        </span>
      </div>

      {/* Headline */}
      <div className="anim-in" style={{ animationDelay: '60ms' }}>
        <h1
          className="text-foreground font-extrabold leading-[0.95] tracking-tight mb-5"
          style={{ fontSize: 'clamp(44px, 5vw, 72px)' }}
        >
          Sua operação<br />
          inteira.<br />
          <span className="text-brand">Um lugar só.</span>
        </h1>
        <p className="text-foreground/40 text-[15px] max-w-[320px] leading-relaxed">
          Vendas, tráfego, financeiro e equipe —<br />
          tudo conectado em tempo real.
        </p>
      </div>

      {/* Features */}
      <div className="anim-in flex flex-col" style={{ animationDelay: '120ms' }}>
        {features.map(({ index, title, sub }, i) => (
          <div
            key={title}
            className={`flex items-start gap-5 py-3.5 ${
              i < features.length - 1 ? 'border-b border-white/[0.06]' : ''
            }`}
          >
            <span className="text-[10px] text-foreground/15 font-semibold num mt-0.5 shrink-0 w-4 tabular-nums">
              {index}
            </span>
            <div>
              <p className="text-foreground/85 text-sm font-medium leading-none mb-1">{title}</p>
              <p className="text-foreground/30 text-xs leading-relaxed">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Footer badge */}
      <div className="anim-in flex items-center gap-3" style={{ animationDelay: '180ms' }}>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/[0.08] bg-white/[0.03]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80" />
          <span className="text-[10px] text-foreground/30 font-medium tracking-wide num">v1.0</span>
        </span>
        <span className="text-foreground/20 text-[11px]">Fases 0–10 completas</span>
      </div>

    </div>
  )
}
