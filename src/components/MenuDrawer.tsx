import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, ChevronRight, ChevronDown, Sparkles, Gift, Package, Truck, Ruler, Wallet, ShieldCheck } from 'lucide-react';
import logoRound from '../assets/brand/logo-round.webp';
import { useTheme } from '../context/ThemeContext';

interface Props {
  open: boolean;
  onClose: () => void;
  onOpenSearch: () => void;
  onOpenFinder?: () => void;
  onOpenCollection: (url: string) => void;
  storeSettings?: any;
}

const FACEBOOK_URL = 'https://www.facebook.com/profile.php?id=100063676046868';
const INSTAGRAM_URL = 'https://www.instagram.com/pure_portions_by_arrina';

// Sample combos (to be replaced with the shop's real offers)
const COMBOS = [
  { name: 'The Trio', line: 'Any 3 × 3ml', save: 'Save ৳150' },
  { name: 'Office Pack', line: '3 fresh day scents · 5ml', save: 'Save ৳200' },
  { name: 'Date Night', line: 'His + hers · 5ml each', save: 'Save ৳120' },
];

const SIZE_GUIDE = [
  ['1.5ml', '≈ 20 sprays', 'Try a scent'],
  ['3ml', '≈ 45 sprays', 'About 2 weeks'],
  ['5ml', '≈ 75 sprays', 'About a month'],
  ['10ml', '≈ 150 sprays', '2 months+'],
];

