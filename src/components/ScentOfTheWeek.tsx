import React, { useEffect, useMemo, useState } from 'react';
import GlassRail from './GlassRail';
import { FragranceProduct } from '../types';

interface Props {
  products: FragranceProduct[];
  onSelectProduct: (p: FragranceProduct) => void;
  onAddToCart: (p: FragranceProduct, size: string, price: number) => void;
}

interface Pick { product_id: string; gender: string; ml_sold: number }


const ScentOfTheWeek: React.FC<Props> = ({ products, onSelectProduct, onAddToCart }) => {
  const [data, setData] = useState<{ week: number; mode?: string; items: Pick[] } | null>(null);

  useEffect(() => {
    fetch('/api/scent_week.php')
      .then((r) => r.json())
      .then((j) => setData(j.data || null))
      .catch(() => setData(null));
  }, []);

  const picks = useMemo(() => {
    const byId = new Map(products.map((p) => [String(p.id), p]));
    const out: FragranceProduct[] = [];
    (data?.items || []).forEach((it) => {
      const p = byId.get(String(it.product_id));
      if (p && !out.includes(p)) out.push(p);
    });
    // Quiet weeks: top up so him / her / unisex stay balanced (2 each)
    if (data?.mode === 'manual' && out.length > 0) return out.slice(0, 6);
    const gOf = (x: FragranceProduct) => x.gender || 'Unisex';
    for (const g of ['Her', 'Unisex', 'Him', 'Her', 'Unisex', 'Him']) {
      if (out.length >= 6) break;
      if (out.filter((x) => gOf(x) === g).length >= 2) continue;
      const p = products.find((x) => gOf(x) === g && !out.includes(x) && x.image);
      if (p) out.push(p);
    }
    for (const p of products) { if (out.length >= 6) break; if (!out.includes(p) && p.image) out.push(p); }
    return out.slice(0, 6);
  }, [data, products]);

  if (picks.length === 0) return null;

  const week = data?.week ?? 0;

  return (
    <section className="pp-sotw pp-week" aria-label="Scent of the week">
      <div className="pp-week__head">
        <h2 className="pp-week__title">
          <span>This week's</span>
          <em>favourites</em>
        </h2>
        <span className="pp-week__badge"><i aria-hidden="true" />Week {week}</span>
      </div>

      <GlassRail products={picks} badge={(_, i) => String(i + 1).padStart(2, '0')} onSelectProduct={onSelectProduct} onAddToCart={onAddToCart} />
    </section>
  );
};

export default ScentOfTheWeek;
