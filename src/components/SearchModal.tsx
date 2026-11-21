import React, { useState, useEffect } from 'react';
import { Search, X, ArrowRight } from 'lucide-react';
import { FragranceProduct } from '../types';
import { thumb } from '../lib/img';
import { fuzzySearch } from '../lib/fuzzySearch';
import { trackSearchSubmission, trackSearchWhenIdle } from '../services/searchTracker';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: FragranceProduct[];
  onSelectProduct: (product: FragranceProduct) => void;
}

const POPULAR_SEARCH_TAGS = ['Vanilla', 'Oud', 'Rose', 'Citrus', 'Amber', 'Niche', 'Arabian', 'Extrait'];

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  products,
  onSelectProduct
}) => {
  const [query, setQuery] = useState('');

  // Record what the customer looked for once they stop typing — most mobile shoppers never press Enter
  useEffect(() => {
    if (!isOpen) return;
    const q = query.trim().toLowerCase();
    if (q.length < 2) return;
    const count = fuzzySearch(products, q, 999).length;
    trackSearchWhenIdle(query, count);
  }, [query, isOpen, products]);

  // Esc to close + lock page scroll while open
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const cleanQuery = query.trim();
  const filtered = cleanQuery === ''
    ? []
    : fuzzySearch(products, cleanQuery);

  const featuredShowcase = products.slice(0, 4);

  const handleSelectPill = (tag: string) => {
    setQuery(tag);
    // Track submitted tag search
    const matching = products.filter(
      (p) =>
        p.name.toLowerCase().includes(tag.toLowerCase()) ||
        p.brand.toLowerCase().includes(tag.toLowerCase()) ||
        p.category.toLowerCase().includes(tag.toLowerCase()) ||
        p.notes?.some((n) => n.toLowerCase().includes(tag.toLowerCase()))
    );
    trackSearchSubmission({
      term: tag,
      productId: matching[0]?.id,
      resultCount: matching.length
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (cleanQuery.length >= 2) {
        trackSearchSubmission({
          term: cleanQuery,
          productId: filtered[0]?.id,
          resultCount: filtered.length
        });
      }
    }
  };

  const handleSelectProductItem = (item: FragranceProduct) => {
    if (cleanQuery.length >= 2) {
      trackSearchSubmission({
        term: cleanQuery,
        productId: item.id,
        resultCount: filtered.length
      });
    }
    onSelectProduct(item);
    onClose();
  };

  return (
    <div className="pp-sx" role="dialog" aria-modal="true" aria-label="Search perfumes" onClick={onClose}>
      <div className="pp-sx__sheet" onClick={(e) => e.stopPropagation()}>
        <div className="pp-sx__head">
          <div>
            <span className="pp-sx__kicker">Search</span>
            <h3 className="pp-sx__title">Find your <em>scent</em></h3>
          </div>
          <button type="button" onClick={onClose} className="pp-sx__close" aria-label="Close search">
            <X className="w-[18px] h-[18px]" strokeWidth={1.8} />
          </button>
        </div>

        <label className="pp-sx__field">
          <span className="pp-sx__icon" aria-hidden="true"><Search className="w-[17px] h-[17px]" strokeWidth={2} /></span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Perfume, brand or note…"
            className="pp-sx__input"
            enterKeyHint="search"
            autoFocus
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} className="pp-sx__clear" aria-label="Clear search">
              <X className="w-3.5 h-3.5" strokeWidth={2.2} />
            </button>
          )}
        </label>

        <div className="pp-sx__body no-scrollbar">
          {cleanQuery === '' ? (
            <>
              <div className="pp-sx__sec">
                <span className="pp-sx__label">Popular searches</span>
                <div className="pp-sx__chips">
                  {POPULAR_SEARCH_TAGS.map((tag) => (
                    <button key={tag} type="button" onClick={() => handleSelectPill(tag)} className="pp-sx__chip">
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
              <div className="pp-sx__sec">
                <span className="pp-sx__label">Trending now</span>
                <div className="pp-sx__list">
                  {featuredShowcase.map((item) => (
                    <button key={item.id} type="button" className="pp-sx__row" onClick={() => { onSelectProduct(item); onClose(); }}>
                      <span className="pp-sx__thumb"><img src={thumb(item.image, 160)} alt="" loading="lazy" /></span>
                      <span className="pp-sx__meta">
                        <span className="pp-sx__brand">{item.brand}</span>
                        <span className="pp-sx__name">{item.name}</span>
                      </span>
                      <ArrowRight className="pp-sx__go w-4 h-4" />
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : filtered.length === 0 ? (
            <div className="pp-sx__empty">
              <p className="pp-sx__empty-t">Nothing found for “{cleanQuery}”</p>
              <p className="pp-sx__empty-s">Try a brand, a note like vanilla or oud, or a shorter word.</p>
              <button type="button" onClick={() => setQuery('')} className="pp-sx__chip">Clear search</button>
            </div>
          ) : (
            <div className="pp-sx__sec">
              <span className="pp-sx__label">{filtered.length} {filtered.length === 1 ? 'result' : 'results'}</span>
              <div className="pp-sx__list">
                {filtered.map((item) => (
                  <button key={item.id} type="button" className="pp-sx__row" onClick={() => handleSelectProductItem(item)}>
                    <span className="pp-sx__thumb"><img src={thumb(item.image, 160)} alt="" loading="lazy" /></span>
                    <span className="pp-sx__meta">
                      <span className="pp-sx__brand">{item.brand}</span>
                      <span className="pp-sx__name">{item.name}</span>
                      <span className="pp-sx__cat">{item.category}</span>
                    </span>
                    <ArrowRight className="pp-sx__go w-4 h-4" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
