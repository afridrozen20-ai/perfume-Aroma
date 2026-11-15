import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Truck, RefreshCw, Search, Copy, Check, MessageCircle, ExternalLink, Phone, ChevronDown } from 'lucide-react';
import CancelBox from './CancelBox';

export type Parcel = {
  id: number; order_number: string; customer_name: string; customer_phone: string; city_zone: string;
  total_amount: number | string; cod_amount?: number; tracking_number: string | null; courier_status: string | null;
  order_status: string; created_at: string; age_min?: number | string; ml_back?: boolean;
};

const SF_LABEL: Record<string, [string, string]> = {
  in_review: ['In review', 'wait'], pending: ['On the way', 'go'], hold: ['On hold', 'warn'],
  delivered_approval_pending: ['Delivered · confirming', 'ok'], partial_delivered_approval_pending: ['Part delivered · confirming', 'warn'],
  cancelled_approval_pending: ['Returning', 'bad'], unknown_approval_pending: ['Check with Steadfast', 'warn'], unknown: ['Check with Steadfast', 'warn'],
  delivered: ['Delivered', 'ok'], partial_delivered: ['Part delivered', 'warn'], cancelled: ['Returned', 'bad'],
};
const ZONE: Record<string, string> = { narsingdi: 'Narsingdi', inside_dhaka: 'Dhaka', outside_dhaka: 'Other districts' };
const money = (n: number | string) => `৳${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
const ago = (p: Parcel) => {
  let m = Number(p.age_min);
  if (!Number.isFinite(m)) { const t = new Date(p.created_at.replace(' ', 'T')).getTime(); m = t ? Math.round((Date.now() - t) / 60000) : 0; }
  m = Math.max(0, m);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
};
export const trackUrl = (code: string) => `https://steadfast.com.bd/t/${encodeURIComponent(code)}`;
const waNumber = (phone: string) => {
  let d = String(phone || '').replace(/\D/g, '');
  if (d.startsWith('0')) d = '88' + d;
  else if (d.length === 10 && d.startsWith('1')) d = '880' + d;
  return d;
};
const statusOf = (p: Parcel): [string, string] => {
  if (p.order_status === 'delivered') return ['Delivered', 'ok'];
  if (p.order_status === 'cancelled') return p.tracking_number ? ['Returned', 'bad'] : ['Cancelled', 'bad'];
  if (p.courier_status) return SF_LABEL[p.courier_status] || [p.courier_status, 'wait'];
  return ['Sent', 'wait'];
};

type Tab = 'way' | 'done' | 'back' | 'all';
const TABS: { id: Tab; label: string }[] = [
  { id: 'way', label: 'On the way' }, { id: 'done', label: 'Delivered' }, { id: 'back', label: 'Returned' }, { id: 'all', label: 'All' },
];
const inTab = (p: Parcel, t: Tab) =>
  t === 'all' || (t === 'way' && p.order_status === 'shipped') || (t === 'done' && p.order_status === 'delivered') || (t === 'back' && p.order_status === 'cancelled');

interface Props { csrfToken: string; demo?: Parcel[] }

