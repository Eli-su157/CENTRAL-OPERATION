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

    // mouse position — ref to avoid re-renders
    const mouse = { x: -9999, y: -9999 };

    // cap DPR at 2 to avoid blowing up on high-density screens
    const getDPR = () => Math.min(window.devicePixelRatio || 1, 2);

    // --- stream state ---
    interface Stream {
      x: number;      // canvas-pixel x (already scaled)
      y: number;      // current y head
      speed: number;
      opacity: number;
      isBrand: boolean;
    }

    let streams: Stream[] = [];
    let dpr = getDPR();
    let W = 0;
    let H = 0;

    function buildStreams(width: number, height: number) {
      // ~1 stream per 12 logical px of width, capped 40–80
      const count = Math.max(40, Math.min(80, Math.round(width / 12)));
      streams = Array.from({ length: count }, (_, i) => ({
        x: Math.round((i / count) * width * dpr + Math.random() * (width / count) * dpr),
        y: Math.random() * height * dpr * -1, // start above viewport
        speed: (0.4 + Math.random() * 0.8) * dpr,
        opacity: 0.03 + Math.random() * 0.07,
        isBrand: Math.random() < 0.08, // ~8% get brand accent
      }));
    }

    function resize() {
      dpr = getDPR();
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      buildStreams(W, H);
    }

    // --- draw ---
    function drawStatic() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      streams.forEach((s) => {
        const mouseDistX = Math.abs(s.x / dpr - mouse.x);
        const proximity = Math.max(0, 1 - mouseDistX / 120);
        const op = Math.min(1, s.opacity + proximity * 0.12);

        ctx.beginPath();
        ctx.lineWidth = dpr * 0.7;
        // subtle horizontal drift toward mouse — max 6 logical px
        const drift = proximity * 6 * dpr * Math.sign(mouse.x - s.x / dpr);
        ctx.moveTo(s.x + drift, 0);
        ctx.lineTo(s.x + drift, canvas.height);
        ctx.strokeStyle = s.isBrand
          ? `rgba(249,115,22,${op})`   // brand #f97316
          : `rgba(255,255,255,${op})`;
        ctx.stroke();
      });
    }

    function drawFrame() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      streams.forEach((s) => {
        const mouseDistX = Math.abs(s.x / dpr - mouse.x);
        const proximity = Math.max(0, 1 - mouseDistX / 120);
        const op = Math.min(1, s.opacity + proximity * 0.12);
        const drift = proximity * 6 * dpr * Math.sign(mouse.x - s.x / dpr);

        // draw the falling "head" segment
        const segLen = (40 + Math.random() * 80) * dpr;
        const x = s.x + drift;

        const grad = ctx.createLinearGradient(x, s.y - segLen, x, s.y);
        const base = s.isBrand ? `249,115,22` : `255,255,255`;
        grad.addColorStop(0, `rgba(${base},0)`);
        grad.addColorStop(1, `rgba(${base},${op})`);

        ctx.beginPath();
        ctx.lineWidth = dpr * 0.7;
        ctx.moveTo(x, s.y - segLen);
        ctx.lineTo(x, s.y);
        ctx.strokeStyle = grad;
        ctx.stroke();

        // advance stream
        s.y += s.speed;
        if (s.y - segLen > canvas.height) {
          // reset to top with a new random x within its column band
          s.y = -segLen;
          s.opacity = 0.03 + Math.random() * 0.07;
          s.speed = (0.4 + Math.random() * 0.8) * dpr;
        }
      });
    }

    // --- animation loop ---
    let rafId = 0;
    let paused = false;

    function loop() {
      if (!paused) drawFrame();
      rafId = requestAnimationFrame(loop);
    }

    function handleVisibility() {
      paused = document.hidden;
    }

    function handleMouse(e: MouseEvent) {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
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
      // static render, no rAF, no mousemove
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
    window.addEventListener('mousemove', handleMouse);
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('mousemove', handleMouse);
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