const wa = (phone: string, text: string) => `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;

const MenuDrawer: React.FC<Props> = ({ open, onClose, onOpenSearch, onOpenFinder, onOpenCollection, storeSettings }) => {
  const { theme, setTheme, themes } = useTheme();
  const [panel, setPanel] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);

  const phone = String(storeSettings?.contact_phone || '+880 1972-911234').replace(/[^\d]/g, '');
  const facebook = String(storeSettings?.facebook_url || FACEBOOK_URL);
  const num = (v: any, d: number) => (v !== undefined && v !== null && v !== '' && !isNaN(Number(v)) ? Number(v) : d);
  const fees = [
    ['Narsingdi', num(storeSettings?.shipping_fee_narsingdi, 80)],
    ['Inside Dhaka', num(storeSettings?.shipping_fee_dhaka, 100)],
    ['Outside Dhaka', num(storeSettings?.shipping_fee_outside_dhaka, 130)],
  ] as const;
  const freeAt = num(storeSettings?.free_shipping_threshold, 3000);

  useEffect(() => {
    if (!open) return;
    setClosing(false);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  function close() {
    setClosing(true);
    window.setTimeout(() => { setClosing(false); setPanel(null); onClose(); }, 260);
  }
  const go = (fn: () => void) => () => { fn(); close(); };
  const toggle = (k: string) => setPanel((p) => (p === k ? null : k));

  let n = 0;
  const st = () => ({ '--i': n++ } as React.CSSProperties);

  return createPortal(
    <div className={`pp-menu ${closing ? 'is-closing' : ''}`} role="dialog" aria-modal="true" aria-label="Menu">
      <div className="pp-menu__veil" onClick={close} />
      <aside className="pp-menu__sheet" data-lenis-prevent>
        <header className="pp-menu__top">
          <span className="pp-menu__brand">
            <span className="pp-logo w-10 h-10"><img src={logoRound} alt="" width={40} height={40} /></span>
            <span>
              <b>Pure Portions</b>
              <i>by Arrina</i>
            </span>
          </span>
          <button type="button" className="pp-menu__x" onClick={close} aria-label="Close menu"><X className="w-5 h-5" /></button>
        </header>

        <button type="button" className="pp-menu__search pp-menu__in" style={st()} onClick={go(onOpenSearch)}>
          <Search className="w-4 h-4" /> <span>Search perfumes, e.g. CDN</span>
        </button>

        <div className="pp-menu__tiles pp-menu__in" style={st()}>
          <button type="button" className={`pp-menu__tile pp-menu__tile--combo ${panel === 'combo' ? 'is-on' : ''}`} onClick={() => toggle('combo')}>
            <Gift className="w-5 h-5" />
            <b>Combo offers</b>
            <span>Bundle & save</span>
          </button>
          <button type="button" className={`pp-menu__tile pp-menu__tile--gift ${panel === 'gift' ? 'is-on' : ''}`} onClick={() => toggle('gift')}>
            <Package className="w-5 h-5" />
            <b>Gift box</b>
            <span>With a handwritten note</span>
          </button>
        </div>

        {panel === 'combo' && (
          <div className="pp-menu__drop">
            {COMBOS.map((c) => (
              <a key={c.name} className="pp-menu__combo" href={wa(phone, `Hi! I'd like the "${c.name}" combo (${c.line}).`)} target="_blank" rel="noreferrer">
                <span><b>{c.name}</b><i>{c.line}</i></span>
                <em>{c.save}</em>
              </a>
            ))}
          </div>
        )}
        {panel === 'gift' && (
          <div className="pp-menu__drop">
            <p className="pp-menu__note">Pick your decants, we pack them in a keepsake box with your message, ready to give.</p>
            <a className="pp-menu__cta" href={wa(phone, 'Hi! I want to order a gift box.')} target="_blank" rel="noreferrer">Ask for a gift box</a>
          </div>
        )}

        <p className="pp-menu__label pp-menu__in" style={st()}>Shop</p>
        <nav className="pp-menu__list">
          <button type="button" className="pp-menu__row pp-menu__in" style={st()} onClick={go(() => onOpenCollection('/collections/all?sort=newest'))}>
            <span>New arrivals</span><ChevronRight className="w-4 h-4" />
          </button>
          <div className="pp-menu__row pp-menu__row--chips pp-menu__in" style={st()}>
            {[['For him', 'Him'], ['For her', 'Her'], ['Unisex', 'Unisex']].map(([label, g]) => (
              <button key={g} type="button" onClick={go(() => onOpenCollection(`/collections/all?gender=${g}`))}>{label}</button>
            ))}
          </div>
          <button type="button" className="pp-menu__row pp-menu__in" style={st()} onClick={go(() => onOpenCollection('/collections/all?size=1.5ml'))}>
            <span>1.5ml testers</span><ChevronRight className="w-4 h-4" />
          </button>
          <button type="button" className="pp-menu__row pp-menu__in" style={st()} onClick={go(() => onOpenCollection('/collections/all?sort=best-selling'))}>
            <span>Bestsellers</span><ChevronRight className="w-4 h-4" />
          </button>
          <button type="button" className="pp-menu__row pp-menu__in" style={st()} onClick={go(() => onOpenCollection('/collections/all?maxPrice=500&sort=price-asc'))}>
            <span>Under ৳500</span><ChevronRight className="w-4 h-4" />
          </button>
          <button type="button" className="pp-menu__row pp-menu__in" style={st()} onClick={go(() => onOpenCollection('#seasons'))}>
            <span>Shop by season</span><ChevronRight className="w-4 h-4" />
          </button>
          {onOpenFinder && (
            <button type="button" className="pp-menu__row pp-menu__in" style={st()} onClick={go(onOpenFinder)}>
              <span>AI scent finder</span><Sparkles className="w-4 h-4" />
            </button>
          )}
        </nav>

        <p className="pp-menu__label pp-menu__in" style={st()}>Help</p>
        <div className="pp-menu__list">
          <a className="pp-menu__row pp-menu__in" style={st()} href={wa(phone, 'Hi! Where is my parcel? My order phone number is: ')} target="_blank" rel="noreferrer">
            <span><Truck className="w-4 h-4" />Track my order</span><ChevronRight className="w-4 h-4" />
          </a>
          <button type="button" className="pp-menu__row pp-menu__in" style={st()} onClick={() => toggle('size')} aria-expanded={panel === 'size'}>
            <span><Ruler className="w-4 h-4" />Decant size guide</span><ChevronDown className={`w-4 h-4 pp-menu__chev ${panel === 'size' ? 'is-on' : ''}`} />
          </button>
          {panel === 'size' && (
            <div className="pp-menu__drop pp-menu__table">
              {SIZE_GUIDE.map(([s, sp, d]) => (<div key={s}><b>{s}</b><span>{sp}</span><i>{d}</i></div>))}
            </div>
          )}
          <button type="button" className="pp-menu__row pp-menu__in" style={st()} onClick={() => toggle('ship')} aria-expanded={panel === 'ship'}>
            <span><Wallet className="w-4 h-4" />Delivery and payment</span><ChevronDown className={`w-4 h-4 pp-menu__chev ${panel === 'ship' ? 'is-on' : ''}`} />
          </button>
          {panel === 'ship' && (
            <div className="pp-menu__drop pp-menu__table">
              {fees.map(([z, f]) => (<div key={z}><b>{z}</b><span>৳{f}</span><i /></div>))}
              <p className="pp-menu__note">Cash on delivery. Free delivery over ৳{freeAt}.</p>
            </div>
          )}
          <button type="button" className="pp-menu__row pp-menu__in" style={st()} onClick={() => toggle('auth')} aria-expanded={panel === 'auth'}>
            <span><ShieldCheck className="w-4 h-4" />100% authentic promise</span><ChevronDown className={`w-4 h-4 pp-menu__chev ${panel === 'auth' ? 'is-on' : ''}`} />
          </button>
          {panel === 'auth' && (
            <div className="pp-menu__drop">
              <p className="pp-menu__note">Every decant is filled by hand from the original bottle into a clean glass atomiser. No copies, no mixing.</p>
            </div>
          )}
        </div>

        <a className="pp-menu__wa pp-menu__in" style={st()} href={wa(phone, 'Hi! I want to place an order.')} target="_blank" rel="noreferrer">
          <span><b>Order on WhatsApp</b><i>Usually replies in minutes</i></span>
          <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.08.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35M12.05 21.79h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88a9.82 9.82 0 0 1 6.99 2.9 9.82 9.82 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.88 9.88m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.94L.06 24l6.31-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89a11.82 11.82 0 0 0-3.48-8.41"/></svg>
        </a>

        <div className="pp-menu__foot pp-menu__in" style={st()}>
          <div className="pp-menu__social">
            <a href={facebook} target="_blank" rel="noreferrer" aria-label="Facebook">Facebook</a>
            <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" aria-label="Instagram">Instagram</a>
          </div>
          <div className="pp-menu__themes" aria-label="Colour scheme">
            {themes.map((t) => (
              <button
                key={t.id}
                type="button"
                title={t.name}
                aria-label={t.name}
                className={t.id === theme ? 'is-on' : ''}
                style={{ background: `linear-gradient(135deg, ${t.colors.primary} 50%, ${t.colors.accent} 50%)` }}
                onClick={() => setTheme(t.id)}
              />
            ))}
          </div>
        </div>
      </aside>
    </div>,
    document.body,
  );
};

export default MenuDrawer;
