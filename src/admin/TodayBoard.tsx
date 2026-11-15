import React, { useCallback, useEffect, useState } from 'react';
import { Sun, PackageCheck, AlertTriangle, Truck, Check, Copy, Printer, RefreshCw, Wallet } from 'lucide-react';

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

interface Props { csrfToken: string; demo?: TodayData }

const TodayBoard: React.FC<Props> = ({ csrfToken, demo }) => {
  const [data, setData] = useState<TodayData | null>(demo || null);
  const [loading, setLoading] = useState(!demo);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<number | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

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

  if (loading && !data) return <div className="pp-today"><p className="pp-today__muted">Loading today…</p></div>;
  if (error && !data) return <div className="pp-today"><p className="pp-today__err">{error}</p><button className="pp-today__btn" onClick={load}>Try again</button></div>;
  if (!data) return null;
  const c = data.counts;

  return (
    <div className="pp-today">
      <header className="pp-today__head">
        <div>
          <p className="pp-today__eyebrow"><Sun className="w-3.5 h-3.5" /> {today}</p>
          <h2 className="pp-today__title">Today</h2>
        </div>
        {!demo && (
          <button className="pp-today__ghost" onClick={load} aria-label="Refresh"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
        )}
      </header>

      {/* At a glance */}
      <div className="pp-today__stats">
        <Stat label="New orders" value={c.new} tone={c.new ? 'ink' : 'mute'} />
        <Stat label="Advance to check" value={c.unpaid_advance} tone={c.unpaid_advance ? 'amber' : 'mute'} />
        <Stat label="To pack" value={c.to_pack} tone={c.to_pack ? 'ink' : 'mute'} />
        <Stat label="Low stock" value={c.low_stock} tone={c.low_stock ? 'red' : 'mute'} />
      </div>

      {/* 1. New orders */}
      <section className="pp-today__card">
        <h3 className="pp-today__h"><Wallet className="w-4 h-4" /> New orders <span>{data.new_orders.length}</span></h3>
        <p className="pp-today__hint">Check the ৳200 bKash advance, then confirm.</p>
        {data.new_orders.length === 0 ? <Empty text="No new orders right now." /> : data.new_orders.map((o) => (
          <div key={o.id} className="pp-today__order">
            <div className="pp-today__orow">
              <div className="min-w-0">
                <p className="pp-today__oname">{o.customer_name} <em>{o.order_number}</em></p>
                <p className="pp-today__osub">{o.customer_phone} · {ZONE[o.city_zone] || o.city_zone} · {ago(o)}</p>
              </div>
              <p className="pp-today__total">{money(o.total_amount)}</p>
            </div>
            <p className="pp-today__items">{o.items.map((i) => `${i.product_name} ${i.selected_size}${i.quantity > 1 ? ` ×${i.quantity}` : ''}`).join(' · ')}</p>
            <div className="pp-today__actions">
              {o.payment_status === 'paid'
                ? <span className="pp-today__pill is-ok"><Check className="w-3 h-3" /> Advance received</span>
                : <button className="pp-today__pill" disabled={busy === o.id} onClick={() => setStatus(o, { payment_status: 'paid' })}>Mark advance received</button>}
              <button className="pp-today__btn" disabled={busy === o.id} onClick={() => setStatus(o, { order_status: 'confirmed' })}>Confirm order</button>
            </div>
          </div>
        ))}
      </section>

      {/* 2. Packing list */}
      <section className="pp-today__card">
        <div className="pp-today__hrow">
          <h3 className="pp-today__h"><PackageCheck className="w-4 h-4" /> Packing list <span>{data.packing.length} perfumes</span></h3>
          {data.packing.length > 0 && <button className="pp-today__ghost" onClick={() => window.print()} aria-label="Print packing list"><Printer className="w-4 h-4" /></button>}
        </div>
        <p className="pp-today__hint">Everything to decant for confirmed orders, bottle by bottle.</p>
        {data.packing.length === 0 ? <Empty text="Nothing to pack yet. Confirm an order to see it here." /> : (
          <div className="pp-today__pack">
            {data.packing.map((p) => (
              <div key={p.product_id} className={`pp-today__prow ${p.remaining_ml !== null && p.remaining_ml < p.total_ml ? 'is-short' : ''}`}>
                <div className="min-w-0">
                  <p className="pp-today__pbrand">{p.brand}</p>
                  <p className="pp-today__pname">{p.name}</p>
                  <p className="pp-today__plines">{p.lines.map((l) => `${l.size} × ${l.qty}`).join('   ·   ')}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="pp-today__pml">{ml(p.total_ml)}</p>
                  {p.remaining_ml !== null && <p className="pp-today__pleft">{ml(Math.max(0, p.remaining_ml))} left</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. Ready to send */}
      <section className="pp-today__card">
        <h3 className="pp-today__h"><Truck className="w-4 h-4" /> Ready to send <span>{data.to_pack.length}</span></h3>
        <p className="pp-today__hint">Copy the courier details for Steadfast, then mark as sent.</p>
        {data.to_pack.length === 0 ? <Empty text="No parcels waiting." /> : data.to_pack.map((o) => (
          <div key={o.id} className="pp-today__order">
            <div className="pp-today__orow">
              <div className="min-w-0">
                <p className="pp-today__oname">{o.customer_name} <em>{o.order_number}</em></p>
                <p className="pp-today__osub">{o.shipping_address}</p>
              </div>
              <p className="pp-today__total">{money(o.total_amount)}<span>COD {money(cod(o))}</span></p>
            </div>
            <div className="pp-today__actions">
              <button className="pp-today__pill" onClick={() => copy(`c${o.id}`, courierText(o))}>
                {copied === `c${o.id}` ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy for courier</>}
              </button>
              <button className="pp-today__btn" disabled={busy === o.id} onClick={() => setStatus(o, { order_status: 'shipped' })}>Mark as sent</button>
            </div>
          </div>
        ))}
      </section>

      {/* 4. Low stock */}
      <section className="pp-today__card">
        <h3 className="pp-today__h"><AlertTriangle className="w-4 h-4" /> Running low <span>{data.low_stock.length}</span></h3>
        <p className="pp-today__hint">Bottles at or under their low mark. Restock these first.</p>
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
    </div>
  );
};

const Stat = ({ label, value, tone }: { label: string; value: number; tone: 'ink' | 'amber' | 'red' | 'mute' }) => (
  <div className={`pp-today__stat is-${tone}`}><p>{value}</p><span>{label}</span></div>
);
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
