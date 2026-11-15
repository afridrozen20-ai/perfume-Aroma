import React, { useEffect, useRef, useState } from 'react';
import logoRound from '../../assets/brand/logo-round.webp';
import { thumb } from '../../lib/img';
import { fetchPublicProducts } from '../../services/api';
import { cutout } from './IntroBottles';

/**
 * F — "Bottle rain": the shop's own perfume bottles pour down onto the page ("dub, dub, dub"),
 * pile up at the bottom, the page sags under the weight and finally drops away with them,
 * revealing the home page. Sounds use the Web Audio API (muted by browsers until the first tap).
 */
type Phase = 'wait' | 'rain' | 'drop';
type Piece = { src: string; ar: number; x: number; y: number; h: number; r: number; delay: number; dur: number };

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
/** Low "dub" thud. */
const dub = (pitch = 1, vol = 0.45) => {
  const a = audio(); if (!a) return;
  const t = a.currentTime;
  const o = a.createOscillator(); const g = a.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(170 * pitch, t);
  o.frequency.exponentialRampToValueAtTime(52 * pitch, t + 0.14);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + 0.22);
};
/** Heavy whoosh + rumble as the page falls. */
const crash = () => {
  const a = audio(); if (!a) return;
  const t = a.currentTime;
  const len = Math.floor(a.sampleRate * 0.7);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.5);
  const src = a.createBufferSource(); src.buffer = buf;
  const f = a.createBiquadFilter(); f.type = 'lowpass';
  f.frequency.setValueAtTime(1800, t); f.frequency.exponentialRampToValueAtTime(140, t + 0.7);
  const g = a.createGain(); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
  src.connect(f).connect(g).connect(a.destination); src.start(t);
  dub(0.6, 0.6);
};

const shuffle = <T,>(arr: T[]) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export const IntroRain: React.FC<{ onOpen: () => void; onDone: () => void }> = ({ onOpen, onDone }) => {
  const [phase, setPhase] = useState<Phase>('wait');
  const [pieces, setPieces] = useState<Piece[]>([]);
  const timers = useRef<number[]>([]);
  const finish = () => { document.documentElement.style.overflow = ''; onDone(); };

  const drop = (doneIn: number) => {
    timers.current.forEach((t) => window.clearTimeout(t));
    setPhase('drop'); crash(); onOpen();
    timers.current = [window.setTimeout(finish, doneIn)];
  };

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { onOpen(); onDone(); return; }
    document.documentElement.style.overflow = 'hidden';
    const unlock = () => audio();
    window.addEventListener('pointerdown', unlock, { once: true });
    let started = false;

    const begin = (shots: { src: string; ar: number }[]) => {
      if (started) return;
      started = true;
      if (!shots.length) { onOpen(); finish(); return; }
      // Lay the bottles into a pile: columns across the screen, each new bottle lands a bit higher
      const W = window.innerWidth, H = window.innerHeight;
      const bh = W < 768 ? 58 : 78;                       // bottle height
      const colW = bh * 0.62;
      const cols = Math.max(4, Math.floor(W / colW));
      const fill = new Array(cols).fill(0);
      const out: Piece[] = shots.map((s, i) => {
        // prefer lower columns so the pile grows evenly
        let c = Math.floor(Math.random() * cols);
        for (let k = 0; k < 3; k++) { const c2 = Math.floor(Math.random() * cols); if (fill[c2] < fill[c]) c = c2; }
        const h = bh * (0.85 + Math.random() * 0.3);
        const y = H - 8 - fill[c] - h;                    // top of the bottle when it lands
        fill[c] += h * 0.62;
        return {
          src: s.src, ar: s.ar, h,
          x: c * colW + (colW - h * s.ar) / 2 + (Math.random() - 0.5) * colW * 0.5,
          y, r: (Math.random() - 0.5) * 36,
          delay: 0.25 + i * (1.7 / shots.length) + Math.random() * 0.05,
          dur: 0.45 + Math.random() * 0.2,
        };
      });
      setPieces(out);
      setPhase('rain');
      // thuds as bottles land (thinned out so it stays a rhythm, not noise)
      const step = Math.max(1, Math.round(out.length / 22));
      timers.current = out.filter((_, i) => i % step === 0).map((p, i) =>
        window.setTimeout(() => dub(0.8 + Math.random() * 0.5, i < 3 ? 0.55 : 0.38), (p.delay + p.dur) * 1000));
      const last = Math.max(...out.map((p) => p.delay + p.dur));
      timers.current.push(window.setTimeout(() => drop(1100), (last + 0.55) * 1000));
    };

    const giveUp = window.setTimeout(() => begin([]), 2600);
    (async () => {
      try {
        const list = await fetchPublicProducts();
        const max = window.innerWidth < 768 ? 46 : 80;
        const pick = shuffle(list.filter((p) => p.image)).slice(0, max);
        const shots = (await Promise.all(pick.map((p) => cutout(thumb(p.image, 160))))).filter(Boolean) as { src: string; ar: number }[];
        window.clearTimeout(giveUp);
        begin(shots.filter((s) => s.ar > 0.25 && s.ar < 1.6));
      } catch { window.clearTimeout(giveUp); begin([]); }
    })();

    return () => { window.clearTimeout(giveUp); timers.current.forEach((t) => window.clearTimeout(t)); window.removeEventListener('pointerdown', unlock); document.documentElement.style.overflow = ''; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`pp-rain is-${phase}`} onClick={() => phase === 'rain' && drop(900)} aria-hidden="true">
      <div className="pp-rain__sheet">
        <img className="pp-rain__logo" src={logoRound} alt="" decoding="async" />
        {pieces.map((p, i) => (
          <img
            key={i}
            className="pp-rain__b"
            src={p.src}
            alt=""
            style={{
              left: p.x, top: p.y, height: p.h, width: p.h * p.ar,
              '--r': `${p.r}deg`, '--d': `${p.delay}s`, '--t': `${p.dur}s`, '--from': `${-(p.y + p.h + 40)}px`,
            } as React.CSSProperties}
          />
        ))}
      </div>
    </div>
  );
};

export default IntroRain;
