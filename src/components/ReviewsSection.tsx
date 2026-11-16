import React, { useRef, useState, useEffect } from 'react';
import { Star, ChevronLeft, ChevronRight, Pause, Play, Quote } from 'lucide-react';
import { REVIEWS_LIST } from '../data/fragranceData';
import { ReviewItem } from '../types';
import { CUSTOMER_REVIEWS } from '../data/customerReviews';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

type Card = { id: string; content: string; author: string; rating?: number; product?: string; source?: string };

const ReviewCard: React.FC<{ rev: Card; wide?: boolean }> = ({ rev, wide }) => (
  <div className={`pp-rev ${wide ? 'pp-rev--wide' : ''}`}>
    <div className="pp-rev__body">
      <Quote className="w-4 h-4 pp-rev__q" />
      <p className="pp-rev__text">"{rev.content}"</p>
    </div>
    <div className="pp-rev__foot">
      {rev.product && <span className="pp-rev__prod">{rev.product}</span>}
      {!rev.source && rev.rating ? (
        <span className="pp-rev__stars">{[...Array(rev.rating)].map((_, i) => <Star key={i} className="w-3 h-3 fill-amber-500 text-amber-500" />)}</span>
      ) : null}
      <p className="pp-rev__who"><b>{rev.author}</b>{rev.source && <i>via {rev.source}</i>}</p>
    </div>
  </div>
);

interface ReviewsSectionProps {
  reviews?: ReviewItem[];
}

export const ReviewsSection: React.FC<ReviewsSectionProps> = ({ reviews }) => {
  const base: Card[] = (reviews && reviews.length > 0 ? reviews : REVIEWS_LIST).map((r) => ({ id: String(r.id), content: r.content, author: r.author, rating: r.rating }));
  const allReviews: Card[] = [...base, ...CUSTOMER_REVIEWS];
  const reviewsData = allReviews.slice(0, 18);
  const [showAll, setShowAll] = useState(false);
  useEffect(() => {
    if (!showAll) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setShowAll(false);
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [showAll]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -320, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 320, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        if (scrollLeft + clientWidth >= scrollWidth - 10) {
          scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          scrollRef.current.scrollBy({ left: 300, behavior: 'smooth' });
        }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <section
      className="w-full pt-14 pb-16 border-b select-none transition-colors"
      style={{
        backgroundColor: 'var(--theme-surface)',
        borderColor: 'var(--theme-border-subtle)',
      }}
    >
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Heading and Description */}
          <div className="lg:col-span-4 space-y-4 pr-4">
            <p
              className="text-[10px] tracking-[0.22em] font-sans uppercase font-bold"
              style={{ color: 'var(--theme-secondary)' }}
            >
              REVIEWS
            </p>
            
            <h2
              className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal tracking-tight leading-[1.12]"
              style={{ color: 'var(--theme-primary)' }}
            >
              Worn. Loved. Repeated.
            </h2>

            <p
              className="text-xs sm:text-sm font-sans font-light leading-relaxed max-w-sm opacity-80"
              style={{ color: 'var(--theme-text-secondary)' }}
            >
              Unfiltered words from people who actually wear them - the true feedbacks.
            </p>

            <div className="pt-2">
              <button
                onClick={() => setShowAll(true)}
                className="inline-flex items-center justify-center text-[11px] sm:text-xs tracking-[0.14em] uppercase px-6 py-3 transition-colors cursor-pointer border rounded-xs hover:opacity-90"
                style={{
                  backgroundColor: 'var(--theme-btn-bg)',
                  color: 'var(--theme-btn-text)',
                  borderColor: 'var(--theme-border)',
                }}
              >
                View all {allReviews.length} reviews
              </button>
            </div>
          </div>

          {/* Right Column: Horizontal Cards Carousel */}
          <div className="lg:col-span-8 flex flex-col justify-between">
            <div
              ref={scrollRef}
              className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth pb-4 -mx-4 px-4 sm:mx-0 sm:px-0"
            >
              {reviewsData.map((rev) => <ReviewCard key={rev.id} rev={rev} />)}
            </div>

            {/* Bottom Controls Row: Swipe Hint & Arrows */}
            <div
              className="flex items-center justify-between pt-4 mt-2 border-t"
              style={{ borderColor: 'var(--theme-border-subtle)' }}
            >
              <span
                className="text-[10px] tracking-[0.2em] uppercase font-sans opacity-70"
                style={{ color: 'var(--theme-secondary)' }}
              >
                SWIPE TO SEE MORE →
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  aria-label={isPlaying ? 'Pause review autoplay' : 'Play review autoplay'}
                  className="w-7 h-7 sm:w-8 sm:h-8 border flex items-center justify-center transition-colors cursor-pointer"
                  style={{
                    backgroundColor: 'var(--theme-surface-card)',
                    borderColor: 'var(--theme-border-subtle)',
                    color: 'var(--theme-primary)',
                  }}
                >
                  {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                </button>
                <button
                  onClick={scrollLeft}
                  aria-label="Previous review"
                  className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center transition-colors cursor-pointer"
                  style={{
                    backgroundColor: 'var(--theme-btn-bg)',
                    color: 'var(--theme-btn-text)',
                  }}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={scrollRight}
                  aria-label="Next review"
                  className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center transition-colors cursor-pointer"
                  style={{
                    backgroundColor: 'var(--theme-btn-bg)',
                    color: 'var(--theme-btn-text)',
                  }}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {showAll && createPortal(
        <div className="pp-revall" role="dialog" aria-modal="true" aria-label="All reviews">
          <div className="pp-revall__veil" onClick={() => setShowAll(false)} />
          <div className="pp-revall__sheet" data-lenis-prevent>
            <header className="pp-revall__head">
              <div>
                <p>Reviews · {allReviews.length}</p>
                <h3>Worn. Loved. <em>Repeated.</em></h3>
              </div>
              <button type="button" onClick={() => setShowAll(false)} aria-label="Close reviews"><X className="w-5 h-5" /></button>
            </header>
            <div className="pp-revall__grid">
              {allReviews.map((rev) => <ReviewCard key={rev.id} rev={rev} wide />)}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </section>
  );
};
