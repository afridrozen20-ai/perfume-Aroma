import React, { useEffect, useMemo, useRef, useState } from 'react';
import logoRound from '../../assets/brand/logo-round.webp';
import { thumb } from '../../lib/img';
import { fetchPublicProducts } from '../../services/api';

type Shot = { src: string; ar: number } | null;

/** Loads a product photo, removes a plain light background if it has one, and trims the empty edges. */
export const cutout = (url: string): Promise<Shot> => new Promise((resolve) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    try {
      const w = img.naturalWidth, h = img.naturalHeight;
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const x = c.getContext('2d', { willReadFrequently: true })!;
      x.drawImage(img, 0, 0);
      const data = x.getImageData(0, 0, w, h); const d = data.data;
      if (d[3] > 200) {
        // opaque photo: remove the light backdrop connected to the edges (flood fill), soften the rim
        const isBg = (i: number) => {
          const r = d[i], g = d[i + 1], bl = d[i + 2];
          const mx = Math.max(r, g, bl), mn = Math.min(r, g, bl);
          return r + g + bl > 600 && mx - mn < 45;
        };
        const seen = new Uint8Array(w * h);
        const stack: number[] = [];
        for (let xx = 0; xx < w; xx++) { stack.push(xx, (h - 1) * w + xx); }
        for (let y = 0; y < h; y++) { stack.push(y * w, y * w + w - 1); }
        while (stack.length) {
          const p = stack.pop()!;
          if (seen[p]) continue;
          seen[p] = 1;
          if (!isBg(p * 4)) continue;
          d[p * 4 + 3] = 0;
          const x0 = p % w, y0 = (p / w) | 0;
          if (x0 > 0) stack.push(p - 1);
          if (x0 < w - 1) stack.push(p + 1);
          if (y0 > 0) stack.push(p - w);
          if (y0 < h - 1) stack.push(p + w);
        }
        // feather pixels touching the removed area
        for (let p = 0; p < w * h; p++) {
          if (d[p * 4 + 3] === 0) continue;
          const x0 = p % w, y0 = (p / w) | 0;
          const n = (x0 > 0 && d[(p - 1) * 4 + 3] === 0) || (x0 < w - 1 && d[(p + 1) * 4 + 3] === 0) || (y0 > 0 && d[(p - w) * 4 + 3] === 0) || (y0 < h - 1 && d[(p + w) * 4 + 3] === 0);
          if (n && d[p * 4] + d[p * 4 + 1] + d[p * 4 + 2] > 540) d[p * 4 + 3] = 110;
        }
        x.putImageData(data, 0, 0);
      }
      let minX = w, minY = h, maxX = 0, maxY = 0;
      for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) {
        if (d[(y * w + xx) * 4 + 3] > 24) { if (xx < minX) minX = xx; if (xx > maxX) maxX = xx; if (y < minY) minY = y; if (y > maxY) maxY = y; }
      }
      if (maxX <= minX || maxY <= minY) { resolve(null); return; }
      const cw = maxX - minX + 1, ch = maxY - minY + 1;
      const o = document.createElement('canvas'); o.width = cw; o.height = ch;
      o.getContext('2d')!.drawImage(c, minX, minY, cw, ch, 0, 0, cw, ch);
      resolve({ src: o.toDataURL('image/png'), ar: cw / ch });
    } catch { resolve(null); }
  };
  img.onerror = () => resolve(null);
  img.src = url;
});


/**
 * E — Two perfume bottles drop in beside the round logo ("top, top"), each gives one fine
 * spritz of mist towards the logo ("psst"), then the page opens.
 * Sounds are made with the Web Audio API (no files). Browsers keep sound muted until the
 * visitor has tapped the page once, so a first visit may be silent; the animation always plays.
 */
type Phase = 'in' | 'spray' | 'out';

let ctx: AudioContext | null = null;
const audio = () => {
  try {
    const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
    if (!AC) return null;
    if (!ctx) ctx = new AC();
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  } catch { return null; }
};

/** Soft "top": a low thump plus a tiny glass tick. */
const top = (pitch = 1) => {
  const a = audio(); if (!a) return;
  const t = a.currentTime;
  const o = a.createOscillator(); const g = a.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(320 * pitch, t);
  o.frequency.exponentialRampToValueAtTime(90 * pitch, t + 0.12);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.5, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + 0.2);
  const k = a.createOscillator(); const kg = a.createGain();
  k.type = 'triangle'; k.frequency.setValueAtTime(2400 * pitch, t);
  kg.gain.setValueAtTime(0.0001, t);
  kg.gain.exponentialRampToValueAtTime(0.12, t + 0.004);
  kg.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
  k.connect(kg).connect(a.destination); k.start(t); k.stop(t + 0.1);
};

/** "Psst": a short burst of bright, filtered hiss like an atomizer. */
const psst = () => {
  const a = audio(); if (!a) return;
  const t = a.currentTime, dur = 0.42;
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource(); src.buffer = buf;
  const hp = a.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3200;
  const bp = a.createBiquadFilter(); bp.type = 'peaking'; bp.frequency.value = 6500; bp.gain.value = 6;
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.35, t + 0.03);
  g.gain.setValueAtTime(0.35, t + 0.18);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(hp).connect(bp).connect(g).connect(a.destination);
  src.start(t);
};

