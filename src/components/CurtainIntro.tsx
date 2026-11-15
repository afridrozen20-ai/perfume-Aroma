import React, { useEffect, useRef, useState } from 'react';
import logoRound from '../assets/brand/logo-round.webp';
import marble from '../assets/brand/marble.webp';

/**
 * Opening built around the round logo: a silver ring draws, the marble logo rises with a light sweep,
 * the little atomizer on the logo sprays a soft mist, then the logo glides into its place in the header
 * while the marble veil clears outward. Once per visit, ~3.2s, tap to skip, instant for reduced-motion.
 */
export const CurtainIntro: React.FC<{ onOpen: () => void; onDone: () => void }> = ({ onOpen, onDone }) => {
  const [phase, setPhase] = useState<'show' | 'spray' | 'lift' | 'open'>('show');
  const rootRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);

  // Where the header logo sits, so the intro logo can glide right into it
  const aimAtHeader = () => {
    const root = rootRef.current, logo = logoRef.current;
    if (!root || !logo) return;
    const target = document.querySelector('header .pp-logo img, .pp-logo img') as HTMLElement | null;
    const from = (logo.querySelector('.pp-intro__disc') as HTMLElement | null || logo).getBoundingClientRect();
    if (target) {
      const to = target.getBoundingClientRect();
      if (to.width > 0) {
        root.style.setProperty('--tx', `${to.left + to.width / 2 - (from.left + from.width / 2)}px`);
        root.style.setProperty('--ty', `${to.top + to.height / 2 - (from.top + from.height / 2)}px`);
        root.style.setProperty('--ts', `${to.width / from.width}`);
        return;
      }
    }
    root.style.setProperty('--tx', '0px'); root.style.setProperty('--ty', '-40px'); root.style.setProperty('--ts', '.4');
  };

  const open = () => { aimAtHeader(); setPhase('open'); onOpen(); };

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { onOpen(); onDone(); return; }
    document.documentElement.style.overflow = 'hidden';
    const t0 = window.setTimeout(() => setPhase('spray'), 1250);
    const tl = window.setTimeout(() => setPhase('lift'), 2250);
    const t1 = window.setTimeout(open, 2650);
    const t2 = window.setTimeout(() => { document.documentElement.style.overflow = ''; onDone(); }, 4100);
    return () => { [t0, tl, t1, t2].forEach((t) => window.clearTimeout(t)); document.documentElement.style.overflow = ''; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const skip = () => {
    if (phase === 'open') return;
    open();
    window.setTimeout(() => { document.documentElement.style.overflow = ''; onDone(); }, 1300);
  };

  return (
    <div ref={rootRef} className={`pp-intro is-${phase}`} onClick={skip} aria-hidden="true">
      <div className="pp-intro__veil">
        <div className="pp-intro__stone" style={{ backgroundImage: `url(${marble})` }} />
        <div className="pp-intro__marble" style={{ backgroundImage: `url(${logoRound})` }} />
        <div className="pp-intro__glow" />
        <div className="pp-intro__glitter">{Array.from({ length: 24 }, (_, i) => <i key={i} />)}</div>
      </div>

      <div className="pp-intro__burst" />
      <div className="pp-intro__stage">
        <div ref={logoRef} className="pp-intro__logo">
 <span className="pp-intro__halo" />
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
          <div className="pp-intro__disc">
            <img src={logoRound} alt="" decoding="async" />
            <span className="pp-intro__sweep" />
          </div>
          {/* mist from the little atomizer on the logo */}
          <div className="pp-intro__spray">
            <b className="pp-intro__puff" />
            {Array.from({ length: 22 }, (_, i) => <i key={i} style={{ '--a': `${-80 + i * 7}deg`, '--d': `${(i % 5) * 0.06}s`, '--l': `${170 + (i % 3) * 60}px` } as React.CSSProperties} />)}
            {Array.from({ length: 14 }, (_, i) => <em key={i} style={{ '--a': `${-75 + i * 11}deg`, '--d': `${0.1 + (i % 4) * 0.08}s`, '--l': `${120 + (i % 4) * 55}px` } as React.CSSProperties} />)}
          </div>
        </div>
        <p className="pp-intro__tag">Authentic perfume decants</p>
      </div>
    </div>
  );
};

export default CurtainIntro;
