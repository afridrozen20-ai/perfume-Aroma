import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { FragranceProduct } from '../types';
import { categoryOf, type BrandCategory } from '../lib/brandCategory';
import { thumb } from '../lib/img';

interface BrandItem {
  name: string;
  slug: string;
  image?: string;
  count?: number;
}

interface TrustSectionProps {
  storeSettings?: any;
  products?: FragranceProduct[];
  onNavigateToCollection?: (slug: string) => void;
}

// Fallback curated brand visuals mapping
const BRAND_FALLBACK_IMAGES: Record<string, string> = {
  'arrina': '/src/assets/images/element_pure_portions_bottle_1791911761812.jpg',
  'arrina-atelier': '/src/assets/images/element_pure_portions_bottle_1791911761812.jpg',
  'swiss-arabian': '/src/assets/images/perfume_rose01_1791908158391.jpg',
  'french-avenue': '/src/assets/images/perfume_genesis_leo_1791908160379.jpg',
  'asdaaf': '/src/assets/images/perfume_asdaaf_raneen_1791908163183.jpg',
  'lattafa': '/src/assets/images/season_dark_forest_1791908203381.jpg',
  'armaf': '/src/assets/images/season_dune_red_sun_1791908201156.jpg',
  'creed': '/src/assets/images/studio_social_gold_flacon_1791908204833.jpg',
  'chanel': '/src/assets/images/article_perfume_roses_water_1791908274460.jpg',
  'dior': '/src/assets/images/season_sculptural_roses_1791908202058.jpg',
  'giorgio-armani': '/src/assets/images/studio_social_amber_spray_1791908204588.jpg',
  'dolce-gabbana': '/src/assets/images/element_vanilla_neroli_1791911761343.jpg',
};

const slugify = (text: string) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');


// Designer / niche houses get an elegant serif; Arabian houses a wide, light sans.
const SERIF_HOUSES = new Set([
  'CHANEL', 'DIOR', 'GUCCI', 'PRADA', 'YVES SAINT LAURENT', 'VALENTINO', 'VERSACE', 'BURBERRY', 'KENZO',
  'GIORGIO ARMANI', 'CAROLINA HERRERA', 'DOLCE & GABBANA', 'CHLOÉ', 'CALVIN KLEIN', 'JEAN PAUL GAULTIER',
  'CREED', 'XERJOFF', 'MANCERA', 'NARCISO RODRIGUEZ', 'VIKTOR & ROLF', 'ELIZABETH ARDEN', 'KAYALI',
  'ARIANA GRANDE', 'ESSENTIAL PARFUMS', 'TOM FORD', 'HERMÈS', 'HERMES', 'PARFUMS DE MARLY', 'MAISON MARGIELA',
]);
const brandStyle = (name: string) => (SERIF_HOUSES.has(name.trim().toUpperCase()) ? 'is-serif' : 'is-sans');


const CATEGORY_ORDER: BrandCategory[] = ['Niche', 'Designer', 'Arabian'];
const CATEGORY_NOTE: Record<BrandCategory, string> = {
  Designer: 'Fashion-house icons',
  Niche: 'Artisan & rare',
  Arabian: 'Arabian artistry',
};

