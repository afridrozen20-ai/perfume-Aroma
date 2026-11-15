import React, { useState } from 'react';

/** Inline cancel: put the ml back in stock (default) and remind to cancel on Steadfast. */
const CancelBox: React.FC<{
  id: number; tracking?: string | null; csrfToken: string; demo?: boolean; label?: string;
  onDone: (msg: string) => void;
}> = ({ id, tracking, csrfToken, demo, label = 'Cancel order', onDone }) => {
  const [open, setOpen] = useState(false);
  const [restore, setRestore] = useState(true);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);

  const go = async () => {
    setBusy(true); setErr('');
    try {
      if (demo) { await new Promise((r) => setTimeout(r, 600)); onDone(restore ? 'Cancelled · ml put back in stock' : 'Cancelled · ml kept out'); return; }
      const r = await fetch('/api/admin/order_cancel.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        body: JSON.stringify({ id, restore, reason }),
      });
      const j = await r.json();
      if (!j.success) { setErr(typeof j.error === 'string' ? j.error : 'Couldn’t cancel this order.'); return; }
      const d = j.data;
      onDone(d.restored ? `Cancelled · ${d.restored_ml}ml put back in stock` : d.already_restored ? 'Cancelled · ml was already back' : 'Cancelled · ml kept out');
    } catch { setErr('Couldn’t reach the server.'); }
    finally { setBusy(false); }
  };

  if (!open) return <button className="pp-cx__link" onClick={() => setOpen(true)}>{label}</button>;
  return (
    <div className="pp-cx">
      {tracking && (
        <p className="pp-cx__warn">
          Already booked on Steadfast — cancel it there too.
          <button onClick={async () => { try { await navigator.clipboard.writeText(tracking); setCopied(true); } catch { /* ignore */ } }}>{copied ? 'Copied ✓' : `Copy ${tracking}`}</button>
        </p>
      )}
      <label className="pp-cx__check">
        <input type="checkbox" checked={restore} onChange={(e) => setRestore(e.target.checked)} />
        <span><b>Put the ml back in stock</b><small>Untick if the decant was already filled and can’t be reused.</small></span>
      </label>
      <input className="pp-cx__reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional)" maxLength={200} />
      {err && <p className="pp-cx__err">{err}</p>}
      <div className="pp-cx__btns">
        <button className="pp-cx__back" onClick={() => setOpen(false)} disabled={busy}>Keep order</button>
        <button className="pp-cx__go" onClick={go} disabled={busy}>{busy ? 'Cancelling…' : label}</button>
      </div>
    </div>
  );
};

export default CancelBox;
