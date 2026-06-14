'use client';

import { useEffect, useRef, useState } from 'react';

const TITLE = 'CONTROL THE FLOOD.';
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&';
const DURATION = 800; // ms total until title locks

function DecodeTitle() {
  const [display, setDisplay] = useState(TITLE);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const len = TITLE.length;

    function scramble(ts: number) {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / DURATION, 1);
      // characters resolve left-to-right: first ~progress*len chars are locked
      const locked = Math.floor(progress * len);

      setDisplay(
        TITLE.split('').map((char, i) => {
          if (i < locked || char === ' ' || char === '.') return char;
          return CHARS[Math.floor(Math.random() * CHARS.length)];
        }).join('')
      );

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(scramble);
      }
    }

    rafRef.current = requestAnimationFrame(scramble);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // split to color the trailing dot brand
  const body = display.slice(0, -1);
  const dot = display.slice(-1);

  return (
    <h1
      className="text-foreground font-black leading-[0.92] tracking-tight mb-6"
      style={{ fontSize: 'clamp(42px, 5.5vw, 76px)' }}
    >
      {body}<span className="text-brand">{dot}</span>
    </h1>
  );
}

export default function LoginHero() {
  return (
    <div className="flex flex-col gap-8 py-8 lg:py-0">

      {/* Wordmark */}
      <div className="anim-in flex items-center gap-3" style={{ animationDelay: '0ms' }}>
        <span className="block w-5 h-px bg-brand/50" />
        <span className="font-mono text-[10px] tracking-[0.3em] text-brand/60 uppercase">
          ÆTHER.OS
        </span>
      </div>

      {/* Headline with decode */}
      <div className="anim-in" style={{ animationDelay: '60ms' }}>
        <DecodeTitle />
        <p className="font-mono text-[11px] text-foreground/35 leading-relaxed max-w-[360px] tracking-wide">
          {'[ SYSTEM STATUS: OPERATIONAL ] OVERSEEING ALL REVENUE, TRAFFIC AND LOGISTICS IN SINGLE-STREAM CONVERGENCE.'}
        </p>
      </div>

      {/* Stream metrics — decorative */}
      <div className="anim-in flex flex-col gap-0" style={{ animationDelay: '120ms' }}>
        {[
          { id: '01', label: 'REVENUE STREAM',   value: 'ACTIVE' },
          { id: '02', label: 'TRAFFIC NODES',    value: 'SYNCED' },
          { id: '03', label: 'FINANCIAL CORE',   value: 'LOCKED' },
          { id: '04', label: 'ALERT ENGINE',     value: 'ARMED'  },
        ].map(({ id, label, value }, i, arr) => (
          <div
            key={id}
            className={`flex items-center justify-between py-3 ${
              i < arr.length - 1 ? 'border-b border-white/[0.05]' : ''
            }`}
          >
            <div className="flex items-center gap-4">
              <span className="font-mono text-[9px] text-foreground/15 tabular-nums w-4">{id}</span>
              <span className="font-mono text-[11px] text-foreground/50 tracking-wider">{label}</span>
            </div>
            <span className="font-mono text-[9px] text-brand/60 tracking-widest">{value}</span>
          </div>
        ))}
      </div>

      {/* Status badge */}
      <div className="anim-in flex items-center gap-3" style={{ animationDelay: '180ms' }}>
        <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-sm border border-white/[0.07] bg-white/[0.02]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/70" />
          <span className="font-mono text-[9px] text-foreground/25 tracking-widest">SYS ONLINE</span>
        </span>
      </div>

    </div>
  );
}
