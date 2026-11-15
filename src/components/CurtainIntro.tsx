import React, { useEffect, useRef, useState } from 'react';
import logoRound from '../assets/brand/logo-round.webp';
import marble from '../assets/brand/marble.webp';

/**
 * Opening: the round logo on marble. The little atomizer on the logo sprays straight at the viewer,
 * the mist rushes towards the screen, droplets land on the glass, then the mist clears to the shop
 * and the droplets slide away. Once per visit, ~4.4s, tap to skip, instant for reduced-motion.
 */
type Phase = 'show' | 'spray' | 'hit' | 'open';

// Droplets on the "glass": [left %, top %, size px, delay s]
const DROPS: [number, number, number, number][] = [
  [18, 22, 34, 0], [72, 16, 22, .05], [55, 38, 46, .02], [30, 55, 26, .09], [82, 48, 38, .04],
  [12, 74, 20, .12], [64, 70, 30, .07], [42, 84, 18, .15], [88, 82, 24, .1], [24, 36, 14, .18],
  [48, 12, 16, .14], [76, 30, 12, .2], [36, 68, 12, .22], [8, 46, 16, .16], [60, 92, 14, .19], [92, 64, 12, .23],
];

export const CurtainIntro: React.FC<{ onOpen: () => void; onDone: () => void }> = ({ onOpen, onDone }) => {
  const [phase, setPhase] = useState<Phase>('show');
  const rootRef = useRef<HTMLDivElement>(null);
  const discRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);

  // Screen position of the atomizer drawn on the logo, so the spray starts exactly there
  const aimAtAtomizer = () => {
    const root = rootRef.current, disc = discRef.current;
    if (!root || !disc) return;
    const r = disc.getBoundingClientRect();
    root.style.setProperty('--sx', `${r.left + r.width * 0.69}px`);
    root.style.setProperty('--sy', `${r.top + r.height * 0.55}px`);
  };

  const finish = () => { document.documentElement.style.overflow = ''; onDone(); };
  const run = (steps: [number, () => void][]) => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = steps.map(([ms, fn]) => window.setTimeout(fn, ms));
  };

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { onOpen(); onDone(); return; }
    document.documentElement.style.overflow = 'hidden';
    run([
      [1150, () => { aimAtAtomizer(); setPhase('spray'); }],
      [2050, () => setPhase('hit')],
      [2350, () => { setPhase('open'); onOpen(); }],
      [4500, finish],
    ]);
    return () => { timers.current.forEach((t) => window.clearTimeout(t)); document.documentElement.style.overflow = ''; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const skip = () => {
    if (phase === 'open') return;
    aimAtAtomizer();
    run([
      [0, () => setPhase('spray')],
      [450, () => setPhase('hit')],
      [650, () => { setPhase('open'); onOpen(); }],
      [2600, finish],
    ]);
  };

  return (
    <div ref={rootRef} className={`pp-intro pp-intro--spray is-${phase}`} onClick={skip} aria-hidden="true">
      <div className="pp-intro__veil">
        <div className="pp-intro__stone" style={{ backgroundImage: `url(${marble})` }} />
        <div className="pp-intro__glow" />
        <div className="pp-intro__glitter">{Array.from({ length: 24 }, (_, i) => <i key={i} />)}</div>

        <div className="pp-intro__stage">
          <div className="pp-intro__logo">
            <svg className="pp-intro__ring" viewBox="0 0 200 200">
              <defs>
                <linearGradient id="ppRing" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#8d929b" />
                  <stop offset=".35" stopColor="#eef0f3" />
                  <stop offset=".65" stopColor="#b9bec6" />
                  <stop offset="1" stopColor="#c8ad7e" />
                </linearGradient>
              </defs>
              <circle cx="100" cy="100" r="97" />
              <circle cx="100" cy="100" r="92.5" />
            </svg>
            <div ref={discRef} className="pp-intro__disc">
              <img src={logoRound} alt="" decoding="async" />
              <span className="pp-intro__sweep" />
            </div>
          </div>
          <p className="pp-intro__tag">Authentic perfume decants</p>
        </div>
      </div>

      {/* the spray rushing towards the screen */}
      <div className="pp-intro__jet">
        <b className="pp-intro__fog" />
        {Array.from({ length: 18 }, (_, i) => (
          <i key={i} style={{ '--a': `${i * 20 + (i % 2) * 9}deg`, '--d': `${(i % 6) * 0.04}s`, '--l': `${18 + (i % 4) * 9}vmax`, '--s': `${6 + (i % 5) * 3}` } as React.CSSProperties} />
        ))}
      </div>
      <div className="pp-intro__haze" />

      {/* droplets that land on the glass */}
      <div className="pp-intro__drops">
        {DROPS.map(([x, y, s, d], i) => (
          <i key={i} style={{ left: `${x}%`, top: `${y}%`, width: s, height: s * 1.08, '--d': `${d}s`, '--fall': `${30 + (i % 4) * 22}px` } as React.CSSProperties} />
        ))}
      </div>
    </div>
  );
};

export default CurtainIntro;