export const TrustSection: React.FC<TrustSectionProps> = ({
  storeSettings,
  products = [],
  onNavigateToCollection
}) => {
  const [brandCat, setBrandCat] = useState<'All' | BrandCategory>('All');
  const feeDhaka = storeSettings?.shipping_fee_dhaka || '70';
  const feeOutside = storeSettings?.shipping_fee_outside_dhaka || '130';
  const freeThreshold = storeSettings?.free_shipping_threshold || '3000';

  // Derive dynamic brand items with images and perfume counts
  const brandsList: BrandItem[] = React.useMemo(() => {
    const brandMap = new Map<string, { count: number; image: string; name: string }>();

    products.forEach((p) => {
      if (!p.brand) return;
      const bName = p.brand.trim();
      const existing = brandMap.get(bName);
      if (existing) {
        existing.count += 1;
        if ((!existing.image || !/\.webp$/i.test(existing.image)) && p.image && /\.webp$/i.test(p.image)) {
          existing.image = p.image;
        }
      } else {
        brandMap.set(bName, {
          name: bName,
          count: 1,
          image: p.image || ''
        });
      }
    });

    // Curated catalog fallback brands if products list is minimal
    const defaults = [
      { name: 'SWISS ARABIAN', image: '/src/assets/images/perfume_rose01_1791908158391.jpg', count: 12 },
      { name: 'FRENCH AVENUE', image: '/src/assets/images/perfume_genesis_leo_1791908160379.jpg', count: 8 },
      { name: 'ARRINA ATELIER', image: '/src/assets/images/element_pure_portions_bottle_1791911761812.jpg', count: 6 },
      { name: 'ASDAAF', image: '/src/assets/images/perfume_asdaaf_raneen_1791908163183.jpg', count: 7 },
      { name: 'LATTAFA', image: '/src/assets/images/season_dark_forest_1791908203381.jpg', count: 14 },
      { name: 'ARMAF', image: '/src/assets/images/season_dune_red_sun_1791908201156.jpg', count: 9 },
    ];

    if (brandMap.size === 0) {
      return defaults.map((d) => ({
        name: d.name,
        slug: slugify(d.name),
        image: d.image,
        count: d.count
      }));
    }

    const result: BrandItem[] = [];
    brandMap.forEach((val, key) => {
      const slug = slugify(key);
      const img = val.image || BRAND_FALLBACK_IMAGES[slug] || '/src/assets/images/element_pure_portions_bottle_1791911761812.jpg';
      result.push({
        name: key,
        slug,
        image: img,
        count: val.count
      });
    });

    // Supplement with curated defaults if fewer than 5
    if (result.length < 5) {
      defaults.forEach((d) => {
        const slug = slugify(d.name);
        if (!result.some((r) => r.slug === slug)) {
          result.push({
            name: d.name,
            slug,
            image: d.image,
            count: d.count
          });
        }
      });
    }

    return result;
  }, [products]);

  const handleBrandClick = (slug: string) => {
    if (onNavigateToCollection) {
      onNavigateToCollection(slug);
    } else {
      window.location.href = `/collections/${slug}`;
    }
  };

  return (
    <section
      id="trust-section"
      className="w-full pt-12 pb-16 sm:pb-24 select-none"
      style={{
        backgroundColor: 'var(--theme-surface)',
        color: 'var(--theme-primary)',
      }}
    >
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section 2: Replaced Snapshot with SHOP BY BRANDS */}
        <div id="shop-by-brands" className="pt-4 sm:pt-6">
          <div className="pp-house-head">
            <span className="pp-house-eyebrow">The Houses</span>
            <h3 className="pp-house-title">Shop by House</h3>
            <span className="pp-house-rule" aria-hidden="true" />
            <p className="pp-house-sub">
              {brandsList.length} houses · {products.length} perfumes — from rare niche ateliers to fashion icons and Arabian masters.
            </p>
          </div>

          {/* Category switch: All / Designer / Niche / Arabian */}
          <div className="pp-glass-group pp-brand-tabs mb-5" role="tablist" aria-label="Brand category">
            {(['All', ...CATEGORY_ORDER] as const).map((c) => (
              <button
                key={c}
                type="button"
                role="tab"
                aria-selected={brandCat === c}
                onClick={() => setBrandCat(c)}
                className={`pp-glass-pill${brandCat === c ? ' is-active' : ''}`}
              >
                <span className="pp-glass-pill__size">{c}</span>
              </button>
            ))}
          </div>

          {/* Brands grouped by category */}
          {CATEGORY_ORDER.filter((c) => brandCat === 'All' || brandCat === c).map((cat) => {
            const list = brandsList.filter((b) => categoryOf(b.name) === cat);
            if (!list.length) return null;
            return (
              <div key={cat} className={`pp-house-group is-${cat.toLowerCase()}`}>
                <div className="pp-house-cat">
                  <span className="pp-house-cat__name">{cat}</span>
                  <span className="pp-house-cat__line" aria-hidden="true" />
                  <span className="pp-house-cat__note">{CATEGORY_NOTE[cat]} · {list.length}</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 sm:gap-3">
                  {list.map((brand) => (
                    <button
                      key={brand.slug}
                      type="button"
                      onClick={() => handleBrandClick(brand.slug)}
                      className="group pp-house-card"
                      aria-label={`${brand.name} – ${brand.count} perfumes`}
                    >
                      <span className="pp-house-card__name">{brand.name}</span>
                      <span className="pp-house-card__bar" aria-hidden="true" />
                      <span className="pp-house-card__count">{brand.count} {brand.count === 1 ? 'perfume' : 'perfumes'}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
