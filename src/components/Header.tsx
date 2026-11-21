import logoRound from '../assets/brand/logo-round.webp';
import React, { useState, useRef, useEffect } from 'react';
import { X, Search, Palette, Check, ChevronDown, ShoppingBag, Menu as MenuIcon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import MenuDrawer from './MenuDrawer';

interface HeaderProps {
  cartCount: number;
  onOpenCart: () => void;
  onOpenSearch: () => void;
  onOpenWishlist: () => void;
  onOpenFinder?: () => void;
  onNavigateHome?: () => void;
  onNavigateToCollection?: (slug: string) => void;
  onOpenCollection?: (url: string) => void;
  storeSettings?: any;
}

export const Header: React.FC<HeaderProps> = ({
  cartCount,
  onOpenCart,
  onOpenSearch,
  onOpenFinder,
  onNavigateHome,
  onNavigateToCollection,
  onOpenCollection,
  storeSettings
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { theme, setTheme, themes, currentTheme } = useTheme();

  // Hide while scrolling down, glide back on scroll up; liquid glass once off the top
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const lastY = useRef(0);
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 12);
      const dy = y - lastY.current;
      if (Math.abs(dy) < 6) return;
      setHidden(dy > 0 && y > 120);
      lastY.current = y;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setThemeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCollectionClick = (slug: string) => {
    setMobileMenuOpen(false);
    if (onNavigateToCollection) {
      onNavigateToCollection(slug);
    } else {
      window.location.href = `/collections/${slug}`;
    }
  };

  return (
    <header
      className={`pp-header sticky top-0 z-40 w-full${scrolled ? ' is-glass' : ''}${hidden && !mobileMenuOpen ? ' is-hidden' : ''}`}
    >
      {/* Main Top Navigation matching reference */}
      <div className="w-full px-5 sm:px-8 md:px-12 pt-5 pb-3 flex items-center justify-between">
        {/* Left: Brand Symbol */}
        <div className="flex items-center">
          <a
            href="/"
            onClick={(e) => {
              if (onNavigateHome) {
                e.preventDefault();
                onNavigateHome();
              }
            }}
            className="pp-logo w-12 h-12 sm:w-14 sm:h-14 hover:scale-[1.04] transition-transform duration-300 select-none"
            aria-label="Pure Portions by Arrina — Home"
          >
            <img src={logoRound} alt="Pure Portions by Arrina" width={56} height={56} decoding="async" />
            <span className="pp-sparkle" style={{ top: '14%', right: '16%' }} aria-hidden="true" />
          </a>
        </div>

        {/* Center: Desktop Navigation Links (Shop, Explore Decants, About Us) */}
        <nav
          className="hidden md:flex items-center gap-8 lg:gap-12 text-[13px] font-normal tracking-[0.14em] uppercase"
          style={{ color: 'var(--theme-primary)' }}
        >
          <button
            onClick={() => handleCollectionClick('all')}
            className="hover:opacity-75 transition-opacity cursor-pointer"
          >
            Shop
          </button>
          <button
            onClick={onOpenFinder}
            className="hover:opacity-75 transition-opacity cursor-pointer inline-flex items-center gap-1.5"
          >
            <span>AI Scent Finder</span>
          </button>
          <button
            onClick={() => {
              const el = document.getElementById('new-arrivals');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth' });
              } else {
                handleCollectionClick('all');
              }
            }}
            className="hover:opacity-75 transition-opacity cursor-pointer"
          >
            Explore Decants
          </button>
          <button
            onClick={() => {
              const el = document.getElementById('studio-section') || document.getElementById('why-section');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="hover:opacity-75 transition-opacity cursor-pointer"
          >
            About Us
          </button>
        </nav>

        {/* Right: Actions (Theme Selector, Bag (count), Menu) */}
        <div
          className="flex items-center gap-2.5 sm:gap-5 text-lg lg:text-xl font-medium tracking-tight"
          style={{ color: 'var(--theme-primary)' }}
        >
          <button
            onClick={onOpenSearch}
            className="p-1.5 hover:opacity-70 transition-opacity cursor-pointer inline-flex items-center"
            aria-label="Search perfumes"
          >
            <Search className="w-[21px] h-[21px]" strokeWidth={1.4} />
          </button>

          <button
            onClick={onOpenCart}
            className="relative p-1.5 hover:opacity-70 transition-opacity cursor-pointer inline-flex items-center"
            aria-label={`Shopping Bag (${cartCount})`}
          >
            <ShoppingBag className="w-[22px] h-[22px]" strokeWidth={1.4} />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-[#111] text-white text-[10px] leading-[17px] text-center font-medium tabular-nums">
                {cartCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 hover:opacity-70 transition-opacity cursor-pointer inline-flex items-center"
            aria-label="Open Navigation Menu"
          >
            <MenuIcon className="w-[24px] h-[24px]" strokeWidth={1.3} />
          </button>
        </div>
      </div>

      <MenuDrawer
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        onOpenSearch={onOpenSearch}
        onOpenFinder={onOpenFinder}
        onOpenCollection={(url) => (onOpenCollection ? onOpenCollection(url) : (window.location.href = url))}
        storeSettings={storeSettings}
      />
    </header>
  );
};
