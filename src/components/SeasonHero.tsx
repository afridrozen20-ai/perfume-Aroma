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


/** Layered landscape at the bottom of the card, one per season. */
const Land: React.FC<{ season: SeasonName }> = ({ season }) => {
  const id = `pl-${season}`;
  if (season === 'Summer') return (
    <svg className="pp-sh__land pp-sh__land--summer" viewBox="0 0 400 200" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}lit`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#ffd99a" /><stop offset="1" stopColor="#f6b866" /></linearGradient>
        <linearGradient id={`${id}sh`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#d98a48" /><stop offset="1" stopColor="#c06f37" /></linearGradient>
        <linearGradient id={`${id}lit2`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#f7b766" /><stop offset="1" stopColor="#ea9a4e" /></linearGradient>
        <linearGradient id={`${id}sh2`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#c8723a" /><stop offset="1" stopColor="#a85a2c" /></linearGradient>
        <linearGradient id={`${id}fr`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e39b55" /><stop offset="1" stopColor="#b8642f" /></linearGradient>
      </defs>
      {/* far dunes: sunlit face + shadow face split along the crest */}
      <g className="pp-sh__l1">
        <path d="M0 122 C40 108 70 98 110 92 C150 98 170 112 210 120 L210 200 L0 200 Z" fill={`url(#${id}lit)`} />
        <path d="M110 92 C140 104 170 116 210 120 C240 112 270 100 300 94 L300 200 L110 200 Z" fill={`url(#${id}sh)`} opacity=".55" />
        <path d="M210 120 C250 108 270 98 300 94 C340 100 370 110 400 114 L400 200 L210 200 Z" fill={`url(#${id}lit)`} />
        <path d="M0 122 C40 108 70 98 110 92 C140 104 170 116 210 120 C250 108 270 98 300 94 C340 100 370 110 400 114" stroke="#fff1d2" strokeWidth="1.2" fill="none" opacity=".9" />
      </g>
      {/* middle dune */}
      <g className="pp-sh__l2">
        <path d="M0 160 C50 142 100 132 150 128 C200 134 240 150 290 158 L290 200 L0 200 Z" fill={`url(#${id}lit2)`} />
        <path d="M150 128 C190 140 230 152 290 158 C320 150 360 140 400 138 L400 200 L150 200 Z" fill={`url(#${id}sh2)`} />
        <path d="M0 160 C50 142 100 132 150 128 C190 140 230 152 290 158 C320 150 360 140 400 138" stroke="#ffe4b5" strokeWidth="1" fill="none" opacity=".85" />
        <path d="M30 168 C70 158 110 152 140 150 M60 176 C100 166 140 160 170 160" stroke="#fbd193" strokeWidth=".7" fill="none" opacity=".7" />
      </g>
      {/* front sand with ripples */}
      <path d="M0 182 C80 168 160 170 240 180 C300 188 350 178 400 174 L400 200 L0 200 Z" fill={`url(#${id}fr)`} />
      <path d="M20 190 C70 182 120 182 170 188 M220 192 C270 184 320 184 370 186" stroke="#f0b26d" strokeWidth=".8" fill="none" opacity=".75" />
    </svg>
  );
  if (season === 'Winter') {
    const pine = (x: number, y: number, h: number, dark: string) => {
      const w = h * 0.42;
      const tiers = [0, 0.3, 0.58];
      return (
        <g transform={`translate(${x} ${y})`}>
          <rect x={-1.6} y={-h * 0.12} width="3.2" height={h * 0.14} fill="#4a3a33" />
          {tiers.map((t, i) => {
            const top = -h + t * h, base = -h * 0.12 - (2 - i) * h * 0.12, half = w * (0.55 + i * 0.22);
            return (
              <g key={i}>
                <path d={`M0 ${top} L${half} ${base} L${-half} ${base} Z`} fill={dark} />
                <path d={`M0 ${top} L${half * 0.55} ${top + (base - top) * 0.55} L${half * 0.2} ${top + (base - top) * 0.5} L0 ${top + (base - top) * 0.62} L${-half * 0.2} ${top + (base - top) * 0.5} L${-half * 0.55} ${top + (base - top) * 0.55} Z`} fill="#ffffff" opacity=".92" />
                <path d={`M${-half} ${base} L${half} ${base}`} stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" opacity=".9" />
              </g>
            );
          })}
        </g>
      );
    };
    return (
      <svg className="pp-sh__land pp-sh__land--winter" viewBox="0 0 400 200" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <defs>
          <linearGradient id={`${id}lit`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#d4e2f0" /></linearGradient>
          <linearGradient id={`${id}sh`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#a9c1dc" /><stop offset="1" stopColor="#7f9cc0" /></linearGradient>
          <linearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#dfe9f4" /></linearGradient>
        </defs>
        {/* mountains: light face / shadow face */}
        <path d="M-10 140 L60 78 L120 140 Z" fill={`url(#${id}lit)`} />
        <path d="M60 78 L120 140 L84 140 Z" fill={`url(#${id}sh)`} />
        <path d="M80 140 L180 50 L290 140 Z" fill={`url(#${id}lit)`} />
        <path d="M180 50 L290 140 L210 140 C214 120 200 100 196 80 Z" fill={`url(#${id}sh)`} />
        <path d="M250 140 L340 70 L420 140 Z" fill={`url(#${id}lit)`} />
        <path d="M340 70 L420 140 L360 140 Z" fill={`url(#${id}sh)`} />
        <path d="M180 50 L166 64 L174 63 L180 70 L188 62 L196 66 Z M60 78 L52 86 L58 86 L62 92 L68 86 Z M340 70 L330 80 L338 79 L343 85 L350 78 Z" fill="#ffffff" />
        <path d="M0 150 C90 136 170 140 250 150 C320 158 360 146 400 144 L400 200 L0 200 Z" fill="#eef4fa" />
        {pine(34, 178, 54, '#2f5566')}{pine(66, 182, 40, '#3c6476')}{pine(318, 180, 58, '#2f5566')}{pine(352, 184, 42, '#3c6476')}{pine(288, 186, 30, '#4a7286')}{pine(98, 188, 28, '#4a7286')}
        <path d="M0 182 C90 170 180 174 260 182 C320 188 360 180 400 178 L400 200 L0 200 Z" fill={`url(#${id}g)`} />
      </svg>
    );
  }
  if (season === 'Autumn') {
    const tree = (x: number, y: number, r: number, c: string) => (
      <g>
        <rect x={x - 1.4} y={y} width="2.8" height={r * 1.1} fill="#6e4129" />
        <circle cx={x} cy={y - r * 0.2} r={r} fill={c} />
        <circle cx={x - r * 0.55} cy={y + r * 0.15} r={r * 0.65} fill={c} />
        <circle cx={x + r * 0.55} cy={y + r * 0.12} r={r * 0.7} fill={c} />
      </g>
    );
    return (
      <svg className="pp-sh__land pp-sh__land--autumn" viewBox="0 0 400 200" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <path d="M0 132 C70 112 140 118 210 130 C280 142 340 118 400 114 L400 200 L0 200 Z" fill="#dcae7b" opacity=".9" />
        {tree(70, 118, 14, '#d58a44')}{tree(96, 122, 10, '#c4622d')}{tree(300, 118, 15, '#b9542c')}{tree(330, 120, 11, '#e0a04e')}
        <path d="M0 162 C80 142 160 148 230 160 C300 172 350 152 400 150 L400 200 L0 200 Z" fill="#b97a4b" />
        {tree(200, 150, 18, '#c96a33')}{tree(232, 154, 12, '#e3a54f')}
        <path d="M0 184 C90 170 180 176 260 184 C320 190 360 180 400 178 L400 200 L0 200 Z" fill="#8f5534" />
      </svg>
    );
  }
  // Spring
  return (
    <svg className="pp-sh__land pp-sh__land--spring" viewBox="0 0 400 200" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <path d="M0 140 C70 120 150 126 220 140 C290 154 340 132 400 128 L400 200 L0 200 Z" fill="#cfe2bf" />
      <path d="M0 170 C80 150 160 156 240 168 C310 180 350 162 400 160 L400 200 L0 200 Z" fill="#b2d39f" />
      {[[60, 162], [90, 158], [120, 164], [270, 166], [300, 160], [330, 165], [360, 158]].map(([x, y], i) => (
        <g key={i}><circle cx={x} cy={y} r="2.4" fill={i % 2 ? '#f6c5d2' : '#ffffff'} /><circle cx={x} cy={y} r="1" fill="#f0c66a" /></g>
      ))}
      <path d="M0 186 C90 172 190 178 270 186 C330 192 370 182 400 180 L400 200 L0 200 Z" fill="#94c283" />
    </svg>
  );
};

/** Cherry branch reaching in from the top corner (spring only). */
const Branch: React.FC = () => (
  <svg className="pp-sh__branch" viewBox="0 0 200 120" aria-hidden="true">
    <path d="M-10 6 C40 14 80 30 120 56 M60 22 C70 40 72 56 66 74 M100 44 C118 46 134 54 148 70" stroke="#6b4a3a" strokeWidth="3" strokeLinecap="round" fill="none" />
    {[[120, 56], [66, 74], [148, 70], [92, 38], [40, 16], [130, 62], [74, 60], [110, 48], [58, 30], [140, 76]].map(([x, y], i) => (
      <g key={i} transform={`translate(${x} ${y}) rotate(${i * 37})`}>
        {[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx="0" cy="-4.5" rx="3" ry="4.5" transform={`rotate(${a})`} fill={i % 3 === 0 ? '#ffffff' : '#f6c3d1'} />)}
        <circle r="1.6" fill="#e7a2b6" />
      </g>
    ))}
  </svg>
);

export const SeasonArt: React.FC<{ season: SeasonName; scale?: number }> = ({ season, scale = 1 }) => {
  const parts = useMemo(() => {
    const r = rnd(season.length * 97 + 13);
    const n = Math.round((season === 'Winter' ? 22 : season === 'Summer' ? 7 : 9) * scale);
    return Array.from({ length: n }, () => ({
      x: r() * 100, s: r(), d: -r() * 12, t: 9 + r() * 7, sway: 8 + r() * 22,
    }));
  }, [season]);

  return (
      <div className="pp-sh__art" aria-hidden="true">
        <Land season={season} />
        {season === 'Spring' && <Branch />}
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
  );
};

export const SeasonHero: React.FC<{ season: SeasonName; count: number }> = ({ season, count }) => {
  const k = season.toLowerCase();
  const c = COPY[season];

  return (
    <section className={`pp-sh pp-sh--${k}`} aria-label={`${season} perfumes`}>
      <SeasonArt season={season} />

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
