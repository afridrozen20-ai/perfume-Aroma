import React, { useEffect, useState } from 'react';

/**
 * Opening curtain: satin curtains tied with a gold ribbon. The name appears, the bow unties,
 * the curtains part and warm light spills out as the shop is revealed.
 * Once per visit, ~3s, tap to skip, instant for reduced-motion.
 */
export const CurtainIntro: React.FC<{ onOpen: () => void; onDone: () => void }> = ({ onOpen, onDone }) => {
  const [phase, setPhase] = useState<'name' | 'untie' | 'open'>('name');

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { onOpen(); onDone(); return; }
    document.documentElement.style.overflow = 'hidden';
    const t0 = window.setTimeout(() => setPhase('untie'), 1450);
    const t1 = window.setTimeout(() => { setPhase('open'); onOpen(); }, 1800);
    const t2 = window.setTimeout(() => { document.documentElement.style.overflow = ''; onDone(); }, 3300);
    return () => { [t0, t1, t2].forEach((t) => window.clearTimeout(t)); document.documentElement.style.overflow = ''; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const skip = () => {
    if (phase !== 'name') return;
    setPhase('untie');
    window.setTimeout(() => { setPhase('open'); onOpen(); }, 250);
    window.setTimeout(() => { document.documentElement.style.overflow = ''; onDone(); }, 1700);
  };

  return (
    <div className={`pp-curtain is-${phase}`} onClick={skip} aria-hidden="true">
      <div className="pp-curtain__light" />
      <div className="pp-curtain__half pp-curtain__half--l"><span className="pp-curtain__ribbon" /></div>
      <div className="pp-curtain__half pp-curtain__half--r"><span className="pp-curtain__ribbon" /></div>
      <div className="pp-curtain__rod" />

      <svg className="pp-curtain__bow" viewBox="0 0 120 92" aria-hidden="true">
        <defs>
          <linearGradient id="ppGold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f3e2b8" />
            <stop offset=".45" stopColor="#c9a061" />
            <stop offset=".7" stopColor="#e9d09c" />
            <stop offset="1" stopColor="#9c7438" />
          </linearGradient>
          <linearGradient id="ppGoldDeep" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d9b77a" />
            <stop offset="1" stopColor="#8f6a33" />
          </linearGradient>
        </defs>
        {/* tails */}
        <path d="M56 40 L40 88 L49 82 L54 90 L60 44 Z" fill="url(#ppGoldDeep)" />
        <path d="M64 40 L80 88 L71 82 L66 90 L60 44 Z" fill="url(#ppGoldDeep)" />
        {/* loops */}
        <path d="M58 38 C44 14, 10 10, 8 30 C6 50, 40 50, 58 42 Z" fill="url(#ppGold)" />
        <path d="M62 38 C76 14, 110 10, 112 30 C114 50, 80 50, 62 42 Z" fill="url(#ppGold)" />
        <path d="M58 39 C46 26, 24 24, 20 31" fill="none" stroke="#fff6dc" strokeOpacity=".7" strokeWidth="1.2" />
        <path d="M62 39 C74 26, 96 24, 100 31" fill="none" stroke="#fff6dc" strokeOpacity=".7" strokeWidth="1.2" />
        {/* knot */}
        <rect x="51" y="31" width="18" height="17" rx="5" fill="url(#ppGold)" stroke="#8f6a33" strokeOpacity=".35" />
      </svg>

      <div className="pp-curtain__name">
        <span className="pp-curtain__pure">Pure Portions</span>
        <i className="pp-curtain__line" />
        <span className="pp-curtain__by">by Arrina</span>
      </div>
      <div className="pp-curtain__dust">{Array.from({ length: 9 }, (_, i) => <i key={i} />)}</div>
    </div>
  );
};

export default CurtainIntro;
