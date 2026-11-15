import React, { useEffect, useMemo, useRef, useState } from 'react';
import logoRound from '../../assets/brand/logo-round.webp';

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
  const [phase, setPhase] = useState<Phase>('in');
  const timers = useRef<number[]>([]);
  const mistL = useMist(34, 7);
  const mistR = useMist(34, 19);
  const finish = () => { document.documentElement.style.overflow = ''; onDone(); };
  const open = (doneIn: number) => { setPhase('out'); onOpen(); timers.current.push(window.setTimeout(finish, doneIn)); };

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { onOpen(); onDone(); return; }
    document.documentElement.style.overflow = 'hidden';
    const unlock = () => audio();
    window.addEventListener('pointerdown', unlock, { once: true });
    timers.current = [
      window.setTimeout(() => top(1), 980),
      window.setTimeout(() => top(0.86), 1380),
      window.setTimeout(() => { setPhase('spray'); psst(); }, 1900),
      window.setTimeout(() => psst(), 2060),
      window.setTimeout(() => open(750), 2950),
    ];
    return () => { timers.current.forEach((t) => window.clearTimeout(t)); window.removeEventListener('pointerdown', unlock); document.documentElement.style.overflow = ''; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const skip = () => {
    if (phase === 'out') return;
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    open(700);
  };

  return (
    <div className={`pp-bt is-${phase}`} onClick={skip} aria-hidden="true">
      <div className="pp-bt__stage">
        <img className="pp-bt__logo" src={logoRound} alt="" decoding="async" />

        <div className="pp-bt__bottle pp-bt__bottle--l">
          <div className="pp-bt__drop"><Bottle tint="#f3dfb4" deep="#d9b46e" /></div>
          <div className="pp-bt__mist">{mistL.map((m, i) => <i key={i} style={{ '--a': `${m.a}deg`, '--l': `${m.l}px`, '--z': `${m.z}px`, '--d': `${m.d}s` } as React.CSSProperties} />)}</div>
        </div>

        <div className="pp-bt__bottle pp-bt__bottle--r">
          <div className="pp-bt__drop"><Bottle tint="#efe6f0" deep="#c9b3cc" /></div>
          <div className="pp-bt__mist">{mistR.map((m, i) => <i key={i} style={{ '--a': `${m.a}deg`, '--l': `${m.l}px`, '--z': `${m.z}px`, '--d': `${m.d}s` } as React.CSSProperties} />)}</div>
        </div>
      </div>
    </div>
  );
};

export default IntroBottles;
