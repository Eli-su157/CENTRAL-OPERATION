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

    // ── Ícones pré-renderizados ────────────────────────────────────────────
    // Todos em círculo branco outline + símbolo dentro. 32×32 base, @2x.
    const S = 32;

    function oc(draw: (c: CanvasRenderingContext2D) => void): HTMLCanvasElement {
      const el = document.createElement('canvas');
      el.width = S * 2; el.height = S * 2;
      const c = el.getContext('2d')!;
      c.scale(2, 2);
      // círculo base
      c.strokeStyle = '#ffffff'; c.lineWidth = 1.5;
      c.beginPath(); c.arc(S / 2, S / 2, S * 0.44, 0, Math.PI * 2); c.stroke();
      draw(c);
      return el;
    }

    function glyph(c: CanvasRenderingContext2D, char: string, size = 0.42, dy = 0.02) {
      c.fillStyle = '#ffffff';
      c.font = `bold ${S * size}px sans-serif`;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(char, S / 2, S / 2 + S * dy);
    }

    // Tráfego / plataformas de mídia
    const iMeta    = oc(c => glyph(c, 'f', 0.46, 0.03));
    const iGoogle  = oc(c => glyph(c, 'G', 0.42, 0.02));
    const iTikTok  = oc(c => glyph(c, '♪', 0.44, 0.03));
    const iKwai    = oc(c => {                                   // triângulo play
      const cx = S / 2, cy = S / 2, p = S * 0.18;
      c.fillStyle = '#fff';
      c.beginPath(); c.moveTo(cx - p * 0.5, cy - p); c.lineTo(cx + p, cy); c.lineTo(cx - p * 0.5, cy + p); c.closePath(); c.fill();
    });

    // Financeiro
    const iDinheiro = oc(c => glyph(c, 'R$', 0.28, 0.02));
    const iGrafico  = oc(c => {                                  // barras subindo
      const cx = S / 2, base = S * 0.72;
      c.fillStyle = '#fff';
      const bars = [0.25, 0.45, 0.35, 0.55];
      bars.forEach((h, i) => {
        const bw = S * 0.09, bh = S * h;
        c.fillRect(cx - S * 0.22 + i * (bw + S * 0.05), base - bh, bw, bh);
      });
    });

    // Tarefas
    const iTarefa = oc(c => {                                    // checkmark ✓
      c.strokeStyle = '#fff'; c.lineWidth = 2.2; c.lineCap = 'round'; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(S * 0.28, S * 0.5); c.lineTo(S * 0.44, S * 0.66); c.lineTo(S * 0.70, S * 0.36); c.stroke();
    });

    // Equipe
    const iEquipe = oc(c => {                                    // dois círculos (pessoas)
      c.fillStyle = '#fff';
      c.beginPath(); c.arc(S * 0.38, S * 0.42, S * 0.11, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(S * 0.62, S * 0.42, S * 0.11, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(S * 0.38, S * 0.42, S * 0.18, Math.PI, 0); c.fill();
      c.beginPath(); c.arc(S * 0.62, S * 0.42, S * 0.18, Math.PI, 0); c.fill();
    });

    // Relatórios
    const iRelatorio = oc(c => {                                 // folha com linhas
      c.strokeStyle = '#fff'; c.lineWidth = 1.4; c.lineCap = 'round';
      // contorno folha
      c.strokeRect(S * 0.27, S * 0.18, S * 0.46, S * 0.58);
      // linhas de texto
      [0.32, 0.42, 0.52, 0.62].forEach(y => {
        c.beginPath(); c.moveTo(S * 0.33, S * y); c.lineTo(S * 0.67, S * y); c.stroke();
      });
    });

    // Calendário
    const iCalendario = oc(c => {                                // grade de calendário
      c.strokeStyle = '#fff'; c.lineWidth = 1.4; c.lineCap = 'round';
      c.strokeRect(S * 0.24, S * 0.28, S * 0.52, S * 0.46);
      c.beginPath(); c.moveTo(S * 0.24, S * 0.38); c.lineTo(S * 0.76, S * 0.38); c.stroke();
      c.fillStyle = '#fff';
      // bolinhas dias
      [[0.35, 0.50],[0.50, 0.50],[0.65, 0.50],[0.35, 0.64],[0.50, 0.64]].forEach(([x, y]) => {
        c.beginPath(); c.arc(S * x, S * y, S * 0.04, 0, Math.PI * 2); c.fill();
      });
    });

    // Integração / API
    const iAPI = oc(c => {                                       // dois nodos conectados
      c.strokeStyle = '#fff'; c.fillStyle = '#fff'; c.lineWidth = 1.4;
      c.beginPath(); c.arc(S * 0.3, S * 0.5, S * 0.1, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.arc(S * 0.7, S * 0.5, S * 0.1, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.moveTo(S * 0.4, S * 0.5); c.lineTo(S * 0.6, S * 0.5); c.stroke();
      // seta
      c.beginPath(); c.moveTo(S * 0.56, S * 0.43); c.lineTo(S * 0.63, S * 0.5); c.lineTo(S * 0.56, S * 0.57); c.stroke();
    });

    // Dashboard
    const iDash = oc(c => {                                      // linha de gráfico
      c.strokeStyle = '#fff'; c.lineWidth = 1.6; c.lineCap = 'round'; c.lineJoin = 'round';
      c.beginPath();
      c.moveTo(S * 0.22, S * 0.70);
      c.lineTo(S * 0.36, S * 0.48);
      c.lineTo(S * 0.50, S * 0.60);
      c.lineTo(S * 0.64, S * 0.34);
      c.lineTo(S * 0.78, S * 0.44);
      c.stroke();
      // ponto no pico
      c.fillStyle = '#fff';
      c.beginPath(); c.arc(S * 0.64, S * 0.34, S * 0.05, 0, Math.PI * 2); c.fill();
    });

    const ALL_ICONS = [
      { img: iMeta,      label: 'META ADS'    },
      { img: iGoogle,    label: 'GG ADS'      },
      { img: iTikTok,    label: 'TTK ADS'     },
      { img: iKwai,      label: 'KWAI ADS'    },
      { img: iDinheiro,  label: 'FINANCEIRO'  },
      { img: iGrafico,   label: 'RECEITA'     },
      { img: iTarefa,    label: 'TAREFAS'     },
      { img: iEquipe,    label: 'EQUIPE'      },
      { img: iRelatorio, label: 'RELATÓRIOS'  },
      { img: iCalendario,label: 'CALENDÁRIO'  },
      { img: iAPI,       label: 'INTEGRAÇÕES' },
      { img: iDash,      label: 'DASHBOARD'   },
    ];

    // ── Ícones voadores ────────────────────────────────────────────────────
    interface FloatIcon {
      x: number; y: number; vx: number; vy: number;
      size: number; op: number; phase: number; phaseSpeed: number;
      idx: number; showLabel: boolean;
    }

    let floatIcons: FloatIcon[] = [];

    function spawnIcon(randomY = true): FloatIcon {
      return {
        x: Math.random() * W,
        y: randomY ? Math.random() * H : H + 50,
        vx: (Math.random() - 0.5) * 0.22,
        vy: -(0.12 + Math.random() * 0.30),
        size: 20 + Math.random() * 18,
        op: 0.12 + Math.random() * 0.22,
        phase: Math.random() * Math.PI * 2,
        phaseSpeed: 0.007 + Math.random() * 0.013,
        idx: Math.floor(Math.random() * ALL_ICONS.length),
        showLabel: Math.random() > 0.45,
      };
    }

    function buildIcons() {
      floatIcons = Array.from({ length: 16 }, () => spawnIcon(true));
    }

    function drawFloatIcon(ic: FloatIcon) {
      const glow = Math.sin(ic.phase) * 0.5 + 0.5;
      const op = ic.op * (0.55 + glow * 0.45);
      const s = ic.size * dpr;
      const x = ic.x * dpr - s / 2;
      const y = ic.y * dpr - s / 2;
      ctx.save();
      ctx.globalAlpha = op;
      ctx.drawImage(ALL_ICONS[ic.idx].img, x, y, s, s);
      if (ic.showLabel) {
        ctx.globalAlpha = op * 0.65;
        ctx.fillStyle = '#ffffff';
        ctx.font = `${Math.round(6.5 * dpr)}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(ALL_ICONS[ic.idx].label, ic.x * dpr, (ic.y + ic.size * 0.95) * dpr);
      }
      ctx.restore();
    }

    // ── Partículas de fundo ────────────────────────────────────────────────
    interface Particle {
      x: number; y: number; vx: number; vy: number;
      r: number; baseOp: number; phase: number; phaseSpeed: number;
      kind: 0 | 1 | 2;
    }

    let parts: Particle[] = [];

    function spawnPart(randomY = true): Particle {
      return {
        x: Math.random() * W,
        y: randomY ? Math.random() * H : H + 8,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -(0.12 + Math.random() * 0.35),
        r: 1.0 + Math.random() * 2.2,
        baseOp: 0.10 + Math.random() * 0.22,
        phase: Math.random() * Math.PI * 2,
        phaseSpeed: 0.012 + Math.random() * 0.022,
        kind: Math.floor(Math.random() * 3) as 0 | 1 | 2,
      };
    }

    function buildParts() {
      const n = Math.max(30, Math.min(80, Math.round((W * H) / 12000)));
      parts = Array.from({ length: n }, () => spawnPart(true));
    }

    function drawPart(p: Particle) {
      const glow = Math.sin(p.phase) * 0.5 + 0.5;
      const op = p.baseOp * (0.5 + glow * 0.5);
      const r = p.r * dpr, x = p.x * dpr, y = p.y * dpr;
      ctx.fillStyle = `rgba(255,255,255,${op})`;
      ctx.strokeStyle = `rgba(255,255,255,${op * 0.6})`;
      ctx.lineWidth = dpr * 0.7;
      if (p.kind === 0) {
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      } else if (p.kind === 1) {
        const a = r * 1.9;
        ctx.beginPath(); ctx.moveTo(x-a,y); ctx.lineTo(x+a,y); ctx.moveTo(x,y-a); ctx.lineTo(x,y+a); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.moveTo(x,y-r*1.5); ctx.lineTo(x+r*0.6,y); ctx.lineTo(x,y+r*1.5); ctx.lineTo(x-r*0.6,y); ctx.closePath(); ctx.fill();
      }
    }

    // ── Conexões ───────────────────────────────────────────────────────────
    function drawConnections() {
      ctx.lineWidth = dpr * 0.28;
      for (let i = 0; i < parts.length; i++) {
        for (let j = i + 1; j < parts.length; j++) {
          const dx = parts[i].x - parts[j].x, dy = parts[i].y - parts[j].y;
          const d = Math.sqrt(dx*dx + dy*dy);
          if (d < 110) {
            ctx.beginPath();
            ctx.moveTo(parts[i].x*dpr, parts[i].y*dpr);
            ctx.lineTo(parts[j].x*dpr, parts[j].y*dpr);
            ctx.strokeStyle = `rgba(255,255,255,${(1-d/110)*0.055})`;
            ctx.stroke();
          }
        }
      }
    }

    // ── Streams verticais ──────────────────────────────────────────────────
    interface Stream { x: number; y: number; len: number; speed: number; op: number; }
    let streams: Stream[] = [];

    function buildStreams() {
      const n = Math.max(5, Math.round(W / 110));
      streams = Array.from({ length: n }, () => ({
        x: Math.random() * W, y: Math.random() * H - H,
        len: 35 + Math.random() * 90, speed: 0.4 + Math.random() * 1.1,
        op: 0.03 + Math.random() * 0.07,
      }));
    }

    function drawStreams() {
      for (const s of streams) {
        const x = s.x*dpr, y1 = s.y*dpr, y2 = (s.y+s.len)*dpr;
        const g = ctx.createLinearGradient(x,y1,x,y2);
        g.addColorStop(0, `rgba(255,255,255,0)`);
        g.addColorStop(0.4, `rgba(255,255,255,${s.op})`);
        g.addColorStop(1, `rgba(255,255,255,0)`);
        ctx.lineWidth = dpr*0.45; ctx.beginPath(); ctx.moveTo(x,y1); ctx.lineTo(x,y2);
        ctx.strokeStyle = g; ctx.stroke();
      }
    }

    // ── Grade de perspectiva ───────────────────────────────────────────────
    let gridOffset = 0, keyPulse = 0;

    function drawGrid() {
      const cW = canvas.width, cH = canvas.height;
      const gTop = cH*0.62, gH = cH-gTop, hx = cW/2, hy = gTop;
      ctx.lineWidth = dpr*0.65;
      for (let i = 0; i <= 14; i++) {
        const bx = (i/14)*cW;
        const op = (0.05+keyPulse*0.08)*(1-Math.abs(i/14-0.5)*0.6);
        ctx.beginPath(); ctx.moveTo(hx,hy); ctx.lineTo(bx,cH);
        ctx.strokeStyle=`rgba(255,255,255,${Math.max(0,op)})`; ctx.stroke();
      }
      for (let i = 0; i < 10; i++) {
        const raw = (i+1+gridOffset)/10;
        if (raw<=0||raw>1.1) continue;
        const tc = Math.pow(Math.min(raw,1), 2.5);
        const y = hy+tc*gH, lx = hx-hx*(1-tc), rx = hx+(cW-hx)*(1-tc);
        ctx.beginPath(); ctx.moveTo(lx,y); ctx.lineTo(rx,y);
        ctx.strokeStyle=`rgba(255,255,255,${Math.min(0.03+tc*0.06+keyPulse*0.06,0.15)})`; ctx.stroke();
      }
    }

    // ── Resize ─────────────────────────────────────────────────────────────
    function resize() {
      dpr = getDPR(); W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = Math.round(W*dpr); canvas.height = Math.round(H*dpr);
      buildParts(); buildStreams(); buildIcons();
    }

    function drawStatic() {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      drawConnections(); parts.forEach(drawPart);
      drawStreams(); floatIcons.forEach(drawFloatIcon); drawGrid();
    }

    function drawFrame() {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      gridOffset = (gridOffset+0.003)%1;
      keyPulse = Math.max(0, keyPulse-0.022);

      for (const p of parts) {
        p.x+=p.vx; p.y+=p.vy; p.phase+=p.phaseSpeed;
        if (p.y<-10) Object.assign(p, spawnPart(false));
        if (p.x<-10) p.x=W+10;
        if (p.x>W+10) p.x=-10;
      }
      for (const s of streams) {
        s.y+=s.speed;
        if (s.y>H+20) { s.y=-s.len-Math.random()*H*0.4; s.x=Math.random()*W; s.speed=0.4+Math.random()*1.1; s.op=0.03+Math.random()*0.07; }
      }
      for (const ic of floatIcons) {
        ic.x+=ic.vx; ic.y+=ic.vy; ic.phase+=ic.phaseSpeed;
        if (ic.y<-55) Object.assign(ic, spawnIcon(false));
        if (ic.x<-55) ic.x=W+55;
        if (ic.x>W+55) ic.x=-55;
      }

      drawConnections(); parts.forEach(drawPart);
      drawStreams(); floatIcons.forEach(drawFloatIcon); drawGrid();
    }

    let rafId=0, paused=false;
    function loop() { if(!paused) drawFrame(); rafId=requestAnimationFrame(loop); }
    function handleVisibility() { paused=document.hidden; }
    function handleKeyDown() { keyPulse=Math.min(1,keyPulse+0.5); }

    let resizeTimer=0;
    function handleResize() {
      clearTimeout(resizeTimer);
      resizeTimer=window.setTimeout(()=>{ resize(); if(reduced) drawStatic(); },120);
    }

    resize();

    if (reduced) {
      drawStatic();
      window.addEventListener('resize', handleResize);
      return ()=>{ window.removeEventListener('resize',handleResize); clearTimeout(resizeTimer); };
    }

    loop();
    document.addEventListener('visibilitychange', handleVisibility);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);

    return ()=>{
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
