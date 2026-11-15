import React, { useEffect, useState } from 'react';

/**
 * Opening curtain: the name appears between two silk curtains, then they part to reveal the shop.
 * Once per visit, ~2.4s, tap to skip, instant for reduced-motion.
 */
export const CurtainIntro: React.FC<{ onOpen: () => void; onDone: () => void }> = ({ onOpen, onDone }) => {
  const [phase, setPhase] = useState<'name' | 'open'>('name');

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { onOpen(); onDone(); return; }
    document.documentElement.style.overflow = 'hidden';
    const t1 = window.setTimeout(() => { setPhase('open'); onOpen(); }, 1350);
    const t2 = window.setTimeout(() => { document.documentElement.style.overflow = ''; onDone(); }, 2700);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); document.documentElement.style.overflow = ''; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const skip = () => {
    if (phase === 'open') return;
    setPhase('open'); onOpen();
    window.setTimeout(() => { document.documentElement.style.overflow = ''; onDone(); }, 1200);
  };

  return (
    <div className={`pp-curtain is-${phase}`} onClick={skip} aria-hidden="true">
      <div className="pp-curtain__half pp-curtain__half--l" />
      <div className="pp-curtain__half pp-curtain__half--r" />
      <div className="pp-curtain__name">
        <span className="pp-curtain__pure">Pure Portions</span>
        <i className="pp-curtain__line" />
        <span className="pp-curtain__by">by Arrina</span>
      </div>
    </div>
  );
};

export default CurtainIntro;
