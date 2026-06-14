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

    // --- partículas voando pelo fundo inteiro ---
    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;   // raio em px lógicos
      opacity: number;
      pulse: number;  // fase de brilho individual
      pulseSpeed: number;
      type: 'dot' | 'cross' | 'diamond';
    }

    let particles: Particle[] = [];

    function makeParticle(): Particle {
      const types: Particle['type'][] = ['dot', 'cross', 'diamond'];
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.18,
        vy: -0.05 - Math.random() * 0.12, // sobem levemente
        size: 0.8 + Math.random() * 2.2,
        opacity: 0.04 + Math.random() * 0.10,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.008 + Math.random() * 0.018,
        type: types[Math.floor(Math.random() * types.length)],
      };
    }

    function buildParticles() {
      const count = Math.round((W * H) / 9000);
      particles = Array.from({ length: Math.max(40, Math.min(count, 140)) }, makeParticle);
    }

    // linhas de conexão entre partículas próximas
    const CONNECT_DIST = 120;

    function drawConnections() {
      ctx.lineWidth = dpr * 0.4;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < CONNECT_DIST) {
            const op = (1 - d / CONNECT_DIST) * 0.04;
            ctx.beginPath();
            ctx.moveTo(particles[i].x * dpr, particles[i].y * dpr);
            ctx.lineTo(particles[j].x * dpr, particles[j].y * dpr);
            ctx.strokeStyle = `rgba(255,255,255,${op})`;
            ctx.stroke();
          }
        }
      }
    }

    function drawParticle(p: Particle) {
      const glow = Math.sin(p.pulse) * 0.5 + 0.5; // 0..1
      const op = p.opacity * (0.6 + glow * 0.4);
      const r = p.size * dpr;
      const x = p.x * dpr;
      const y = p.y * dpr;

      ctx.fillStyle = `rgba(255,255,255,${op})`;
      ctx.strokeStyle = `rgba(255,255,255,${op * 0.5})`;
      ctx.lineWidth = dpr * 0.5;

      if (p.type === 'dot') {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'cross') {
        const arm = r * 1.8;
        ctx.beginPath();
        ctx.moveTo(x - arm, y); ctx.lineTo(x + arm, y);
        ctx.moveTo(x, y - arm); ctx.lineTo(x, y + arm);
        ctx.stroke();
      } else {
        // diamond
        ctx.beginPath();
        ctx.moveTo(x, y - r * 1.6);
        ctx.lineTo(x + r, y);
        ctx.lineTo(x, y + r * 1.6);
        ctx.lineTo(x - r, y);
        ctx.closePath();
        ctx.fill();
      }
    }

    // --- grade de perspectiva (terço inferior) ---
    let gridOffset = 0;
    let pulse = 0;

    function drawGrid(offset: number, extraPulse: number) {
      const cW = canvas.width;
      const cH = canvas.height;
      const gridTop = cH * 0.62;
      const gridH = cH - gridTop;
      const hx = cW / 2;
      const hy = gridTop;

      const vCount = 14;
      ctx.lineWidth = dpr * 0.7;
      for (let i = 0; i <= vCount; i++) {
        const bx = (i / vCount) * cW;
        const op = (0.035 + extraPulse * 0.07) * (1 - Math.abs(i / vCount - 0.5) * 0.55);
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.lineTo(bx, cH);
        ctx.strokeStyle = `rgba(255,255,255,${Math.max(0, op)})`;
        ctx.stroke();
      }

      const hCount = 10;
      ctx.lineWidth = dpr * 0.7;
      for (let i = 0; i < hCount; i++) {
        const raw = (i + 1 + offset) / hCount;
        if (raw <= 0 || raw > 1 + 1 / hCount) continue;
        const t = Math.min(raw, 1);
        const tCurved = Math.pow(t, 2.5);
        const y = hy + tCurved * gridH;
        const lx = hx + (0 - hx) * (1 - tCurved);
        const rx = hx + (cW - hx) * (1 - tCurved);
        const op = 0.025 + tCurved * 0.045 + extraPulse * 0.06;
        ctx.beginPath();
        ctx.moveTo(lx, y);
        ctx.lineTo(rx, y);
        ctx.strokeStyle = `rgba(255,255,255,${Math.min(op, 0.15)})`;
        ctx.stroke();
      }
    }

    // --- resize ---
    function resize() {
      dpr = getDPR();
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      buildParticles();
    }

    // --- static (reduced-motion) ---
    function drawStatic() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(drawParticle);
      drawConnections();
      drawGrid(0, 0);
    }

    // --- animated frame ---
    function drawFrame() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      gridOffset = (gridOffset + 0.0025) % 1;
      pulse = Math.max(0, pulse - 0.02);

      // atualizar partículas
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += p.pulseSpeed;

        // wrap ao sair da tela
        if (p.x < -10) p.x = W + 10;
        if (p.x > W + 10) p.x = -10;
        if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
        if (p.y > H + 10) { p.y = -10; p.x = Math.random() * W; }
      }

      drawConnections();
      particles.forEach(drawParticle);
      drawGrid(gridOffset, pulse);
    }

    // --- loop ---
    let rafId = 0;
    let paused = false;

    function loop() {
      if (!paused) drawFrame();
      rafId = requestAnimationFrame(loop);
    }

    function handleVisibility() {
      paused = document.hidden;
    }

    function handleKeyDown() {
      pulse = Math.min(1, pulse + 0.5);
    }

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
      return () => {
        window.removeEventListener('resize', handleResize);
        clearTimeout(resizeTimer);
      };
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
