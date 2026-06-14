'use client';

import { useEffect, useRef } from 'react';

export default function LoginBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const canvas = canvasRef.current!;
    if (!canvas.getContext('2d')) return;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const ctx = canvas.getContext('2d')!;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // cap DPR at 2
    const getDPR = () => Math.min(window.devicePixelRatio || 1, 2);

    let dpr = getDPR();
    let W = 0;
    let H = 0;

    // --- vertical nodes (top half) ---
    interface Node {
      x: number; // logical px
      opacity: number;
    }
    let nodes: Node[] = [];

    function buildNodes(width: number) {
      const count = Math.max(20, Math.min(50, Math.round(width / 20)));
      nodes = Array.from({ length: count }, (_, i) => ({
        x: Math.round((i / count) * width + Math.random() * (width / count)),
        opacity: 0.02 + Math.random() * 0.04,
      }));
    }

    // --- perspective grid state ---
    // Horizontal lines scroll toward the viewer (offset increases over time, wraps).
    // offset ∈ [0, 1) — fraction of the current band spacing consumed.
    let gridOffset = 0;

    // Keydown pulse: briefly boost grid opacity
    let pulse = 0; // 0..1, decays each frame

    // --- resize ---
    function resize() {
      dpr = getDPR();
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      buildNodes(W);
    }

    // --- drawing helpers ---

    function drawNodes() {
      // Subtle vertical lines in the top ~55% of the canvas
      const topZone = H * 0.55 * dpr;
      ctx.lineWidth = dpr * 0.6;
      nodes.forEach((n) => {
        ctx.beginPath();
        ctx.moveTo(n.x * dpr, 0);
        ctx.lineTo(n.x * dpr, topZone);
        ctx.strokeStyle = `rgba(255,255,255,${n.opacity})`;
        ctx.stroke();
      });
    }

    function drawGrid(offset: number, extraPulse: number) {
      const cW = canvas.width;
      const cH = canvas.height;

      // Grid occupies bottom 40% of canvas
      const gridTop = cH * 0.6;
      const gridH = cH - gridTop;

      // Horizon point: top-center of the grid area
      const hx = cW / 2;
      const hy = gridTop;

      // --- vertical convergence lines ---
      // Number of "columns" — lines radiating from horizon
      const vCount = 12;
      ctx.lineWidth = dpr * 0.8;
      for (let i = 0; i <= vCount; i++) {
        // spread evenly across the bottom edge
        const bx = (i / vCount) * cW;
        const op = (0.04 + extraPulse * 0.08) * (1 - Math.abs(i / vCount - 0.5) * 0.6);
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.lineTo(bx, cH);
        ctx.strokeStyle = `rgba(255,255,255,${Math.max(0, op)})`;
        ctx.stroke();
      }

      // --- horizontal lines in perspective ---
      // We place N horizontal bands; their y-positions follow a power curve so
      // lines bunch near the horizon and spread near the viewer.
      // `offset` scrolls them forward: each band shifts one step and wraps.
      const hCount = 10; // number of bands
      ctx.lineWidth = dpr * 0.8;

      for (let i = 0; i < hCount; i++) {
        // t ∈ (0,1]: 1 = viewer's edge, 0 = horizon
        // Adding offset slides everything toward viewer; wrap via modulo
        const raw = (i + 1 + offset) / hCount;
        if (raw <= 0 || raw > 1 + 1 / hCount) continue;
        const t = Math.min(raw, 1);

        // Power curve: t^2.5 gives natural perspective bunching
        const tCurved = Math.pow(t, 2.5);
        const y = hy + tCurved * gridH;

        // Width of the line at this depth (perspective narrowing at horizon)
        const lx = hx + (0 - hx) * (1 - tCurved);
        const rx = hx + (cW - hx) * (1 - tCurved);

        // Lines near horizon are more transparent
        const op = (0.03 + tCurved * 0.05 + extraPulse * 0.07);
        ctx.beginPath();
        ctx.moveTo(lx, y);
        ctx.lineTo(rx, y);
        ctx.strokeStyle = `rgba(255,255,255,${Math.min(op, 0.18)})`;
        ctx.stroke();
      }
    }

    // --- static render (reduced-motion) ---
    function drawStatic() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawNodes();
      drawGrid(0, 0);
    }

    // --- animated frame ---
    function drawFrame() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Advance grid: offset wraps at 1 (one full band step = 1 cycle)
      gridOffset = (gridOffset + 0.003) % 1;

      // Decay pulse
      pulse = Math.max(0, pulse - 0.025);

      drawNodes();
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

    // Keydown pulse (optional, only in animated path)
    function handleKeyDown() {
      pulse = Math.min(1, pulse + 0.4);
    }

    // debounced resize
    let resizeTimer = 0;
    function handleResize() {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        resize();
        if (reduced) drawStatic();
      }, 120);
    }

    // --- init ---
    resize();

    if (reduced) {
      // static render, no rAF, no keydown
      drawStatic();
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
        clearTimeout(resizeTimer);
      };
    }

    // animated path
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
