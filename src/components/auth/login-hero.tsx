export default function LoginHero() {
  return (
    // posição relativa pra ancora o ♦ no canto inferior direito da tela
    <div className="relative flex flex-col items-center justify-center w-full select-none">

      {/* ── Wordmark ── */}
      <div className="flex flex-col items-center gap-6">
        {/* Container do texto + linha cruzando */}
        <div className="relative">
          {/* Texto ZÊNITE */}
          <div
            className="zenite-wordmark font-black uppercase text-white"
            style={{
              fontSize: 'clamp(3.5rem, 11vw, 8.5rem)',
              textShadow: [
                '0 0 8px rgba(255,255,255,0.9)',
                '0 0 20px rgba(255,255,255,0.6)',
                '0 0 60px rgba(255,255,255,0.25)',
              ].join(', '),
            }}
          >
            ZÊNITE
          </div>

          {/* Linha horizontal cruzando o meio das letras */}
          <div
            aria-hidden="true"
            className="zenite-line"
            style={{
              position: 'absolute',
              top: '50%',
              left: '-4%',
              width: '108%',
              height: '1px',
              background: 'rgba(255,255,255,0.55)',
              boxShadow: '0 0 8px 2px rgba(255,255,255,0.5)',
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* Subtítulo */}
        <div className="flex flex-col items-center gap-1 mt-2">
          <span
            className="font-mono text-white/60 uppercase tracking-[0.25em]"
            style={{ fontSize: '10px' }}
          >
            [ PROTOCOLO ATIVO ]
          </span>
          <span
            className="font-mono text-white/60 uppercase tracking-[0.2em]"
            style={{ fontSize: '10px' }}
          >
            CONVERGÊNCIA ABSOLUTA DE DADOS.
          </span>
        </div>
      </div>

      {/* ♦ decorativo — canto inferior direito da tela */}
      <span
        aria-hidden="true"
        className="fixed bottom-6 right-6 text-white/30"
        style={{ fontSize: '12px', lineHeight: 1 }}
      >
        ◆
      </span>
    </div>
  );
}