const CourierPage: React.FC<Props> = ({ csrfToken, demo }) => {
  const [list, setList] = useState<Parcel[] | null>(demo || null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('way');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<number | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [tracking, setTracking] = useState(false);
  const [trackMsg, setTrackMsg] = useState('');
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    if (demo) return;
    try {
      const r = await fetch('/api/admin/courier.php', { headers: { 'X-CSRF-Token': csrfToken } });
      const j = await r.json();
      if (j.success) { setList(j.data.parcels || []); setError(''); }
      else setError(typeof j.error === 'string' ? j.error : 'Couldn’t load parcels.');
    } catch { setError('Couldn’t reach the server.'); }
  }, [csrfToken, demo]);
  useEffect(() => { load(); }, [load]);

  const copy = async (key: string, text: string) => {
    try { await navigator.clipboard.writeText(text); } catch { /* ignore */ }
    setCopied(key); window.setTimeout(() => setCopied(null), 1500);
  };

  const refresh = async () => {
    setTracking(true); setTrackMsg('');
    try {
      if (demo) {
        await new Promise((r) => setTimeout(r, 900));
        setList((l) => l && l.map((p) => (p.courier_status === 'in_review' ? { ...p, courier_status: 'pending' } : p)));
        setTrackMsg('Updated just now');
        return;
      }
      const r = await fetch('/api/admin/steadfast.php', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        body: JSON.stringify({ action: 'track' }),
      });
      const j = await r.json();
      if (j.success) {
        const fin = (j.data.results || []).filter((x: { final?: string }) => x.final).length;
        setTrackMsg(`Checked ${j.data.checked} parcel${j.data.checked === 1 ? '' : 's'}${fin ? ` · ${fin} finished` : ''} · just now`);
      } else setTrackMsg(typeof j.error === 'string' ? j.error : 'Couldn’t reach Steadfast.');
      await load();
    } catch { setTrackMsg('Couldn’t reach the server.'); }
    finally { setTracking(false); }
  };

  const afterCancel = async (id: number, msg: string) => {
    setToast(msg); window.setTimeout(() => setToast(''), 5000);
    setOpen(null);
    if (demo) setList((l) => l && l.map((p) => (p.id === id ? { ...p, order_status: 'cancelled', ml_back: msg.includes('back') } : p)));
    else await load();
  };

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { way: 0, done: 0, back: 0, all: 0 };
    (list || []).forEach((p) => TABS.forEach((t) => { if (inTab(p, t.id)) c[t.id]++; }));
    return c;
  }, [list]);
  const toHandle = (list || []).filter((p) => p.order_status === 'cancelled' && p.tracking_number && !p.ml_back);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    const digits = s.replace(/\D/g, '');
    return (list || []).filter((p) => (s ? true : inTab(p, tab))).filter((p) => {
      if (!s) return true;
      return p.customer_name.toLowerCase().includes(s) || p.order_number.toLowerCase().includes(s)
        || (p.tracking_number || '').toLowerCase().includes(s)
        || (digits.length >= 4 && String(p.customer_phone).replace(/\D/g, '').includes(digits));
    });
  }, [list, tab, q]);

  const waText = (p: Parcel) => {
    const due = Number(p.cod_amount ?? p.total_amount) || 0;
    return `Hi ${p.customer_name.split(' ')[0]}, your Pure Portions by Arrina order ${p.order_number} is with Steadfast Courier.\n\n`
      + `Track your parcel: ${trackUrl(p.tracking_number || '')}\n`
      + (due > 0 ? `Please keep ${money(due)} ready for the rider.\n` : 'Already paid. Nothing to pay the rider.\n')
      + `\nThank you!`;
  };

  if (!list) {
    return <div className="pp-cour">{error ? <p className="pp-cour__err">{error}</p> : <p className="pp-cour__load">Loading parcels…</p>}</div>;
  }

  return (
    <div className="pp-cour">
      <header className="pp-cour__head">
        <div>
          <p className="pp-cour__eyebrow">Steadfast</p>
          <h2 className="pp-cour__title"><Truck className="w-5 h-5" /> Courier</h2>
        </div>
        <button className="pp-trk__refresh" disabled={tracking} onClick={refresh}>
          <RefreshCw className={`w-3.5 h-3.5 ${tracking ? 'animate-spin' : ''}`} /> {tracking ? 'Checking…' : 'Refresh status'}
        </button>
      </header>
      <p className="pp-cour__hint">{trackMsg || 'Tap Refresh to get the latest from Steadfast. Delivered and returned parcels move by themselves.'}</p>

      {toast && <div className="pp-cxtoast">{toast}</div>}

      {toHandle.length > 0 && (
        <button className="pp-cour__alert" onClick={() => { setTab('back'); setQ(''); setOpen(toHandle[0].id); }}>
          <b>{toHandle.length} parcel{toHandle.length === 1 ? '' : 's'} came back</b>
          <span>Decide if the ml goes back in stock →</span>
        </button>
      )}

      <div className="pp-cour__search">
        <Search className="w-4 h-4" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, phone, order or tracking code" />
      </div>

      {!q && (
        <div className="pp-cour__tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'is-on' : ''} onClick={() => { setTab(t.id); setOpen(null); }}>
              {t.label} <span>{counts[t.id]}</span>
            </button>
          ))}
        </div>
      )}

      <section className="pp-cour__list">
        {shown.length === 0 && <p className="pp-today__empty">{q ? 'No parcel matches that.' : tab === 'way' ? 'No parcels with the courier right now.' : 'Nothing here yet.'}</p>}
        {shown.map((p) => {
          const [label, tone] = statusOf(p);
          const isOpen = open === p.id;
          const code = p.tracking_number || '';
          const needsReturn = p.order_status === 'cancelled' && !!code && !p.ml_back;
          return (
            <article key={p.id} className={`pp-cour__row ${isOpen ? 'is-open' : ''}`}>
              <button className="pp-cour__top" onClick={() => setOpen(isOpen ? null : p.id)} aria-expanded={isOpen}>
                <span className="min-w-0">
                  <span className="pp-trk__name">{p.customer_name} <em>{p.order_number}</em></span>
                  <span className="pp-trk__meta">
                    {code || 'Not via Steadfast'} · {p.order_status === 'shipped' ? `COD ${money(p.cod_amount ?? p.total_amount)} · ` : ''}{ago(p)}
                  </span>
                </span>
                <span className={`pp-trk__st is-${tone}`}>{needsReturn ? 'Returned · check' : label}</span>
                <ChevronDown className="pp-cour__chev w-4 h-4" />
              </button>

              {isOpen && (
                <div className="pp-cour__body">
                  <p className="pp-cour__who">{p.customer_phone} · {ZONE[p.city_zone] || p.city_zone} · Total {money(p.total_amount)}</p>
                  {code ? (
                    <>
                      <div className="pp-cour__link">
                        <span>{trackUrl(code).replace('https://', '')}</span>
                        <button onClick={() => copy(`l${p.id}`, trackUrl(code))}>
                          {copied === `l${p.id}` ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy link</>}
                        </button>
                      </div>
                      <div className="pp-cour__acts">
                        <a className="is-wa" href={`https://wa.me/${waNumber(p.customer_phone)}?text=${encodeURIComponent(waText(p))}`} target="_blank" rel="noreferrer">
                          <MessageCircle className="w-4 h-4" /> Send link
                        </a>
                        <a href={trackUrl(code)} target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4" /> Open</a>
                        <button onClick={() => copy(`c${p.id}`, code)}>{copied === `c${p.id}` ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} Code</button>
                        <a href={`tel:${String(p.customer_phone).replace(/[^\d+]/g, '')}`}><Phone className="w-4 h-4" /> Call</a>
                      </div>
                    </>
                  ) : <p className="pp-cour__who">Sent another way, so there’s no Steadfast tracking link.</p>}

                  {p.order_status === 'shipped' && (
                    <div className="pp-cour__cx"><CancelBox id={p.id} tracking={code || null} label="Cancel parcel" csrfToken={csrfToken} demo={!!demo} onDone={(m) => afterCancel(p.id, m)} /></div>
                  )}
                  {needsReturn && (
                    <div className="pp-ret pp-cour__cx">
                      <p><b>This parcel came back.</b> Put the ml back in stock?</p>
                      <CancelBox id={p.id} label="Handle return" csrfToken={csrfToken} demo={!!demo} onDone={(m) => afterCancel(p.id, m)} />
                    </div>
                  )}
                  {p.order_status === 'cancelled' && p.ml_back && <p className="pp-cour__who">Cancelled · ml is back in stock.</p>}
                </div>
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
};

export default CourierPage;
