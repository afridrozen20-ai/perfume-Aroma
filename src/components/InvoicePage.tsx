import React, { useEffect, useState } from 'react';
import { Download, ArrowUpRight } from 'lucide-react';
import logoRound from '../assets/brand/logo-round.webp';

type Inv = {
  order_number: string; date: string; status: string; customer_name: string; customer_phone: string;
  shipping_address: string; city_zone: string;
  items: { product_name: string; brand_name: string; selected_size: string; quantity: number | string; unit_price: number | string; line_total: number | string }[];
  subtotal: number; discount: number; delivery_fee: number; total: number; paid: number; due: number;
  advance_type: 'delivery' | 'full' | 'cod' | null; tracking: string | null;
};

const money = (n: number | string) => `৳${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
const ZONE: Record<string, string> = { narsingdi: 'Narsingdi', inside_dhaka: 'Dhaka', outside_dhaka: 'Other districts' };
const PAYLABEL: Record<string, string> = { delivery: 'Delivery charge paid in advance', full: 'Paid in full', cod: 'Cash on delivery' };

/** Customer invoice: /invoice/<order>?k=<token>. "Download PDF" uses the browser's Save as PDF. */
const InvoicePage: React.FC<{ orderNumber: string; token: string }> = ({ orderNumber, token }) => {
  const [inv, setInv] = useState<Inv | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    document.title = `Invoice ${orderNumber} · Pure Portions by Arrina`;
    fetch(`/api/invoice.php?o=${encodeURIComponent(orderNumber)}&k=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((j) => (j.success ? setInv(j.data) : setErr('This invoice link is not valid.')))
      .catch(() => setErr('Couldn’t load the invoice. Check your connection and try again.'));
  }, [orderNumber, token]);

  if (err) return <div className="pp-inv"><div className="pp-inv__paper"><p className="pp-inv__err">{err}</p></div></div>;
  if (!inv) return <div className="pp-inv"><div className="pp-inv__paper"><p className="pp-inv__muted">Loading invoice…</p></div></div>;

  const date = new Date(inv.date.replace(' ', 'T')).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="pp-inv">
      <div className="pp-inv__paper">
        <header className="pp-inv__head">
          <img src={logoRound} alt="Pure Portions by Arrina" width={56} height={56} />
          <div className="text-right">
            <p className="pp-inv__eyebrow">Invoice</p>
            <p className="pp-inv__no">{inv.order_number}</p>
            <p className="pp-inv__date">{date}</p>
          </div>
        </header>

        <h1 className="pp-inv__thanks">Thank you, <em>{inv.customer_name.split(' ')[0]}</em></h1>

        <section className="pp-inv__to">
          <p className="pp-inv__label">Deliver to</p>
          <p className="pp-inv__strong">{inv.customer_name}</p>
          <p>{inv.customer_phone}</p>
          <p>{inv.shipping_address}{ZONE[inv.city_zone] ? ` · ${ZONE[inv.city_zone]}` : ''}</p>
        </section>

        <table className="pp-inv__items">
          <thead><tr><th>Perfume</th><th>Size</th><th>Qty</th><th>Amount</th></tr></thead>
          <tbody>
            {inv.items.map((i, k) => (
              <tr key={k}>
                <td><span>{i.brand_name}</span>{i.product_name}</td>
                <td>{i.selected_size}</td>
                <td>{i.quantity}</td>
                <td>{money(i.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="pp-inv__totals">
          <p><span>Subtotal</span><span>{money(inv.subtotal)}</span></p>
          {inv.discount > 0 && <p><span>Discount</span><span>− {money(inv.discount)}</span></p>}
          <p><span>Delivery</span><span>{money(inv.delivery_fee)}</span></p>
          <p className="is-total"><span>Total</span><span>{money(inv.total)}</span></p>
          {inv.paid > 0 && <p className="is-paid"><span>Paid in advance</span><span>− {money(inv.paid)}</span></p>}
          <p className="is-due"><span>To pay on delivery</span><span>{money(inv.due)}</span></p>
        </div>

        <p className="pp-inv__pay">
          {inv.advance_type ? PAYLABEL[inv.advance_type] : inv.paid > 0 ? 'Advance received' : 'Cash on delivery'}
          {inv.tracking ? <> · Steadfast tracking <b>{inv.tracking}</b></> : null}
        </p>

        <footer className="pp-inv__foot">
          <p>Pure Portions by Arrina · Signature decants</p>
          <p>pureportionsbyarrina.com</p>
        </footer>
      </div>

      <div className="pp-inv__actions">
        <button onClick={() => window.print()}><Download className="w-4 h-4" /> Download PDF</button>
        <a href="/">Shop again <ArrowUpRight className="w-4 h-4" /></a>
      </div>
    </div>
  );
};

export default InvoicePage;
