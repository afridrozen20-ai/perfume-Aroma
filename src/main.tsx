import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initPerfMode } from './lib/perfMode';

initPerfMode();

const invMatch = window.location.pathname.match(/^\/invoice\/([A-Za-z0-9_-]+)/);
const invParam = new URLSearchParams(window.location.search).get('invoice');
if (invMatch || invParam) {
  // Customer invoice page (link sent on WhatsApp)
  const k = new URLSearchParams(window.location.search).get('k') || '';
  import('./components/InvoicePage').then((m) => {
    const InvoicePage = m.default;
    createRoot(document.getElementById('root')!).render(<InvoicePage orderNumber={(invMatch ? invMatch[1] : invParam) as string} token={k} />);
  });
} else if (window.location.hash === '#today-demo') {
  // Preview of the admin Today board with sample data (no login, not real orders)
  Promise.all([import('./admin/TodayBoard'), import('./admin/todayDemoData')]).then(([m, d]) => {
    const TodayBoard = m.default;
    createRoot(document.getElementById('root')!).render(
      <div style={{ background: '#f6f5f2', minHeight: '100vh', padding: '16px' }}>
        <p style={{ textAlign: 'center', fontSize: 11, letterSpacing: '.2em', color: '#8a8a86', margin: '0 0 12px' }}>DEMO · SAMPLE ORDERS</p>
        <TodayBoard csrfToken="" demo={d.TODAY_DEMO} onOpenCourier={() => { window.location.hash = 'courier-demo'; window.location.reload(); }} />
      </div>,
    );
  });
} else if (window.location.hash === '#courier-demo') {
  // Preview of the admin Courier page with sample parcels (no login, not real orders)
  Promise.all([import('./admin/CourierPage'), import('./admin/todayDemoData')]).then(([m, d]) => {
    const CourierPage = m.default;
    createRoot(document.getElementById('root')!).render(
      <div style={{ background: '#f6f5f2', minHeight: '100vh', padding: '16px' }}>
        <p style={{ textAlign: 'center', fontSize: 11, letterSpacing: '.2em', color: '#8a8a86', margin: '0 0 12px' }}>DEMO · SAMPLE PARCELS · <a href="#today-demo" onClick={() => setTimeout(() => window.location.reload(), 0)} style={{ color: '#141414' }}>BACK TO TODAY</a></p>
        <CourierPage csrfToken="" demo={d.COURIER_DEMO as any} />
      </div>,
    );
  });
} else {
  createRoot(document.getElementById('root')!).render(<App />);
}
