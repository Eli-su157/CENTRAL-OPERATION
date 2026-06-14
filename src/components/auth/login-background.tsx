'use client';

import { useEffect, useRef } from 'react';

export default function LoginBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current!;
    if (!canvas.getContext('2d')) return;
    const ctx = canvas.getContext('2d')!;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const getDPR = () => Math.min(window.devicePixelRatio || 1, 2);

    let dpr = getDPR();
    let W = 0;
    let H = 0;

    // ── Partículas flutuantes ──────────────────────────────────────────────
    interface Particle {
      x: number; y: number;
      vx: number; vy: number;
      r: number;
      baseOp: number;
      phase: number;
      phaseSpeed: number;
      kind: 0 | 1 | 2; // 0=dot 1=cross 2=diamond
    }

    let parts: Particle[] = [];

    function spawnParticle(randomY = true): Particle {
      return {
        x: Math.random() * W,
        y: randomY ? Math.random() * H : H + 8,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -(0.2 + Math.random() * 0.5),
        r: 1.5 + Math.random() * 3.5,
        baseOp: 0.15 + Math.random() * 0.35,
        phase: Math.random() * Math.PI * 2,
        phaseSpeed: 0.012 + Math.random() * 0.025,
        kind: Math.floor(Math.random() * 3) as 0 | 1 | 2,
      };
    }

    function buildParticles() {
      const n = Math.max(60, Math.min(160, Math.round((W * H) / 7000)));
      parts = Array.from({ length: n }, () => spawnParticle(true));
    }

    // ── Streams (linhas de dados verticais) ────────────────────────────────
    interface Stream {
      x: number;
      y: number;       // topo da linha
      len: number;     // comprimento em px lógicos
      speed: number;
      op: number;
    }

    let streams: Stream[] = [];

    function buildStreams() {
      const n = Math.max(8, Math.round(W / 80));
      streams = Array.from({ length: n }, () => ({
        x: Math.random() * W,
        y: Math.random() * H - H,
        len: 40 + Math.random() * 120,
        speed: 0.6 + Math.random() * 1.4,
        op: 0.04 + Math.random() * 0.10,
      }));
    }

    // ── Grade de perspectiva (terço inferior) ─────────────────────────────
    let gridOffset = 0;
    let keyPulse = 0;

    function drawGrid() {
      const cW = canvas.width;
      const cH = canvas.height;
      const gridTop = cH * 0.60;
      const gridH = cH - gridTop;
      const hx = cW / 2;
      const hy = gridTop;

      ctx.lineWidth = dpr * 0.7;
      for (let i = 0; i <= 14; i++) {
        const bx = (i / 14) * cW;
        const op = (0.06 + keyPulse * 0.1) * (1 - Math.abs(i / 14 - 0.5) * 0.6);
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.lineTo(bx, cH);
        ctx.strokeStyle = `rgba(255,255,255,${Math.max(0, op)})`;
        ctx.stroke();
      }

      for (let i = 0; i < 10; i++) {
        const raw = (i + 1 + gridOffset) / 10;
        if (raw <= 0 || raw > 1 + 0.1) continue;
        const t = Math.min(raw, 1);
        const tc = Math.pow(t, 2.5);
        const y = hy + tc * gridH;
        const lx = hx - hx * (1 - tc);
        const rx = hx + (cW - hx) * (1 - tc);
        const op = 0.04 + tc * 0.07 + keyPulse * 0.08;
        ctx.beginPath();
        ctx.moveTo(lx, y);
        ctx.lineTo(rx, y);
        ctx.strokeStyle = `rgba(255,255,255,${Math.min(op, 0.18)})`;
        ctx.stroke();
      }
    }

    // ── Desenho partícula ─────────────────────────────────────────────────
    function drawPart(p: Particle) {
      const glow = (Math.sin(p.phase) * 0.5 + 0.5);
      const op = p.baseOp * (0.5 + glow * 0.5);
      const r = p.r * dpr;
      const x = p.x * dpr;
      const y = p.y * dpr;
      ctx.fillStyle = `rgba(255,255,255,${op})`;
      ctx.strokeStyle = `rgba(255,255,255,${op * 0.6})`;
      ctx.lineWidth = dpr * 0.8;

      if (p.kind === 0) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        // halo
        ctx.beginPath();
        ctx.arc(x, y, r * 2.5, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,255,255,${op * 0.12})`;
        ctx.stroke();
      } else if (p.kind === 1) {
        const arm = r * 2.2;
        ctx.beginPath();
        ctx.moveTo(x - arm, y); ctx.lineTo(x + arm, y);
        ctx.moveTo(x, y - arm); ctx.lineTo(x, y + arm);
        ctx.stroke();
      } else {
        const s = r * 1.8;
        ctx.beginPath();
        ctx.moveTo(x, y - s);
        ctx.lineTo(x + s * 0.6, y);
        ctx.lineTo(x, y + s);
        ctx.lineTo(x - s * 0.6, y);
        ctx.closePath();
        ctx.fill();
      }
    }

    // ── Conexões entre partículas próximas ────────────────────────────────
    const CONN = 140;
    function drawConnections() {
      ctx.lineWidth = dpr * 0.35;
      for (let i = 0; i < parts.length; i++) {
        for (let j = i + 1; j < parts.length; j++) {
          const dx = parts[i].x - parts[j].x;
          const dy = parts[i].y - parts[j].y;
          const d2 = dx * dx + dy * dy;
          if (d2 < CONN * CONN) {
            const op = (1 - Math.sqrt(d2) / CONN) * 0.08;
            ctx.beginPath();
            ctx.moveTo(parts[i].x * dpr, parts[i].y * dpr);
            ctx.lineTo(parts[j].x * dpr, parts[j].y * dpr);
            ctx.strokeStyle = `rgba(255,255,255,${op})`;
            ctx.stroke();
          }
        }
      }
    }

    // ── Desenho streams ───────────────────────────────────────────────────
    function drawStreams() {
      for (const s of streams) {
        const x = s.x * dpr;
        const y1 = s.y * dpr;
        const y2 = (s.y + s.len) * dpr;
        const grad = ctx.createLinearGradient(x, y1, x, y2);
        grad.addColorStop(0, `rgba(255,255,255,0)`);
        grad.addColorStop(0.4, `rgba(255,255,255,${s.op})`);
        grad.addColorStop(1, `rgba(255,255,255,0)`);
        ctx.lineWidth = dpr * 0.6;
        ctx.beginPath();
        ctx.moveTo(x, y1);
        ctx.lineTo(x, y2);
        ctx.strokeStyle = grad;
        ctx.stroke();
      }
    }

    // ── Resize ────────────────────────────────────────────────────────────
    function resize() {
      dpr = getDPR();
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      buildParticles();
      buildStreams();
    }

    // ── Estático (reduced-motion) ─────────────────────────────────────────
    function drawStatic() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawConnections();
      parts.forEach(drawPart);
      drawStreams();
      drawGrid();
    }

    // ── Frame animado ─────────────────────────────────────────────────────
    function drawFrame() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      gridOffset = (gridOffset + 0.003) % 1;
      keyPulse = Math.max(0, keyPulse - 0.025);

      // mover partículas
      for (const p of parts) {
        p.x += p.vx;
        p.y += p.vy;
        p.phase += p.phaseSpeed;
        if (p.y < -10) { Object.assign(p, spawnParticle(false)); }
        if (p.x < -10) p.x = W + 10;
        if (p.x > W + 10) p.x = -10;
      }

      // mover streams (caem de cima pra baixo)
      for (const s of streams) {
        s.y += s.speed;
        if (s.y > H + 20) {
          s.y = -s.len - Math.random() * H * 0.5;
          s.x = Math.random() * W;
          s.speed = 0.6 + Math.random() * 1.4;
          s.op = 0.04 + Math.random() * 0.10;
        }
      }

      drawConnections();
      parts.forEach(drawPart);
      drawStreams();
      drawGrid();
    }

    // ── Loop ──────────────────────────────────────────────────────────────
    let rafId = 0;
    let paused = false;

    function loop() {
      if (!paused) drawFrame();
      rafId = requestAnimationFrame(loop);
    }

    function handleVisibility() { paused = document.hidden; }
    function handleKeyDown() { keyPulse = Math.min(1, keyPulse + 0.5); }

    let resizeTimer = 0;
    function handleResize() {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        resize();
        if (reduced) drawStatic();
      }, 120);
    }

    resize();

    if (reduced) {
      drawStatic();
      window.addEventListener('resize', handleResize);
      return () => { window.removeEventListener('resize', handleResize); clearTimeout(resizeTimer); };
    }

    loop();
    document.addEventListener('visibilitychange', handleVisibility);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimer);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 -z-10 w-full h-full pointer-events-none"
      aria-hidden="true"
    />
  );
}
