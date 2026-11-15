import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Lock, Check, Minus, Plus } from 'lucide-react';
import { CartItem } from '../types';
import { submitOrder, getErrorMessage } from '../services/api';
import { thumb } from '../lib/img';

type Zone = 'narsingdi' | 'inside_dhaka' | 'outside_dhaka';

interface Props {
  isOpen: boolean;
  items: CartItem[];
  storeSettings?: any;
  onClose: () => void;             // back to the bag
  onUpdateQty: (productId: string, size: string, delta: number) => void;
  onClearCart: () => void;
  onDone: () => void;              // continue shopping after the order
  demo?: boolean;                  // preview: never sends a real order
}

const SAVE_KEY = 'pp_checkout_details';
const money = (n: number) => `৳${Math.round(n).toLocaleString('en-IN')}`;
const cleanPhone = (v: string) => {
  let d = v.replace(/\D/g, '');
  if (d.startsWith('880')) d = d.slice(2);
  else if (d.startsWith('88')) d = d.slice(2);
  return d;
};

export const CheckoutPage: React.FC<Props> = ({ isOpen, items, storeSettings, onClose, onUpdateQty, onClearCart, onDone, demo }) => {
  const saved = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(SAVE_KEY) || '{}'); } catch { return {}; }
  }, []);
  const [name, setName] = useState<string>(saved.name || '');
  const [phone, setPhone] = useState<string>(saved.phone || '');
  const [address, setAddress] = useState<string>(saved.address || '');
  const [zone, setZone] = useState<Zone | ''>(saved.zone || '');
  const [email, setEmail] = useState<string>(saved.email || '');
  const [showEmail, setShowEmail] = useState(!!saved.email);
  const [note, setNote] = useState('');
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<any>(null);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    topRef.current?.scrollTo({ top: 0 });
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  if (!isOpen) return null;

  const num = (v: any, d: number) => (v !== undefined && v !== null && v !== '' && !isNaN(Number(v)) ? Number(v) : d);
  const fees: Record<Zone, number> = {
    narsingdi: num(storeSettings?.shipping_fee_narsingdi, 80),
    inside_dhaka: num(storeSettings?.shipping_fee_dhaka, 100),
    outside_dhaka: num(storeSettings?.shipping_fee_outside_dhaka, 130),
  };
  const freeAt = num(storeSettings?.free_shipping_threshold, 3000);
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const free = subtotal >= freeAt;
  const delivery = zone ? (free ? 0 : fees[zone]) : 0;
  const total = subtotal + delivery;
  const count = items.reduce((s, i) => s + i.quantity, 0);

  const phoneDigits = cleanPhone(phone);
  const errs = {
    name: name.trim().length < 2 ? 'Please add your name' : '',
    phone: !/^01[3-9]\d{8}$/.test(phoneDigits) ? 'Enter an 11-digit number, e.g. 017XXXXXXXX' : '',
    zone: !zone ? 'Choose where we’re delivering' : '',
    address: address.trim().length < 6 ? 'Add house, road, area & district' : '',
  };
  const valid = !errs.name && !errs.phone && !errs.zone && !errs.address;

  const ZONES: { id: Zone; label: string; sub: string }[] = [
    { id: 'narsingdi', label: 'Narsingdi', sub: free ? 'Free' : money(fees.narsingdi) },
    { id: 'inside_dhaka', label: 'Dhaka', sub: free ? 'Free' : money(fees.inside_dhaka) },
    { id: 'outside_dhaka', label: 'Other districts', sub: free ? 'Free' : money(fees.outside_dhaka) },
  ];

  const place = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setTouched(true);
    if (!valid) {
      const first = document.querySelector('.pp-co [data-err="1"]') as HTMLElement | null;
      first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setSubmitting(true); setError(null);
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ name, phone, address, zone, email })); } catch { /* ignore */ }
    try {
      if (demo) {
        await new Promise((r) => setTimeout(r, 1100));
        setDone({ order_number: 'PP-DEMO-0001', customer_name: name, total_amount: total });
        return;
      }
      const result = await submitOrder({
        customer_name: name.trim(),
        customer_phone: phoneDigits,
        customer_email: email.trim(),
        shipping_address: note.trim() ? `${address.trim()}\nNote: ${note.trim()}` : address.trim(),
        city_zone: zone as Zone,
        payment_method: 'cod',
        items: items.map((it) => ({ product_id: it.product.id, selected_size: it.selectedSize, quantity: it.quantity })),
      });
      if (result.success && result.data) {
        setDone(result.data);
        onClearCart();
      } else setError(getErrorMessage(result?.error || result, 'We couldn’t place your order. Please try again.'));
    } catch {
      setError('Connection problem. Please check your internet and try again.');
    } finally {
      setSubmitting(false);
      topRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  /* ── Order placed ── */
  if (done) {
    return (
      <div className="pp-co" ref={topRef}>
        <div className="pp-co__done">
          <div className="pp-co__tick"><svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24" /><path d="M15 27l7 7 15-16" /></svg></div>
          <p className="pp-co__eyebrow">Order placed</p>
          <h1 className="pp-co__title">Thank you, <em>{String(done.customer_name || name).split(' ')[0]}</em></h1>
          <p className="pp-co__lead">Your order <b>{done.order_number}</b> is in. We’ll call you on <b>{phoneDigits}</b> to confirm before we send it.</p>
          <div className="pp-co__donebox">
            <div><span>Total</span><b>{money(Number(done.total_amount) || total)}</b></div>
            <div><span>Payment</span><b>Cash on delivery</b></div>
          </div>
          <button className="pp-co__cta" onClick={() => { setDone(null); onDone(); }}>Continue shopping</button>
        </div>
      </div>
    );
  }

  const Summary = (
    <div className="pp-co__items">
      {items.map((it) => (
        <div key={`${it.product.id}-${it.selectedSize}`} className="pp-co__item">
          <div className="pp-co__thumb">
            <img src={thumb(it.product.image, 160)} alt="" loading="lazy" />
            <span>{it.quantity}</span>
          </div>
          <div className="pp-co__iname">
            <p>{it.product.brand}</p>
            <b>{it.product.name}</b>
            <small>{it.selectedSize}</small>
          </div>
          <div className="pp-co__iright">
            <b>{money(it.price * it.quantity)}</b>
            <div className="pp-co__qty">
              <button type="button" aria-label="One less" onClick={() => onUpdateQty(it.product.id, it.selectedSize, -1)}><Minus className="w-3 h-3" /></button>
              <span>{it.quantity}</span>
              <button type="button" aria-label="One more" onClick={() => onUpdateQty(it.product.id, it.selectedSize, 1)}><Plus className="w-3 h-3" /></button>
            </div>
          </div>
        </div>
      ))}
      <div className="pp-co__sums">
        <div><span>Subtotal</span><span>{money(subtotal)}</span></div>
        <div><span>Delivery</span><span>{!zone ? 'Choose area' : free ? 'Free' : money(delivery)}</span></div>
        <div className="is-total"><span>Total</span><span>{money(total)}</span></div>
      </div>
      {!free && <p className="pp-co__free">Add {money(freeAt - subtotal)} more for free delivery</p>}
    </div>
  );

  return (
    <div className="pp-co" ref={topRef}>
      <header className="pp-co__bar">
        <button className="pp-co__back" onClick={onClose}><ArrowLeft className="w-4 h-4" /> Bag</button>
        <p className="pp-co__brand">Pure Portions</p>
        <span className="pp-co__lock"><Lock className="w-3.5 h-3.5" /> Secure</span>
      </header>

      {items.length === 0 ? (
        <div className="pp-co__done">
          <h1 className="pp-co__title">Your bag is <em>empty</em></h1>
          <button className="pp-co__cta" onClick={onDone}>Explore decants</button>
        </div>
      ) : (
        <div className="pp-co__wrap">
          <form className="pp-co__form" onSubmit={place} noValidate>
            <p className="pp-co__eyebrow">{count} decant{count === 1 ? '' : 's'} · {money(subtotal)}</p>
            <h1 className="pp-co__title">Check<em>out</em></h1>

            {/* Phones: order summary always open */}
            <div className="pp-co__sumcard pp-co__mobile">
              <div className="pp-co__sumhead"><span>Your order</span><button type="button" onClick={onClose}>Edit bag</button></div>
              {Summary}
            </div>

            {error && <p className="pp-co__error">{error}</p>}

            <section className="pp-co__sec">
              <h2><i>01</i> Contact</h2>
              <Field label="Full name" value={name} onChange={setName} err={touched ? errs.name : ''} autoComplete="name" />
              <Field label="Phone number" value={phone} onChange={setPhone} err={touched ? errs.phone : ''} type="tel" inputMode="tel" autoComplete="tel" hint="We’ll call to confirm your order" />
              {showEmail
                ? <Field label="Email (optional)" value={email} onChange={setEmail} type="email" autoComplete="email" />
                : <button type="button" className="pp-co__add" onClick={() => setShowEmail(true)}>+ Add email for receipt</button>}
            </section>

            <section className="pp-co__sec">
              <h2><i>02</i> Delivery</h2>
              <div className="pp-co__zones" data-err={touched && errs.zone ? '1' : undefined}>
                {ZONES.map((z) => (
                  <button type="button" key={z.id} className={`pp-co__zone ${zone === z.id ? 'is-on' : ''}`} onClick={() => setZone(z.id)} aria-pressed={zone === z.id}>
                    <span className="pp-co__radio">{zone === z.id && <Check className="w-3 h-3" />}</span>
                    <b>{z.label}</b>
                    <small>{z.sub}</small>
                  </button>
                ))}
              </div>
              {touched && errs.zone && <p className="pp-co__ferr">{errs.zone}</p>}
              <Field label="Full address" value={address} onChange={setAddress} err={touched ? errs.address : ''} multiline autoComplete="street-address" hint="House, road, area, thana, district" />
              <Field label="Note for delivery (optional)" value={note} onChange={setNote} />
            </section>

            <section className="pp-co__sec">
              <h2><i>03</i> Payment</h2>
              <div className="pp-co__pay">
                <span className="pp-co__radio is-on"><Check className="w-3 h-3" /></span>
                <div><b>Cash on delivery</b><small>Pay the rider when your parcel arrives</small></div>
              </div>
            </section>

            <div className="pp-co__place">
              <button type="submit" className="pp-co__cta" disabled={submitting}>
                {submitting ? <span className="pp-co__spin" /> : <>Place order · {money(total)}</>}
              </button>
              <p className="pp-co__fine"><Lock className="w-3 h-3" /> Hand-decanted from authentic bottles · We confirm every order by phone</p>
            </div>
          </form>

          <aside className="pp-co__side">
            <div className="pp-co__sumcard">
              <p className="pp-co__eyebrow">Your order</p>
              {Summary}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};

const Field: React.FC<{
  label: string; value: string; onChange: (v: string) => void; err?: string; hint?: string;
  type?: string; inputMode?: 'tel' | 'text' | 'email'; autoComplete?: string; multiline?: boolean;
}> = ({ label, value, onChange, err, hint, type = 'text', inputMode, autoComplete, multiline }) => (
  <label className={`pp-co__field ${value ? 'has-val' : ''} ${err ? 'is-err' : ''}`} data-err={err ? '1' : undefined}>
    {multiline
      ? <textarea rows={2} value={value} onChange={(e) => onChange(e.target.value)} placeholder=" " autoComplete={autoComplete} />
      : <input type={type} inputMode={inputMode} value={value} onChange={(e) => onChange(e.target.value)} placeholder=" " autoComplete={autoComplete} />}
    <span>{label}</span>
    {err ? <small className="pp-co__ferr">{err}</small> : hint ? <small>{hint}</small> : null}
  </label>
);

export default CheckoutPage;
