import React, { useCallback, useEffect, useState } from 'react';
import { MessageCircle, Sun, PackageCheck, AlertTriangle, Truck, Check, Copy, Printer, RefreshCw, Wallet } from 'lucide-react';

type Item = { product_id: string; product_name: string; brand_name: string; selected_size: string; quantity: number };
type Order = {
  id: number; order_number: string; customer_name: string; customer_phone: string; shipping_address: string;
  city_zone: string; total_amount: number | string; payment_status: string; payment_method?: string; age_min?: number | string;
  delivery_fee?: number | string; invoice_key?: string; advance_type?: 'delivery' | 'full' | 'cod' | null; cod_amount?: number; ready?: boolean; order_status: string; created_at: string; items: Item[];
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
  const [sfReady, setSfReady] = useState<boolean | null>(demo ? true : null);
  const [sending, setSending] = useState(false);
  const [armed, setArmed] = useState<string | null>(null);
  const isArmed = (ids: number[], c = false) => armed === `${c ? 'c' : 's'}:${ids.join(',')}`;
  type SfRes = { sent: number; failed: number; note?: string; results: { id: number; order_number: string; ok: boolean; tracking_code?: string; error?: string }[] };
  const [sfResult, setSfResult] = useState<SfRes | null>(null);

  useEffect(() => {
    if (demo) return;
    fetch('/api/admin/steadfast.php', { headers: { 'X-CSRF-Token': csrfToken } })
      .then((r) => r.json()).then((j) => setSfReady(!!j?.data?.configured)).catch(() => setSfReady(false));
  }, [csrfToken, demo]);

  const sendSteadfast = async (ids: number[], confirmFirst = false) => {
    if (!ids.length) return;
    // Two-tap confirm instead of a browser pop-up (pop-ups are blocked in some phone browsers, e.g. inside Facebook)
    const armKey = `${confirmFirst ? 'c' : 's'}:${ids.join(',')}`;
    if (armed !== armKey) {
      setArmed(armKey);
      window.setTimeout(() => setArmed((a) => (a === armKey ? null : a)), 4000);
      return;
    }
    setArmed(null);
    setSending(true);
    setSfResult(null);
    try {
      if (demo) {
        await new Promise((r) => setTimeout(r, 900));
        const pool = [...data!.to_pack, ...data!.new_orders];
        const results = pool.filter((o) => ids.includes(o.id)).map((o, i) => ({ id: o.id, order_number: o.order_number, ok: true, tracking_code: `SF${(7351 + i * 37).toString(16).toUpperCase()}A${o.id}` }));
        setSfResult({ sent: results.length, failed: 0, results });
        setData((d) => d && {
          ...d,
          to_pack: d.to_pack.filter((o) => !ids.includes(o.id)),
          new_orders: d.new_orders.filter((o) => !ids.includes(o.id)),
          counts: { ...d.counts, new: d.new_orders.filter((o) => !ids.includes(o.id)).length, to_pack: d.to_pack.filter((o) => !ids.includes(o.id)).length, shipped_today: d.counts.shipped_today + results.length },
        });
        return;
      }
      const r = await fetch('/api/admin/steadfast.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        body: JSON.stringify({ action: 'send', order_ids: ids, confirm: confirmFirst }),
      });
      const j = await r.json();
      if (j.success) {
        const d: SfRes = j.data;
        if (!d.results.length) d.note = 'No matching order. It needs the ৳200 advance marked as received first.';
        setSfResult(d);
      } else {
        const msg = typeof j.error === 'string' ? j.error : (j.message || 'Steadfast booking failed');
        setSfResult({ sent: 0, failed: ids.length, results: [], note: msg });
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      await load();
    } catch {
      setSfResult({ sent: 0, failed: ids.length, results: [], note: 'Couldn’t reach the server. Check your connection and try again.' });
    } finally {
      setSending(false);
    }
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

  // Cash the courier collects (same rules as the server)
  const cod = (o: Order) => {
    const t = Number(o.total_amount) || 0;
    const fee = Number(o.delivery_fee) || 0;
    if (o.advance_type === 'full') return 0;
    if (o.advance_type === 'delivery') return Math.max(0, t - fee);
    if (o.advance_type === 'cod') return t;
    if (typeof o.cod_amount === 'number') return o.cod_amount;
    if (o.payment_status !== 'paid') return t;
    return o.payment_method === 'offline' ? 0 : Math.max(0, t - 200);
  };
  const isReady = (o: Order) => o.advance_type === 'cod' || o.payment_status === 'paid';

  // WhatsApp: open the customer's chat with their order + a link to the PDF invoice
  const waLink = (o: Order) => {
    let d = String(o.customer_phone || '').replace(/\D/g, '');
    if (d.startsWith('0')) d = '88' + d;
    else if (d.length === 10 && d.startsWith('1')) d = '880' + d;
    const url = `${window.location.origin}/invoice/${encodeURIComponent(o.order_number)}?k=${o.invoice_key || ''}`;
    const items = o.items.map((i) => `• ${i.product_name} ${i.selected_size}${Number(i.quantity) > 1 ? ` ×${i.quantity}` : ''}`).join('\n');
    const due = cod(o);
    const text =
      `Hi ${o.customer_name.split(' ')[0]}, thank you for your order from Pure Portions by Arrina.\n\n` +
      `Order ${o.order_number}\n${items}\n\n` +
      `Total: ${money(o.total_amount)}\n` +
      (o.advance_type || o.payment_status === 'paid' ? `To pay on delivery: ${money(due)}\n` : '') +
      `\nYour invoice (PDF): ${url}`;
    return `https://wa.me/${d}?text=${encodeURIComponent(text)}`;
  };
  const WaButton = ({ o }: { o: Order }) => (
    <a className="pp-wa" href={waLink(o)} target="_blank" rel="noreferrer" aria-label={`Send invoice to ${o.customer_name} on WhatsApp`} title="Send invoice on WhatsApp" onClick={(e) => { if (!o.invoice_key && !demo) { e.preventDefault(); } }}>
      <MessageCircle className="w-4 h-4" />
    </a>
  );
  const PAY: { id: 'delivery' | 'full' | 'cod'; label: string; sub: (o: Order) => string }[] = [
    { id: 'delivery', label: 'Delivery charge', sub: (o) => `${money(o.delivery_fee || 0)} paid first` },
    { id: 'full', label: 'Full payment', sub: (o) => `${money(o.total_amount)} paid first` },
    { id: 'cod', label: 'Cash on delivery', sub: () => 'Nothing in advance' },
  ];
  const setPayment = async (o: Order, type: 'delivery' | 'full' | 'cod') => {
    if (demo) {
      setData((d) => d && {
        ...d,
        new_orders: d.new_orders.map((x) => (x.id === o.id ? { ...x, advance_type: type, payment_status: type === 'cod' ? 'unpaid' : 'paid' } : x)),
        to_pack: d.to_pack.map((x) => (x.id === o.id ? { ...x, advance_type: type, payment_status: type === 'cod' ? 'unpaid' : 'paid' } : x)),
      });
      return;
    }
    setBusy(o.id);
    try {
      await fetch('/api/admin/order_payment.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        body: JSON.stringify({ id: o.id, advance_type: type }),
      });
      await load();
    } finally {
      setBusy(null);
    }
  };
  const courierText = (o: Order) =>
    `${o.customer_name}\n${o.customer_phone}\n${o.shipping_address}\nCOD: ${money(cod(o))}\nNote: ${o.items.map((i) => `${i.product_name} ${i.selected_size}×${i.quantity}`).join(', ')}`;

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  if (loading && !data) return <div className="pp-today"><p className="pp-today__muted">Loading today…</p></div>;
  if (error && !data) return <div className="pp-today"><p className="pp-today__err">{error}</p><button className="pp-today__btn" onClick={load}>Try again</button></div>;
  if (!data) return null;
  const c = data.counts;
  const eligible = data.to_pack.filter((o) => isReady(o));

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

      {/* Steadfast result (shows wherever the booking was started) */}
      {sfResult && (
        <div className={`pp-sfres ${sfResult.failed ? 'has-fail' : ''}`}>
          <p>{sfResult.sent ? <><b>{sfResult.sent}</b> sent to Steadfast</> : 'Nothing was sent to Steadfast'}{sfResult.failed ? <> · <b>{sfResult.failed}</b> not sent</> : null}</p>
          {sfResult.results.filter((r) => r.ok).map((r) => <span key={r.id} className="is-ok">✓ {r.order_number} · tracking {r.tracking_code}</span>)}
          {sfResult.results.filter((r) => !r.ok).map((r) => <span key={r.id} className="is-bad">✕ {r.order_number} · {r.error}</span>)}
          {sfResult.note && <span className="is-bad">{sfResult.note}</span>}
        </div>
      )}

      {/* 1. New orders — one clear next step per order */}
      <section className="pp-today__card">
        <h3 className="pp-today__h"><Wallet className="w-4 h-4" /> New orders <span>{data.new_orders.length}</span></h3>
        <p className="pp-today__hint">Each order: ① choose how it’s paid → ② confirm &amp; send to Steadfast.</p>
        {sfReady === false && data.new_orders.length > 0 && (
          <p className="pp-sfnote">Steadfast isn’t connected, so confirmed orders wait in “Ready to send”. Add your keys in <b>Store Settings → Steadfast courier</b>.</p>
        )}
        {data.new_orders.length === 0 ? <Empty text="No new orders right now." /> : data.new_orders.map((o) => {
          const chosen = o.advance_type || (o.payment_status === 'paid' ? 'legacy' : null);
          const ready = isReady(o);
          return (
            <div key={o.id} className="pp-nord">
              <div className="pp-today__orow">
                <div className="min-w-0">
                  <p className="pp-today__oname">{o.customer_name} <em>{o.order_number}</em></p>
                  <p className="pp-today__osub">{o.customer_phone} · {ZONE[o.city_zone] || o.city_zone} · {ago(o)}</p>
                </div>
                <div className="pp-orow__right"><WaButton o={o} /><p className="pp-today__total">{money(o.total_amount)}<span>Delivery {money(o.delivery_fee || 0)}</span></p></div>
              </div>
              <div className="pp-nord__chips">
                {o.items.map((i, k) => <span key={k}>{i.product_name} <b>{i.selected_size}{i.quantity > 1 ? ` ×${i.quantity}` : ''}</b></span>)}
              </div>

              <ol className="pp-steps" aria-label="Order progress">
                <li className={ready ? 'is-done' : 'is-now'}><i>{ready ? <Check className="w-3 h-3" /> : '1'}</i>Payment</li>
                <li className={ready ? 'is-now' : ''}><i>2</i>Confirm</li>
                <li><i>3</i>Steadfast</li>
              </ol>

              <p className="pp-pay__q">How is this order paid?</p>
              <div className="pp-pay">
                {PAY.map((p) => (
                  <button
                    key={p.id}
                    className={`pp-pay__opt ${o.advance_type === p.id ? 'is-on' : ''}`}
                    disabled={busy === o.id}
                    onClick={() => setPayment(o, p.id)}
                  >
                    <b>{p.label}</b>
                    <span>{p.sub(o)}</span>
                  </button>
                ))}
              </div>

              {ready && (
                <p className="pp-pay__sum">
                  {chosen === 'legacy' ? 'Advance received · ' : ''}Courier collects <b>{money(cod(o))}</b>
                </p>
              )}

              {ready && (sfReady ? (
                <button className={`pp-nord__go ${isArmed([o.id], true) ? 'is-armed' : ''}`} disabled={sending || busy === o.id} onClick={() => sendSteadfast([o.id], true)}>
                  <Truck className="w-4 h-4" /> {sending ? 'Sending…' : isArmed([o.id], true) ? 'Tap again to confirm & send' : 'Confirm & send to Steadfast'}
                </button>
              ) : (
                <button className="pp-nord__go" disabled={busy === o.id} onClick={() => setStatus(o, { order_status: 'confirmed' })}>Confirm order</button>
              ))}
            </div>
          );
        })}
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
              <div key={p.product_id} className={`pp-today__prow ${p.short ? 'is-short' : ''}`}>
                <div className="min-w-0">
                  <p className="pp-today__pbrand">{p.brand}</p>
                  <p className="pp-today__pname">{p.name}</p>
                  <p className="pp-today__plines">{p.lines.map((l) => `${l.size} × ${l.qty}`).join('   ·   ')}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="pp-today__pml">{ml(p.total_ml)}</p>
                  {p.remaining_ml !== null && (
                    <p className="pp-today__pleft">{p.short ? `Short by ${ml(Math.abs(p.remaining_ml))}` : `${ml(p.remaining_ml)} left after`}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. Ready to send — booked straight on Steadfast */}
      <section className="pp-today__card">
        <div className="pp-today__hrow">
          <h3 className="pp-today__h"><Truck className="w-4 h-4" /> Ready to send <span>{data.to_pack.length}</span></h3>
        </div>
        <p className="pp-today__hint">Confirmed orders with the advance received go to Steadfast in one tap.</p>

        {sfReady === false && (
          <p className="pp-sfnote">Steadfast isn’t connected yet. Add your keys in <b>Store Settings → Steadfast courier</b>.</p>
        )}

        {data.to_pack.length > 0 && (
          <button className={`pp-sfall ${armed && armed.startsWith('s:') && eligible.length > 1 && isArmed(eligible.map((o) => o.id)) ? 'is-armed' : ''}`} disabled={!sfReady || eligible.length === 0 || sending} onClick={() => sendSteadfast(eligible.map((o) => o.id))}>
            <Truck className="w-4 h-4" />
            {sending ? 'Booking on Steadfast…' : !eligible.length ? 'No orders with advance yet' : isArmed(eligible.map((o) => o.id)) ? `Tap again to send ${eligible.length}` : `Send all to Steadfast (${eligible.length})`}
          </button>
        )}


        {data.to_pack.length === 0 ? <Empty text="No parcels waiting." /> : data.to_pack.map((o) => {
          return (
            <div key={o.id} className="pp-today__order">
              <div className="pp-today__orow">
                <div className="min-w-0">
                  <p className="pp-today__oname">{o.customer_name} <em>{o.order_number}</em></p>
                  <p className="pp-today__osub">{o.customer_phone} · {o.shipping_address}</p>
                </div>
                <div className="pp-orow__right"><WaButton o={o} /><p className="pp-today__total">{money(o.total_amount)}<span>COD {money(cod(o))}</span></p></div>
              </div>
              <div className="pp-today__actions">
                {isReady(o) ? (
                  <button className="pp-today__btn" disabled={!sfReady || sending} onClick={() => sendSteadfast([o.id])}>
                    <Truck className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />{isArmed([o.id]) ? 'Tap again to send' : 'Send to Steadfast'}
                  </button>
                ) : (
                  <div className="pp-pay pp-pay--mini">
                    {PAY.map((p) => (
                      <button key={p.id} className="pp-pay__opt" disabled={busy === o.id} onClick={() => setPayment(o, p.id)}><b>{p.label}</b></button>
                    ))}
                  </div>
                )}
                <button className="pp-today__link" disabled={busy === o.id} onClick={() => setStatus(o, { order_status: 'shipped' })}>Sent another way</button>
              </div>
            </div>
          );
        })}
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
