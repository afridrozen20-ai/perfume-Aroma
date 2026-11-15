import React, { useCallback, useEffect, useState } from 'react';
import { Sun, Truck, Check, Copy, Printer, RefreshCw } from 'lucide-react';

type Item = { product_id: string; product_name: string; brand_name: string; selected_size: string; quantity: number };
type Order = {
  id: number; order_number: string; customer_name: string; customer_phone: string; shipping_address: string;
  city_zone: string; total_amount: number | string; payment_status: string; payment_method?: string; age_min?: number | string; order_status: string; created_at: string; items: Item[];
};
type PackRow = { product_id: string; brand: string; name: string; total_ml: number; remaining_ml: number | null; short: boolean; lines: { size: string; ml: number; qty: number }[] };
type Low = { product_id: string; brand: string; name: string; remaining_ml: number; threshold_ml: number; bottle_size_ml: number; status: 'out' | 'low' };
export type TodayData = {
  counts: { new: number; to_pack: number; shipped_today: number; unpaid_advance: number; low_stock: number };
  new_orders: Order[]; to_pack: Order[]; packing: PackRow[]; low_stock: Low[];
};

const ZONE: Record<string, string> = { narsingdi: 'Narsingdi', inside_dhaka: 'Dhaka', outside_dhaka: 'Other districts' };
const money = (n: number | string) => `৳${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
// Minutes come from the database clock (age_min), so phone/server time zones never disagree
const ago = (o: { created_at: string; age_min?: number | string }) => {
  let m: number;
  if (o.age_min !== undefined && o.age_min !== null && o.age_min !== '') m = Math.max(0, Number(o.age_min));
  else {
    const t = new Date(o.created_at.replace(' ', 'T')).getTime();
    if (!t) return '';
    m = Math.max(0, Math.round((Date.now() - t) / 60000));
  }
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
};
const ml = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)}ml`;

type Step = 'new' | 'pack' | 'send' | 'stock';
interface Props { csrfToken: string; demo?: TodayData }

