import React, { useRef } from 'react';
import { FragranceProduct, SeasonsGalleryData } from '../types';
import { SeasonsGallery } from './SeasonsGallery';
import { LeafSprig, AtomizerFlourish } from './BrandOrnaments';
import { thumb } from '../lib/img';

/** Placeholder 1.5ml glass vial until a photo is added in the admin */
const TesterVial: React.FC = () => (
  <svg viewBox="0 0 60 120" aria-hidden="true" className="pp-tester__vial">
    <defs>
      <linearGradient id="ppVialGlass" x1="0" x2="1"><stop offset="0" stopColor="#eef0f3" /><stop offset=".45" stopColor="#ffffff" /><stop offset="1" stopColor="#dfe2e7" /></linearGradient>
      <linearGradient id="ppVialJuice" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#f3e2c4" /><stop offset="1" stopColor="#d9b98a" /></linearGradient>
      <linearGradient id="ppVialCap" x1="0" x2="1"><stop offset="0" stopColor="#8d929c" /><stop offset=".5" stopColor="#eef0f3" /><stop offset="1" stopColor="#7b808a" /></linearGradient>
    </defs>
    <rect x="22" y="6" width="16" height="22" rx="3" fill="url(#ppVialCap)" />
    <rect x="20" y="28" width="20" height="84" rx="7" fill="url(#ppVialGlass)" stroke="#cfd3d9" strokeWidth=".8" />
    <rect x="22.5" y="52" width="15" height="57" rx="5" fill="url(#ppVialJuice)" opacity=".9" />
    <rect x="24" y="32" width="2.4" height="74" rx="1.2" fill="#fff" opacity=".85" />
    <text x="30" y="84" textAnchor="middle" fontSize="5.5" fontFamily="Urbanist, sans-serif" fill="#6b5a40" letterSpacing=".6">1.5ML</text>
  </svg>
);

interface HeroProps {
  products?: FragranceProduct[];
  onSelectProduct?: (product: FragranceProduct) => void;
  onExploreClick?: () => void;
  onOrderProduct?: () => void;
  onNavigateToCollection?: (slug: string) => void;
  heroData?: any;
  seasonsData?: SeasonsGalleryData;
  testerData?: { image?: string; title?: string; subtitle?: string };
  onOpenTesters?: () => void;
}

export const Hero: React.FC<HeroProps> = ({
  products = [],
  onExploreClick,
  onNavigateToCollection,
  seasonsData,
  onOpenTesters,
  testerData,
}) => {
  // 1.5ml tester announcement: how many perfumes come as testers, and the lowest tester price
  const testerPrices: number[] = [];
  for (const p of products) {
    const t = (p.sizes || []).find((s) => /^1\.5\s*ml/i.test(String(s.size).trim()));
    if (t && !(t as any).soldOut) testerPrices.push(Number(t.price) || 0);
  }
  const testerCount = testerPrices.length;

  // Touch/hover the wordmark: the light band follows the finger and the glow brightens
  const markRef = useRef<HTMLSpanElement>(null);
  const subRef = useRef<HTMLSpanElement>(null);
  const followLight = (clientX: number) => {
    const el = markRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const fx = Math.min(Math.max(clientX - r.left, 0), r.width);
    // gradient is 300% wide with its highlight in the middle → keep the highlight under the finger
    const p = (0.75 - fx / (2 * r.width)) * 100;
    el.classList.remove('is-releasing');
    el.classList.add('is-touching');
    el.style.backgroundPosition = `${p}% 0`;
    const sub = subRef.current;
    if (sub) { sub.classList.add('is-touching'); sub.style.backgroundPosition = `${p}% 0`; }
  };
  const releaseLight = () => {
    const el = markRef.current;
    if (!el) return;
    el.classList.add('is-releasing');
    el.classList.remove('is-touching');
    el.style.backgroundPosition = '';
    if (subRef.current) { subRef.current.classList.remove('is-touching'); subRef.current.style.backgroundPosition = ''; }
  };
  const seasonCounts: Record<string, number> = {};
  for (const p of products) {
    const ss: string[] = ((p as any).scentProfile?.seasons || []) as string[];
    const all = ss.includes('All Seasons');
    for (const n of ['Summer', 'Winter', 'Spring', 'Autumn']) if (all || ss.includes(n) || (n === 'Autumn' && ss.includes('Fall'))) seasonCounts[n] = (seasonCounts[n] || 0) + 1;
  }
  const testerFrom = testerCount ? Math.min(...testerPrices.filter((n) => n > 0)) : 0;

  return (
    <section
      className="w-full pt-1 sm:pt-2 pb-12 sm:pb-20 select-none"
      style={{
        backgroundColor: 'var(--theme-surface)',
        color: 'var(--theme-primary)',
      }}
    >
      <div className="w-full px-5 sm:px-8 md:px-12">
        {/* Brand header — wordmark on a soft silk photograph, one line of positioning and one action */}
        <div className="pp-h3 select-none">
          <img
            className="pp-h3__bg"
            src={thumb('/uploads/pp-hero-silk.jpg', 720)}
            srcSet={`${thumb('/uploads/pp-hero-silk.jpg', 720)} 720w, /uploads/pp-hero-silk.jpg 1600w`}
            sizes="100vw"
            alt=""
            aria-hidden="true"
          />
          <span className="pp-h3__veil" aria-hidden="true" />
          <div className="pp-h3__inner">
            <span className="pp-kicker pp-h3__kicker">Perfume decant atelier</span>
            <h1 className="pp-h2__mark" aria-label="Pure Portions by Arrina">
              <span className="pp-h2__script">Pure Portions</span>
              <span className="pp-h2__by"><i aria-hidden="true" />By Arrina<i aria-hidden="true" /></span>
            </h1>
            <p className="pp-h2__line">Authentic luxury perfume, decanted by the millilitre.</p>
            <div className="pp-h2__actions">
              <button type="button" className="pp-h2__btn is-solid" onClick={() => (onNavigateToCollection ? onNavigateToCollection('all') : onExploreClick?.())}>Shop all perfumes</button>
            </div>
          </div>
        </div>

        {/* 1.5ml tester feature — image is set in Admin → Homepage → Campaigns */}
        {onOpenTesters && (
          <div className="flex justify-center mb-9 sm:mb-14">
            <button type="button" onClick={onOpenTesters} className="pp-tester" aria-label="Explore 1.5ml testers">
              <span className="pp-tester__media">
                {testerData?.image ? <img src={testerData.image} alt="" loading="lazy" /> : <TesterVial />}
              </span>
              <span className="pp-tester__body">
                <span className="pp-tester__eyebrow"><i>New</i>1.5 ml testers</span>
                <span className="pp-tester__title">{testerData?.title || 'Wear it before you own it.'}</span>
                <span className="pp-tester__sub">
                  {testerData?.subtitle || `${testerCount ? `${testerCount} designer & niche scents` : 'Designer & niche scents'}, ready to try`}
                </span>
                <span className="pp-tester__cta">Explore testers <span aria-hidden="true">→</span></span>
              </span>
            </button>
          </div>
        )}

        {/* Seasonal Boxes Grid - Reusing Seasons Component without Header */}
        <div className="w-full pt-1">
          <SeasonsGallery
            seasonsData={seasonsData}
            onExploreClick={onExploreClick}
            onNavigateToCollection={onNavigateToCollection}
            hideHeader={true}
            seasonCounts={seasonCounts}
          />
        </div>
      </div>
    </section>
  );
};
