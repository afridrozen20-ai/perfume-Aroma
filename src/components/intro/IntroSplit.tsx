import React, { useEffect, useRef, useState } from 'react';
import logoRound from '../../assets/brand/logo-round.webp';
import marble from '../../assets/brand/marble.webp';

/**
 * C — Silver line: the logo on soft marble, a silver hairline is drawn across the screen,
 * a glint runs along it, then the screen parts along that line (top up, bottom down).
 */
export const IntroSplit: React.FC<{ onOpen: () => void; onDone: () => void }> = ({ onOpen, onDone }) => {
  const [phase, setPhase] = useState<'in' | 'out'>('in');
  const timers = useRef<number[]>([]);
  const finish = () => { document.documentElement.style.overflow = ''; onDone(); };
  const leave = (doneIn: number) => {
    timers.current.forEach((t) => window.clearTimeout(t));
    setPhase('out'); onOpen();
    timers.current = [window.setTimeout(finish, doneIn)];
  };

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { onOpen(); onDone(); return; }
    document.documentElement.style.overflow = 'hidden';
    timers.current = [window.setTimeout(() => leave(1200), 2100)];
    return () => { timers.current.forEach((t) => window.clearTimeout(t)); document.documentElement.style.overflow = ''; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const half = (side: 'top' | 'bottom') => (
    <div className={`pp-sp__half pp-sp__half--${side}`}>
      <div className="pp-sp__bg" style={{ backgroundImage: `url(${marble})` }} />
      <div className="pp-sp__content">
        <img className="pp-sp__logo" src={logoRound} alt="" decoding="async" />
        <p className="pp-sp__tag">Pure Portions <em>by Arrina</em></p>
      </div>
    </div>
  );

  return (
    <div className={`pp-sp is-${phase}`} onClick={() => phase === 'in' && leave(1100)} aria-hidden="true">
      {half('top')}
      {half('bottom')}
      <i className="pp-sp__line"><b /></i>
    </div>
  );
};

export default IntroSplit;
