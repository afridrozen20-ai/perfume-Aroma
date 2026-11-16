import React, { useMemo } from 'react';

/**
 * Animated header for a season collection: Summer (sun + heat haze), Winter (snowfall),
 * Autumn (falling leaves), Spring (drifting petals). Pure CSS/SVG, no images.
 */
export type SeasonName = 'Summer' | 'Winter' | 'Autumn' | 'Spring';

const COPY: Record<SeasonName, { eyebrow: string; line: string }> = {
  Summer: { eyebrow: 'Hot days · bright scents', line: 'Fresh citrus, aquatic and green scents that stay crisp in the heat.' },
  Winter: { eyebrow: 'Cold nights · warm trails', line: 'Amber, oud, vanilla and spice that keep you warm in the cold.' },
  Autumn: { eyebrow: 'Golden light · cosy layers', line: 'Woods, leather, tobacco and soft spice for crisp evenings.' },
  Spring: { eyebrow: 'Fresh air · first blooms', line: 'Light florals and soft fruits for sunny, easy days.' },
};

const rnd = (seed: number) => { let s = seed; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; };

export const isSeason = (s: string | undefined | null): s is SeasonName =>
  s === 'Summer' || s === 'Winter' || s === 'Autumn' || s === 'Spring';

export const SeasonHero: React.FC<{ season: SeasonName; count: number }> = ({ season, count }) => {
  const parts = useMemo(() => {
    const r = rnd(season.length * 97 + 13);
    const n = season === 'Winter' ? 22 : season === 'Summer' ? 7 : 9;
    return Array.from({ length: n }, () => ({
      x: r() * 100, s: r(), d: -r() * 12, t: 9 + r() * 7, sway: 8 + r() * 22,
    }));
  }, [season]);

  const k = season.toLowerCase();
  const c = COPY[season];

  return (
    <section className={`pp-sh pp-sh--${k}`} aria-label={`${season} perfumes`}>
      <div className="pp-sh__art" aria-hidden="true">
        {season === 'Summer' && (
          <>
            <span className="pp-sh__sun"><i /></span>
            <svg className="pp-sh__haze" viewBox="0 0 400 120" preserveAspectRatio="none">
              {[0, 1, 2, 3].map((i) => (
                <path key={i} style={{ animationDelay: `${-i * 1.6}s` }}
                  d="M-20 60 Q 30 40 80 60 T 180 60 T 280 60 T 380 60 T 480 60" />
              ))}
            </svg>
            {parts.map((p, i) => <b key={i} className="pp-sh__glint" style={{ left: `${p.x}%`, animationDelay: `${p.d}s`, animationDuration: `${p.t * 0.6}s` }} />)}
          </>
        )}
        {season === 'Winter' && (
          <>
            <svg className="pp-sh__peaks" viewBox="0 0 400 80" preserveAspectRatio="none">
              <path d="M0 80 L0 52 L48 22 L86 46 L132 10 L180 44 L222 26 L268 50 L318 16 L362 42 L400 30 L400 80 Z" />
              <path className="pp-sh__peaks2" d="M0 80 L0 62 L60 40 L110 60 L170 36 L230 62 L290 42 L350 60 L400 48 L400 80 Z" />
            </svg>
            {parts.map((p, i) => (
              <b key={i} className="pp-sh__snow" style={{
                left: `${p.x}%`, width: 2 + p.s * 5, height: 2 + p.s * 5, opacity: 0.5 + p.s * 0.5,
                animationDelay: `${p.d}s`, animationDuration: `${p.t}s`, '--sway': `${p.sway}px`,
              } as React.CSSProperties} />
            ))}
          </>
        )}
        {season === 'Autumn' && parts.map((p, i) => (
          <svg key={i} className="pp-sh__leaf" viewBox="0 0 24 24" style={{
            left: `${p.x}%`, width: 14 + p.s * 14, height: 14 + p.s * 14,
            animationDelay: `${p.d}s`, animationDuration: `${p.t + 2}s`, '--sway': `${p.sway * 1.5}px`,
            color: ['#c4622d', '#e0913b', '#a8452a', '#d8a34a'][i % 4],
          } as React.CSSProperties}>
            <path d="M12 2c3 3 7 5 9 9-3 0-5 1-6 3 1 2 1 4 0 7-1-2-2-3-3-4-1 1-2 2-3 4-1-3-1-5 0-7-1-2-3-3-6-3 2-4 6-6 9-9z" fill="currentColor" />
          </svg>
        ))}
        {season === 'Spring' && parts.map((p, i) => (
          <svg key={i} className="pp-sh__petal" viewBox="0 0 20 20" style={{
            left: `${p.x}%`, width: 10 + p.s * 10, height: 10 + p.s * 10,
            animationDelay: `${p.d}s`, animationDuration: `${p.t + 3}s`, '--sway': `${p.sway * 2}px`,
            color: ['#f4b6c8', '#f7cfd9', '#ffffff', '#e9a7bd'][i % 4],
          } as React.CSSProperties}>
            <path d="M10 1 C15 5 15 13 10 19 C5 13 5 5 10 1Z" fill="currentColor" />
          </svg>
        ))}
      </div>

      <span className="pp-sh__grain" aria-hidden="true" />
      <span className="pp-sh__sheen" aria-hidden="true" />
      <div className="pp-sh__copy">
        <p className="pp-sh__eyebrow"><i />The {season} Edit<i /></p>
        <h1 className="pp-sh__title">{season} <em>Perfumes</em></h1>
        <p className="pp-sh__line">{c.line}</p>
        <p className="pp-sh__meta"><span>{count} scents</span><span>{c.eyebrow}</span></p>
      </div>
    </section>
  );
};

export default SeasonHero;
