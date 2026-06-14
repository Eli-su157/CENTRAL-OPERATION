'use client';

import { useEffect, useState } from 'react';

// ALL numbers below are DECORATIVE / SIMULATED — not real system metrics.
function makeValues() {
  const lat = (37.7749 + (Math.random() - 0.5) * 0.001).toFixed(4);
  const lon = (-122.4194 + (Math.random() - 0.5) * 0.001).toFixed(4);
  const mem = (210 + Math.random() * 40).toFixed(1);
  const tx = (1.2 + Math.random() * 0.8).toFixed(2);
  const up = Math.floor(Date.now() / 1000) % 86400;
  const hh = String(Math.floor(up / 3600)).padStart(2, '0');
  const mm = String(Math.floor((up % 3600) / 60)).padStart(2, '0');
  const ss = String(up % 60).padStart(2, '0');
  return { lat, lon, mem, tx, uptime: `${hh}:${mm}:${ss}` };
}

// Neutral placeholder rendered on server (and before first useEffect) to avoid
// hydration mismatch — Math.random() and Date.now() differ between SSR and client.
const PLACEHOLDER = { lat: '37.7749', lon: '-122.4194', mem: '230.0', tx: '1.60', uptime: '00:00:00' };

export default function TelemetryCorners() {
  const [vals, setVals] = useState(PLACEHOLDER);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    setVals(makeValues()); // always seed with a real client-side value on mount
    if (mq.matches) return;

    let id: ReturnType<typeof setInterval> | null = null;

    function start() {
      id = setInterval(() => setVals(makeValues()), 1500);
    }

    function stop() {
      if (id !== null) { clearInterval(id); id = null; }
    }

    function onVisibility() {
      document.hidden ? stop() : start();
    }

    start();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const v = vals;

  const cls =
    'fixed font-mono text-[9px] leading-[1.6] text-white/[0.18] pointer-events-none select-none ' +
    'hidden sm:block z-10';

  return (
    <>
      {/* top-left */}
      <div className={`${cls} top-4 left-4`} aria-hidden="true">
        <div>LAT {v.lat} N</div>
        <div>LON {v.lon} W</div>
        <div>SYS OK</div>
      </div>

      {/* top-right */}
      <div className={`${cls} top-4 right-4 text-right`} aria-hidden="true">
        <div>MEM {v.mem} MB</div>
        <div>TX {v.tx} KB/s</div>
        <div>STREAM ACTIVE</div>
      </div>

      {/* bottom-left */}
      <div className={`${cls} bottom-4 left-4`} aria-hidden="true">
        <div>UPTIME {v.uptime}</div>
        <div>NODE ÆTHER-01</div>
        <div>v2.4.1-rc</div>
      </div>

      {/* bottom-right */}
      <div className={`${cls} bottom-4 right-4 text-right`} aria-hidden="true">
        <div>AUTH MODULE</div>
        <div>PKT {Math.floor(parseFloat(v.tx) * 1000)}</div>
        <div>STATUS NOMINAL</div>
      </div>
    </>
  );
}
