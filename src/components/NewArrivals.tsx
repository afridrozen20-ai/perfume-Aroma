import React, { useMemo } from 'react';
import { ArrowRight } from 'lucide-react';
import { FragranceProduct } from '../types';
import GlassRail from './GlassRail';

interface NewArrivalsProps {
  products: FragranceProduct[];
  onSelectProduct: (product: FragranceProduct) => void;
  onAddToCart: (product: FragranceProduct, size: string, price: number) => void;
  onNavigateToCollection?: (slug: string) => void;
}

const SHOW = 12;
const timeOf = (p: FragranceProduct) => {
  const t = Date.parse(String((p as any).createdAt || '').replace(' ', 'T'));
  return Number.isFinite(t) ? t : 0;
};

/** Newest perfumes first (the last ones added in admin), with the size & price pop-up. */
export const NewArrivals: React.FC<NewArrivalsProps> = ({
  products,
  onSelectProduct,
  onAddToCart,
  onNavigateToCollection,
}) => {
  const latest = useMemo(
    () =>
      products
        .map((p, i) => ({ p, i, t: timeOf(p) }))
        .filter((x) => x.p.image)
        .sort((a, b) => b.t - a.t || a.i - b.i)
        .slice(0, SHOW)
        .map((x) => x.p),
    [products],
  );
  if (latest.length === 0) return null;

  const seeAll = () => {
    if (onNavigateToCollection) {
      onNavigateToCollection('all');
      window.history.replaceState(window.history.state, '', window.location.pathname + '?sort=newest');
    } else {
      window.location.href = '/collections/all?sort=newest';
    }
  };

  return (
    <section id="new-arrivals" className="pp-sotw pp-new" aria-label="New arrivals">
      <div className="pp-sotw__head">
        <div className="pp-sotw__meta">
          <span className="pp-sotw__live"><i aria-hidden="true" />Just landed</span>
          <span className="pp-sotw__line" aria-hidden="true" />
          <span className="pp-sotw__wk">Latest {latest.length}</span>
        </div>
        <h2 className="pp-sotw__title">
          <span className="pp-sotw__w1">New</span>
          <em className="pp-sotw__w2">arrivals</em>
        </h2>
      </div>

      <GlassRail
        products={latest}
        badge={(_, i) => (i === 0 ? 'Newest' : 'New')}
        onSelectProduct={onSelectProduct}
        onAddToCart={onAddToCart}
      />

      <div className="pp-new__more">
        <button type="button" onClick={seeAll}>
          See all new arrivals <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
};