const Bottle: React.FC<{ tint: string; deep: string }> = ({ tint, deep }) => (
  <svg viewBox="0 0 70 116" className="pp-bt__svg" aria-hidden="true">
    {/* atomizer: nozzle + silver cap + gold collar */}
    <rect x="27" y="4" width="16" height="16" rx="3" fill="#d9dce1" stroke="#aeb3bb" strokeWidth=".8" />
    <rect x="42" y="9" width="8" height="4" rx="1.5" fill="#c2c6cd" />
    <rect x="23" y="19" width="24" height="9" rx="2" fill="#c9a768" />
    <rect x="23" y="19" width="24" height="3" rx="1.5" fill="#e9d3a0" />
    {/* glass */}
    <rect x="6" y="27" width="58" height="84" rx="12" fill="#ffffff" stroke="#d3d6dc" strokeWidth="1" />
    {/* juice */}
    <rect x="10" y="44" width="50" height="63" rx="9" fill={tint} />
    <rect x="10" y="44" width="50" height="10" rx="5" fill="#ffffff" opacity=".35" />
    <rect x="10" y="88" width="50" height="19" rx="9" fill={deep} opacity=".35" />
    {/* label */}
    <rect x="21" y="64" width="28" height="18" rx="2" fill="#ffffff" opacity=".85" />
    <rect x="25" y="70" width="20" height="1.4" rx=".7" fill="#9a9fa7" />
    <rect x="28" y="74" width="14" height="1.2" rx=".6" fill="#c9a768" />
    {/* shine */}
    <rect x="13" y="32" width="5" height="70" rx="2.5" fill="#ffffff" opacity=".7" />
  </svg>
);

/** Fine mist: many tiny specks in a narrow cone. */
const useMist = (n: number, seed: number) => useMemo(() => {
  let s = seed;
  const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  return Array.from({ length: n }, () => ({
    a: -32 + r() * 34,          // degrees, aimed up and towards the logo
    l: 55 + r() * 95,           // travel px
    z: 1.6 + r() * 2.6,         // speck size px
    d: r() * 0.32,              // delay s
  }));
}, [n, seed]);

export const IntroBottles: React.FC<{ onOpen: () => void; onDone: () => void }> = ({ onOpen, onDone }) => {
  const [phase, setPhase] = useState<Phase | 'wait'>('wait');
  const [shots, setShots] = useState<{ l: Shot; r: Shot }>({ l: null, r: null });
  const timers = useRef<number[]>([]);
  const mistL = useMist(52, 7);
  const mistR = useMist(52, 19);
  const finish = () => { document.documentElement.style.overflow = ''; onDone(); };
  const open = (doneIn: number) => { setPhase('out'); onOpen(); timers.current.push(window.setTimeout(finish, doneIn)); };

  // Use the shop's own Aventus and Good Girl photos; fall back to drawn bottles if they can't load in time
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { onOpen(); onDone(); return; }
    document.documentElement.style.overflow = 'hidden';
    let started = false;
    const unlock = () => audio();
    window.addEventListener('pointerdown', unlock, { once: true });
    const start = () => {
      if (started) return;
      started = true;
      setPhase('in');
      timers.current = [
        window.setTimeout(() => top(1), 980),
        window.setTimeout(() => top(0.86), 1380),
        window.setTimeout(() => { setPhase('spray'); psst(); }, 1900),
        window.setTimeout(() => psst(), 2060),
        window.setTimeout(() => open(750), 2950),
      ];
    };
    const giveUp = window.setTimeout(start, 1200);
    (async () => {
      try {
        const list = await fetchPublicProducts();
        const find = (re: RegExp) => list.find((p) => re.test(p.name));
        const av = find(/^aventus$/i), gg = find(/^good girl$/i);
        const [l, r] = await Promise.all([
          av?.image ? cutout(thumb(av.image, 480)) : Promise.resolve(null),
          gg?.image ? cutout(thumb(gg.image, 480)) : Promise.resolve(null),
        ]);
        if (!started) setShots({ l, r });
      } catch { /* drawn bottles */ }
      start();
    })();
    return () => { window.clearTimeout(giveUp); timers.current.forEach((t) => window.clearTimeout(t)); window.removeEventListener('pointerdown', unlock); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => { document.documentElement.style.overflow = ''; }, []);

  const skip = () => {
    if (phase === 'out') return;
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    open(700);
  };

  return (
    <div className={`pp-bt is-${phase}`} onClick={() => phase !== 'wait' && skip()} aria-hidden="true">
      <div className="pp-bt__stage">
        <img className="pp-bt__logo" src={logoRound} alt="" decoding="async" />

        <div className={`pp-bt__bottle pp-bt__bottle--l ${shots.l ? 'is-photo pp-bt__bottle--av' : ''}`} style={shots.l ? { '--ar': shots.l.ar } as React.CSSProperties : undefined}>
          <div className="pp-bt__drop">{shots.l ? <img className="pp-bt__photo" src={shots.l.src} alt="" /> : <Bottle tint="#f3dfb4" deep="#d9b46e" />}</div>
          <div className="pp-bt__mist">{mistL.map((m, i) => <i key={i} style={{ '--a': `${m.a}deg`, '--l': `${m.l}px`, '--z': `${m.z}px`, '--d': `${m.d}s` } as React.CSSProperties} />)}</div>
        </div>

        <div className={`pp-bt__bottle pp-bt__bottle--r ${shots.r ? 'is-photo pp-bt__bottle--gg' : ''}`} style={shots.r ? { '--ar': shots.r.ar } as React.CSSProperties : undefined}>
          <div className="pp-bt__drop">{shots.r ? <img className="pp-bt__photo" src={shots.r.src} alt="" /> : <Bottle tint="#efe6f0" deep="#c9b3cc" />}</div>
          <div className="pp-bt__mist">{mistR.map((m, i) => <i key={i} style={{ '--a': `${m.a}deg`, '--l': `${m.l}px`, '--z': `${m.z}px`, '--d': `${m.d}s` } as React.CSSProperties} />)}</div>
        </div>
      </div>
    </div>
  );
};

export default IntroBottles;
