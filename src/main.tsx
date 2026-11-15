import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initPerfMode } from './lib/perfMode';

initPerfMode();

if (window.location.hash === '#today-demo') {
  // Preview of the admin Today board with sample data (no login, not real orders)
  Promise.all([import('./admin/TodayBoard'), import('./admin/todayDemoData')]).then(([m, d]) => {
    const TodayBoard = m.default;
    createRoot(document.getElementById('root')!).render(
      <div style={{ background: '#f6f5f2', minHeight: '100vh', padding: '16px' }}>
        <p style={{ textAlign: 'center', fontSize: 11, letterSpacing: '.2em', color: '#8a8a86', margin: '0 0 12px' }}>DEMO · SAMPLE ORDERS</p>
        <TodayBoard csrfToken="" demo={d.TODAY_DEMO} />
      </div>,
    );
  });
} else {
  createRoot(document.getElementById('root')!).render(<App />);
}