const TodayBoard: React.FC<Props> = ({ csrfToken, demo }) => {
  const [data, setData] = useState<TodayData | null>(demo || null);
  const [loading, setLoading] = useState(!demo);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<number | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [tab, setTab] = useState<Step>('new');
  // Packed ticks are kept per day on this device
  const dayKey = `pp_packed_${new Date().toISOString().slice(0, 10)}`;
  const [packed, setPacked] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(dayKey) || '{}'); } catch { return {}; }
  });
  const togglePacked = (id: string) => {
    setPacked((p) => {
      const n = { ...p, [id]: !p[id] };
      try { localStorage.setItem(dayKey, JSON.stringify(n)); } catch { /* ignore */ }
      return n;
    });
  };

  const load = useCallback(async () => {
    if (demo) return;
    setLoading(true);
    setError('');
    try {
      const r = await fetch('/api/admin/today.php', { headers: { 'X-CSRF-Token': csrfToken } });
      const j = await r.json();
      if (j.success) setData(j.data);
      else setError('Couldn’t load today’s board.');
    } catch {
      setError('Couldn’t load today’s board. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, [csrfToken, demo]);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (o: Order, patch: Record<string, string>) => {
    if (demo) {
      setData((d) => d && moveDemo(d, o, patch));
      return;
    }
    setBusy(o.id);
    try {
      await fetch(`/api/admin/orders.php?id=${o.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        body: JSON.stringify(patch),
      });
      await load();
    } finally {
      setBusy(null);
    }
  };

  const copy = async (key: string, text: string) => {
    try { await navigator.clipboard.writeText(text); } catch { /* ignore */ }
    setCopied(key);
    window.setTimeout(() => setCopied(null), 1400);
  };

  // Cash to collect: offline + paid = nothing; website + advance received = total − ৳200; otherwise the full total
  const cod = (o: Order) => {
    const t = Number(o.total_amount) || 0;
    if (o.payment_status !== 'paid') return t;
    return o.payment_method === 'offline' ? 0 : Math.max(0, t - 200);
  };
  const courierText = (o: Order) =>
    `${o.customer_name}\n${o.customer_phone}\n${o.shipping_address}\nCOD: ${money(cod(o))}\nNote: ${o.items.map((i) => `${i.product_name} ${i.selected_size}×${i.quantity}`).join(', ')}`;

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (loading && !data) return <div className="pp-today"><p className="pp-today__muted">Loading today…</p></div>;
  if (error && !data) return <div className="pp-today"><p className="pp-today__err">{error}</p><button className="pp-today__btn" onClick={load}>Try again</button></div>;
  if (!data) return null;
  const c = data.counts;

  const steps: { id: Step; label: string; n: number; tone: string }[] = [
    { id: 'new', label: 'New', n: data.new_orders.length, tone: c.unpaid_advance ? 'amber' : 'ink' },
    { id: 'pack', label: 'Pack', n: data.packing.length, tone: 'ink' },
    { id: 'send', label: 'Send', n: data.to_pack.length, tone: 'ink' },
    { id: 'stock', label: 'Stock', n: data.low_stock.length, tone: data.low_stock.length ? 'red' : 'ink' },
  ];
  const doneCount = data.packing.filter((p) => packed[p.product_id]).length;

  return (
    <div className="pp-today">
      <header className="pp-today__head">
        <div>
          <p className="pp-today__eyebrow"><Sun className="w-3.5 h-3.5" /> {today}</p>
          <h2 className="pp-today__title">{greet}</h2>
          <p className="pp-today__lead">
            {c.new + c.to_pack === 0
              ? 'All caught up. Nothing waiting right now.'
              : <>You have <b>{c.new} new</b> and <b>{c.to_pack} to send</b>{c.shipped_today ? <> · {c.shipped_today} sent today</> : null}.</>}
          </p>
        </div>
        {!demo && (
          <button className="pp-today__ghost" onClick={load} aria-label="Refresh"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
        )}
      </header>

      {/* Step switcher: one job at a time */}
      <nav className="pp-flow" aria-label="Today's steps">
        {steps.map((st, i) => (
          <React.Fragment key={st.id}>
            <button className={`pp-flow__step ${tab === st.id ? 'is-on' : ''} is-${st.tone}`} onClick={() => setTab(st.id)}>
              <span className="pp-flow__n">{st.n}</span>
              <span className="pp-flow__l">{st.label}</span>
            </button>
            {i < steps.length - 1 && <span className="pp-flow__arrow" aria-hidden="true">›</span>}
          </React.Fragment>
        ))}
      </nav>

      {tab === 'new' && (
        <section className="pp-today__panel" key="new">
          <p className="pp-today__guide"><b>Step 1.</b> Check the ৳200 bKash advance, then confirm the order.</p>
          {data.new_orders.length === 0 ? <Empty text="No new orders. Nice." /> : data.new_orders.map((o) => {
            const paid = o.payment_status === 'paid';
            return (
              <article key={o.id} className="pp-ocard">
                <div className="pp-ocard__top">
                  <div className="min-w-0">
                    <p className="pp-ocard__name">{o.customer_name}</p>
                    <p className="pp-ocard__meta">{o.customer_phone} · {ZONE[o.city_zone] || o.city_zone} · {ago(o)}</p>
                  </div>
                  <p className="pp-ocard__amt">{money(o.total_amount)}</p>
                </div>
                <div className="pp-ocard__chips">
                  {o.items.map((i, k) => <span key={k}>{i.product_name} <b>{i.selected_size}{i.quantity > 1 ? ` ×${i.quantity}` : ''}</b></span>)}
                </div>
                <div className={`pp-ocard__next ${paid ? 'is-ok' : 'is-wait'}`}>
                  <span className="pp-ocard__dot" />
                  {paid ? 'Advance received — ready to confirm' : 'Waiting for ৳200 advance'}
                </div>
                {paid ? (
                  <button className="pp-ocard__go" disabled={busy === o.id} onClick={() => setStatus(o, { order_status: 'confirmed' })}>Confirm order <span>→</span></button>
                ) : (
                  <div className="pp-ocard__two">
                    <button className="pp-ocard__go" disabled={busy === o.id} onClick={() => setStatus(o, { payment_status: 'paid' })}><Check className="w-4 h-4" /> Advance received</button>
                    <button className="pp-ocard__soft" disabled={busy === o.id} onClick={() => setStatus(o, { order_status: 'confirmed' })}>Confirm anyway</button>
                  </div>
                )}
              </article>
            );
          })}
        </section>
      )}

      {tab === 'pack' && (
        <section className="pp-today__panel" key="pack">
          <div className="pp-today__hrow">
            <p className="pp-today__guide"><b>Step 2.</b> Decant bottle by bottle. Tap a bottle when it's done.</p>
            {data.packing.length > 0 && <button className="pp-today__ghost" onClick={() => window.print()} aria-label="Print packing list"><Printer className="w-4 h-4" /></button>}
          </div>
          {data.packing.length > 0 && (
            <div className="pp-pack__progress"><i style={{ width: `${(doneCount / data.packing.length) * 100}%` }} /><span>{doneCount} of {data.packing.length} bottles done</span></div>
          )}
          {data.packing.length === 0 ? <Empty text="Nothing to pack. Confirm an order first." /> : (
            <div className="pp-pack pp-print-area">
              {data.packing.map((p) => {
                const done = !!packed[p.product_id];
                return (
                  <button key={p.product_id} className={`pp-pack__row ${done ? 'is-done' : ''} ${p.short ? 'is-short' : ''}`} onClick={() => togglePacked(p.product_id)}>
                    <span className="pp-pack__tick">{done && <Check className="w-3.5 h-3.5" />}</span>
                    <span className="pp-pack__body">
                      <span className="pp-pack__brand">{p.brand}</span>
                      <span className="pp-pack__name">{p.name}</span>
                      <span className="pp-pack__lines">{p.lines.map((l, k) => <em key={k}>{l.size} × {l.qty}</em>)}</span>
                    </span>
                    <span className="pp-pack__ml">
                      <b>{ml(p.total_ml)}</b>
                      {p.remaining_ml !== null && <small>{p.short ? `Short ${ml(Math.abs(p.remaining_ml))}` : `${ml(p.remaining_ml)} left`}</small>}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {tab === 'send' && (
        <section className="pp-today__panel" key="send">
          <p className="pp-today__guide"><b>Step 3.</b> Copy the details into Steadfast, then mark as sent.</p>
          {data.to_pack.length === 0 ? <Empty text="No parcels waiting." /> : data.to_pack.map((o) => (
            <article key={o.id} className="pp-ocard">
              <div className="pp-ocard__top">
                <div className="min-w-0">
                  <p className="pp-ocard__name">{o.customer_name}</p>
                  <p className="pp-ocard__meta">{o.customer_phone} · {o.shipping_address}</p>
                </div>
                <div className="pp-ocard__cod"><span>Collect</span><b>{money(cod(o))}</b></div>
              </div>
              <div className="pp-ocard__chips">
                {o.items.map((i, k) => <span key={k}>{i.product_name} <b>{i.selected_size}{i.quantity > 1 ? ` ×${i.quantity}` : ''}</b></span>)}
              </div>
              <div className="pp-ocard__two">
                <button className="pp-ocard__soft" onClick={() => copy(`c${o.id}`, courierText(o))}>
                  {copied === `c${o.id}` ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy for courier</>}
                </button>
                <button className="pp-ocard__go" disabled={busy === o.id} onClick={() => setStatus(o, { order_status: 'shipped' })}><Truck className="w-4 h-4" /> Mark as sent</button>
              </div>
            </article>
          ))}
        </section>
      )}

      {tab === 'stock' && (
        <section className="pp-today__panel" key="stock">
          <p className="pp-today__guide"><b>Restock.</b> These bottles are at or under their low mark.</p>
          {data.low_stock.length === 0 ? <Empty text="All bottles are well stocked." /> : (
            <div className="pp-today__lows">
              {data.low_stock.map((l) => {
                const pct = l.bottle_size_ml > 0 ? Math.max(0, Math.min(100, (l.remaining_ml / l.bottle_size_ml) * 100)) : 0;
                return (
                  <div key={l.product_id} className={`pp-today__low is-${l.status}`}>
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="pp-today__lname"><span>{l.brand}</span> {l.name}</p>
                      <p className="pp-today__lml">{l.status === 'out' ? 'Out' : `${ml(l.remaining_ml)} left`}</p>
                    </div>
                    <div className="pp-today__bar"><i style={{ width: `${Math.max(pct, l.status === 'out' ? 0 : 3)}%` }} /></div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
};

const Empty = ({ text }: { text: string }) => <p className="pp-today__empty">{text}</p>;

function moveDemo(d: TodayData, o: Order, patch: Record<string, string>): TodayData {
  const next = { ...d, new_orders: [...d.new_orders], to_pack: [...d.to_pack], counts: { ...d.counts } };
  if (patch.payment_status === 'paid') {
    next.new_orders = next.new_orders.map((x) => (x.id === o.id ? { ...x, payment_status: 'paid' } : x));
    next.counts.unpaid_advance = Math.max(0, next.counts.unpaid_advance - 1);
  }
  if (patch.order_status === 'confirmed') {
    next.new_orders = next.new_orders.filter((x) => x.id !== o.id);
    next.to_pack = [...next.to_pack, { ...o, order_status: 'confirmed' }];
    next.counts.new = next.new_orders.length;
    next.counts.to_pack = next.to_pack.length;
    if (o.payment_status !== 'paid') next.counts.unpaid_advance = Math.max(0, next.counts.unpaid_advance - 1);
  }
  if (patch.order_status === 'shipped') {
    next.to_pack = next.to_pack.filter((x) => x.id !== o.id);
    next.counts.to_pack = next.to_pack.length;
    next.counts.shipped_today += 1;
  }
  return next;
}

export default TodayBoard;
