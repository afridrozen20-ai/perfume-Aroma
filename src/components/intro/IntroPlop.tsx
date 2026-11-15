import React, { useEffect, useRef, useState } from 'react';

/**
 * D — "Plop": two big cartoon poops drop onto the name with a plop sound each,
 * then squash flat ("splosh") and the page opens.
 * Sound uses the Web Audio API (no file). Browsers block sound until the visitor has tapped,
 * so on a first visit the sound may stay silent; the animation always plays.
 */
type Phase = 'in' | 'squish' | 'out';

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

const plop = (pitch = 1) => {
  const a = audio(); if (!a) return;
  const t = a.currentTime;
  const o = a.createOscillator(); const g = a.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(420 * pitch, t);
  o.frequency.exponentialRampToValueAtTime(70 * pitch, t + 0.16);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.6, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  o.connect(g).connect(a.destination);
  o.start(t); o.stop(t + 0.25);
};

const splosh = () => {
  const a = audio(); if (!a) return;
  const t = a.currentTime;
  const len = Math.floor(a.sampleRate * 0.35);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
  const src = a.createBufferSource(); src.buffer = buf;
  const f = a.createBiquadFilter(); f.type = 'lowpass';
  f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(120, t + 0.35);
  const g = a.createGain(); g.gain.setValueAtTime(0.7, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
  src.connect(f).connect(g).connect(a.destination);
  src.start(t);
};

const Poop: React.FC<{ className: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 120 110" aria-hidden="true">
    <ellipse cx="60" cy="102" rx="50" ry="6" fill="rgba(0,0,0,.12)" />
    <path d="M10 92 C6 74 26 66 38 68 C30 56 40 44 54 46 C50 34 58 22 66 14 C68 28 80 32 82 44 C96 44 102 56 92 66 C106 66 116 78 110 92 C104 102 18 104 10 92 Z" fill="#7b4a25" />
    <path d="M22 84 C40 90 80 90 100 84" stroke="#4a2a12" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity=".6" />
    <path d="M38 66 C52 72 74 72 88 66" stroke="#4a2a12" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity=".6" />
    <path d="M52 46 C60 50 72 50 80 46" stroke="#4a2a12" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity=".6" />
    <ellipse cx="40" cy="78" rx="7" ry="3" fill="#fff" opacity=".28" />
    <ellipse cx="56" cy="58" rx="5" ry="2.4" fill="#fff" opacity=".28" />
  </svg>
);

export const IntroPlop: React.FC<{ onOpen: () => void; onDone: () => void }> = ({ onOpen, onDone }) => {
  const [phase, setPhase] = useState<Phase>('in');
  const timers = useRef<number[]>([]);
  const finish = () => { document.documentElement.style.overflow = ''; onDone(); };

  useEffect(() => {
    document.documentElement.style.overflow = 'hidden';
    const unlock = () => audio();
    window.addEventListener('pointerdown', unlock, { once: true });
    timers.current = [
      window.setTimeout(() => plop(1), 820),
      window.setTimeout(() => plop(0.8), 1320),
      window.setTimeout(() => { setPhase('squish'); splosh(); }, 2200),
      window.setTimeout(() => { setPhase('out'); onOpen(); }, 2650),
      window.setTimeout(finish, 3400),
    ];
    return () => { timers.current.forEach((t) => window.clearTimeout(t)); window.removeEventListener('pointerdown', unlock); document.documentElement.style.overflow = ''; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`pp-plop is-${phase}`} aria-hidden="true">
      <div className="pp-plop__stage">
        <h2 className="pp-plop__name">Pure Portions</h2>
        <Poop className="pp-plop__poo pp-plop__poo--1" />
        <Poop className="pp-plop__poo pp-plop__poo--2" />
      </div>
    </div>
  );
};

export default IntroPlop;
