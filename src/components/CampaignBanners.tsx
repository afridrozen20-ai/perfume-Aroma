import React from 'react';
import { IMAGES } from '../data/fragranceData';
import { CampaignBannersData } from '../types';

interface CampaignBannersProps {
  onSelectCategory: (gender: 'Him' | 'Her') => void;
  onNavigateToCollection?: (slug: string) => void;
  campaignData?: CampaignBannersData;
}

export const CampaignBanners: React.FC<CampaignBannersProps> = ({ onSelectCategory, onNavigateToCollection, campaignData }) => {
  const sectionTitle = campaignData?.section_title || 'FOR HIM | HER';
  const forHimTitle = campaignData?.for_him_title || 'For Him';
  const forHimButtonText = campaignData?.for_him_button_text || 'SHOP DECANTS';
  // If the admin cleared the image, leave the frame empty (don't fall back to the template photo)
  const forHimImage = campaignData ? (campaignData.for_him_image || '') : IMAGES.campaigns.forHim;

  const forHerTitle = campaignData?.for_her_title || 'For Her';
  const forHerButtonText = campaignData?.for_her_button_text || 'SHOP DECANTS';
  const forHerImage = campaignData ? (campaignData.for_her_image || '') : IMAGES.campaigns.forHer;

  return (
    <section
      id="for-him-her"
      className="w-full pt-8 pb-14 border-b select-none"
      style={{
        backgroundColor: 'var(--theme-surface)',
        borderColor: 'var(--theme-border-subtle)',
      }}
    >
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Right-aligned Section Heading as in screenshot */}
        <div className="flex justify-end mb-4 sm:mb-6">
          <h2
            className="font-serif text-lg sm:text-2xl font-light tracking-[0.16em] uppercase"
            style={{ color: 'var(--theme-primary)' }}
          >
            {sectionTitle}
          </h2>
        </div>

        {/* 2-Column Grid: each banner is one tappable image card (no text bar) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {[
            { key: 'him', title: forHimTitle, cta: forHimButtonText, image: forHimImage, arrow: '#ffffff', go: () => (onNavigateToCollection ? onNavigateToCollection('forhim') : onSelectCategory('Him')) },
            { key: 'her', title: forHerTitle, cta: forHerButtonText, image: forHerImage, arrow: '#5a2a33', go: () => (onNavigateToCollection ? onNavigateToCollection('forher') : onSelectCategory('Her')) },
          ].map((card) => (
            <div
              key={card.key}
              role="link"
              tabIndex={0}
              aria-label={`${card.title} – ${card.cta}`}
              onClick={card.go}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.go(); } }}
              className="group relative cursor-pointer overflow-hidden rounded-md shadow-sm hover:shadow-lg transition-shadow duration-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{ backgroundColor: 'var(--theme-surface-card)' }}
            >
              <div className={`relative aspect-[16/10] sm:aspect-[16/9] w-full overflow-hidden ${card.image ? 'bg-zinc-900' : 'bg-[#f3f3f4]'}`}>
                {card.image ? (
                  <img
                    src={card.image}
                    alt={`${card.title} – luxury perfume decants`}
                    className="w-full h-full object-cover object-center group-hover:scale-[1.03] transition-transform duration-700 ease-out"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center font-serif text-2xl tracking-[0.16em] uppercase text-[#111]">
                    {card.title}
                  </span>
                )}

                {/* Liquid-glass arrow (iOS style) – shows the card is tappable */}
                <span
                  aria-hidden="true"
                  className="absolute right-3 bottom-3 sm:right-4 sm:bottom-4 w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-transform duration-500 group-hover:translate-x-0.5 group-active:scale-95"
                  style={{
                    color: card.arrow,
                    background: 'linear-gradient(145deg, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0.14) 55%, rgba(255,255,255,0.22) 100%)',
                    backdropFilter: 'blur(14px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(14px) saturate(180%)',
                    border: '1px solid rgba(255,255,255,0.55)',
                    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.75), inset 0 -2px 6px rgba(0,0,0,0.10), 0 8px 22px rgba(0,0,0,0.22)',
                  }}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
