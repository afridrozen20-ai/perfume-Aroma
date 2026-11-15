import React, { useEffect, useState } from 'react';

/**
 * Opening "perfume mist": a pearl veil with the name in silver-champagne. A spray of mist bursts
 * from the centre and the veil clears outward like scent in the air, revealing the shop.
 * Once per visit, ~2.8s, tap to skip, instant for reduced-motion.
 */
export const CurtainIntro: React.FC<{ onOpen: () => void; onDone: () => void }> = ({ onOpen, onDone }) => {
  const [phase, setPhase] = useState<'name' | 'open'>('name');

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { onOpen(); onDone(); return; }
    document.documentElement.style.overflow = 'hidden';
    const t1 = window.setTimeout(() => { setPhase('open'); onOpen(); }, 1600);
    const t2 = window.setTimeout(() => { document.documentElement.style.overflow = ''; onDone(); }, 3000);
    return () => { [t1, t2].forEach((t) => window.clearTimeout(t)); document.documentElement.style.overflow = ''; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const skip = () => {
    if (phase !== 'name') return;
    setPhase('open'); onOpen();
    window.setTimeout(() => { document.documentElement.style.overflow = ''; onDone(); }, 1300);
  };

  return (
    <div className={`pp-veil is-${phase}`} onClick={skip} aria-hidden="true">
      <div className="pp-veil__sheet">
        <div className="pp-veil__sheen" />
        <div className="pp-veil__glitter">{Array.from({ length: 22 }, (_, i) => <i key={i} />)}</div>
        <div className="pp-veil__name">
          <span className="pp-veil__pure">Pure Portions</span>
          <i className="pp-veil__line"><b /></i>
          <span className="pp-veil__by">by Arrina</span>
        </div>
      </div>
      <div className="pp-veil__mist">{Array.from({ length: 16 }, (_, i) => <i key={i} style={{ '--a': `${i * 22.5}deg` } as React.CSSProperties} />)}</div>
    </div>
  );
};

export default CurtainIntro;
