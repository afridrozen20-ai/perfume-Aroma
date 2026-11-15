import React, { useEffect, useRef, useState } from 'react';
import logoRound from '../assets/brand/logo-round.webp';
import marble from '../assets/brand/marble.webp';

/**
 * Minimal opening: the round logo fades in on soft white marble, a fine silver ring draws,
 * a single breath of mist leaves the little atomizer, then everything dissolves into the shop.
 * Once per visit, ~2.5s, tap to skip, instant for reduced-motion.
 */
export const CurtainIntro: React.FC<{ onOpen: () => void; onDone: () => void }> = ({ onOpen, onDone }) => {
  const [phase, setPhase] = useState<'in' | 'out'>('in');
  const timers = useRef<number[]>([]);

  const finish = () => { document.documentElement.style.overflow = ''; onDone(); };
  const leave = (doneIn: number) => {
    timers.current.forEach((t) => window.clearTimeout(t));
    setPhase('out'); onOpen();
    timers.current = [window.setTimeout(finish, doneIn)];
  };

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { onOpen(); onDone(); return; }
    document.documentElement.style.overflow = 'hidden';
    timers.current = [window.setTimeout(() => leave(800), 1750)];
    return () => { timers.current.forEach((t) => window.clearTimeout(t)); document.documentElement.style.overflow = ''; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`pp-min is-${phase}`} onClick={() => phase === 'in' && leave(700)} aria-hidden="true">
      <div className="pp-min__bg" style={{ backgroundImage: `url(${marble})` }} />
      <div className="pp-min__mark">
        <svg className="pp-min__ring" viewBox="0 0 100 100"><circle cx="50" cy="50" r="49" /></svg>
        <img className="pp-min__logo" src={logoRound} alt="" decoding="async" />
        <span className="pp-min__mist"><i /><i /><i /></span>
      </div>
    </div>
  );
};

export default CurtainIntro;
