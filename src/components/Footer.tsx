import React from 'react';

interface FooterProps {
  storeSettings?: any;
}

/** Minimal footer: wordmark, Facebook / Instagram / WhatsApp, copyright. */
// Facebook page (set in Store Settings as facebook_url, otherwise this one)
const FACEBOOK_URL = 'https://www.facebook.com/profile.php?id=100063676046868';
export const Footer: React.FC<FooterProps> = ({ storeSettings }) => {
  const year = new Date().getFullYear();
  const whatsapp = String(storeSettings?.contact_phone || '+880 1972-911234').replace(/[^\d]/g, '');
  const facebook = String(storeSettings?.facebook_url || FACEBOOK_URL || '').trim();

  return (
    <footer
      id="account-section"
      className="w-full overflow-hidden"
      style={{
        backgroundColor: 'var(--theme-footer-bg)',
        color: 'var(--theme-footer-text)',
      }}
    >
      <div className="max-w-[1440px] mx-auto px-6 sm:px-8 pt-14 pb-28 md:pb-14 flex flex-col items-center text-center gap-6">
        <span className="flex flex-col items-center gap-2 opacity-95">
          <span className="font-sans text-[6.5vw] sm:text-[3.6vw] lg:text-[2.6vw] font-extralight tracking-[0.28em] pl-[0.28em] uppercase leading-none whitespace-nowrap">
            Pure Portions
          </span>
          <span className="pp-foot__by">by Arrina</span>
        </span>

        <div className="flex items-center gap-6 opacity-80">
          {facebook && (
            <a href={facebook} target="_blank" rel="noreferrer" aria-label="Facebook" className="hover:opacity-100 transition-opacity">
              <svg className="w-[18px] h-[18px] fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"/>
              </svg>
            </a>
          )}
          <a href="https://www.instagram.com/pure_portions_by_arrina" target="_blank" rel="noreferrer" aria-label="Instagram" className="hover:opacity-100 transition-opacity">
            <svg className="w-[18px] h-[18px] fill-current" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
          </a>
          <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="hover:opacity-100 transition-opacity">
            <svg className="w-[18px] h-[18px] fill-current" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm5.8 14.03c-.25.69-1.44 1.32-1.98 1.37-.51.05-1.16.07-1.87-.12-.43-.13-.98-.31-1.69-.62-2.98-1.29-4.92-4.29-5.07-4.49-.15-.2-1.21-1.61-1.21-3.07 0-1.46.77-2.18 1.04-2.48.27-.3.59-.37.79-.37h.57c.18 0 .43-.07.67.51.25.59.84 2.05.91 2.2.07.15.12.32.02.52-.1.2-.15.32-.3.49-.15.17-.31.39-.45.52-.15.15-.3.31-.13.61.17.3.77 1.27 1.65 2.06 1.13 1.01 2.09 1.32 2.39 1.47.3.15.47.12.64-.07.17-.2.74-.86.94-1.16.2-.3.39-.25.66-.15.27.1 1.73.82 2.03.97.3.15.49.22.57.34.07.13.07.72-.18 1.41z"/>
            </svg>
          </a>
        </div>

        <span className="text-[10px] tracking-[0.18em] uppercase opacity-60">
          © {year} Pure Portions by Arrina
        </span>
      </div>
    </footer>
  );
};
