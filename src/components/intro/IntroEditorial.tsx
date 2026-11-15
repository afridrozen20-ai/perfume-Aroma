import React, { useEffect, useRef, useState } from 'react';
import logoRound from '../../assets/brand/logo-round.webp';

/**
 * B — Editorial: a warm ivory panel. The logo settles in, the name rises line by line in a
 * fine serif, a silver hairline draws, then the whole panel lifts away with a soft curved edge.
 */
export const IntroEditorial: React.FC<{ onOpen: () => void; onDone: () => void }> = ({ onOpen, onDone }) => {
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
    timers.current = [window.setTimeout(() => leave(1150), 2200)];
    return () => { timers.current.forEach((t) => window.clearTimeout(t)); document.documentElement.style.overflow = ''; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`pp-ed is-${phase}`} onClick={() => phase === 'in' && leave(1000)} aria-hidden="true">
      <div className="pp-ed__panel">
        <div className="pp-ed__inner">
          <img className="pp-ed__logo" src={logoRound} alt="" decoding="async" />
          <h2 className="pp-ed__name">
            <span><b>Pure</b></span>
            <span><b><em>Portions</em></b></span>
          </h2>
          <i className="pp-ed__rule" />
          <p className="pp-ed__by"><span>by Arrina</span></p>
        </div>
        <p className="pp-ed__foot"><span>Authentic perfume decants</span></p>
      </div>
    </div>
  );
};

export default IntroEditorial;
