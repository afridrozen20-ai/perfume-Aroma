import React, { useEffect, useState } from 'react';
import { Truck, Check, Eye, EyeOff, Lock } from 'lucide-react';

/** Store Settings card: paste the Steadfast API key + secret once. Keys stay on the server. */
const SteadfastSettings: React.FC<{ csrfToken: string }> = ({ csrfToken }) => {
  const [state, setState] = useState<{ configured: boolean; api_key_hint?: string; balance?: number; error?: string } | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [secret, setSecret] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [editing, setEditing] = useState(false);

  const load = async () => {
    try {
      const r = await fetch('/api/admin/steadfast.php?check=1', { headers: { 'X-CSRF-Token': csrfToken } });
      const j = await r.json();
      if (j.success) setState(j.data);
    } catch { /* ignore */ }
  };
  useEffect(() => { load(); }, []);

  const post = async (body: object) => {
    const r = await fetch('/api/admin/steadfast.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
      body: JSON.stringify(body),
    });
    return r.json();
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!apiKey.trim() || !secret.trim()) { setMsg({ ok: false, text: 'Enter both keys.' }); return; }
    setBusy(true);
    try {
      const j = await post({ action: 'save_keys', api_key: apiKey.trim(), secret_key: secret.trim() });
      if (j.success) {
        setState(j.data);
        setApiKey(''); setSecret(''); setEditing(false);
        setMsg({ ok: true, text: `Connected. Steadfast balance ৳${Math.round(j.data.balance ?? 0).toLocaleString('en-IN')}.` });
      } else {
        setMsg({ ok: false, text: typeof j.error === 'string' ? j.error : (j.message || 'Steadfast did not accept these keys.') });
      }
    } catch {
      setMsg({ ok: false, text: 'Couldn’t reach the server. Try again.' });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm('Remove the Steadfast keys from your site?')) return;
    setBusy(true);
    try { const j = await post({ action: 'remove_keys' }); if (j.success) { setState({ configured: false }); setMsg(null); } }
    finally { setBusy(false); }
  };

  const connected = state?.configured && !state?.error;

  return (
    <div className="pp-sf">
      <div className="pp-sf__head">
        <span className="pp-sf__icon"><Truck className="w-4 h-4" /></span>
        <div className="flex-1 min-w-0">
          <p className="pp-sf__title">Steadfast courier</p>
          <p className="pp-sf__sub">Book parcels straight from the Today page.</p>
        </div>
        {state && (
          <span className={`pp-sf__badge ${connected ? 'is-on' : state.configured ? 'is-warn' : ''}`}>
            {connected ? <><Check className="w-3 h-3" /> Connected</> : state.configured ? 'Check keys' : 'Not connected'}
          </span>
        )}
      </div>

      {connected && !editing ? (
        <div className="pp-sf__row">
          <div>
            <p className="pp-sf__label">API key</p>
            <p className="pp-sf__mono">{state?.api_key_hint}</p>
          </div>
          {typeof state?.balance === 'number' && (
            <div>
              <p className="pp-sf__label">Balance</p>
              <p className="pp-sf__mono">৳{Math.round(state.balance).toLocaleString('en-IN')}</p>
            </div>
          )}
          <div className="pp-sf__actions">
            <button type="button" className="pp-sf__soft" onClick={() => setEditing(true)}>Change keys</button>
            <button type="button" className="pp-sf__danger" onClick={remove} disabled={busy}>Remove</button>
          </div>
        </div>
      ) : (
        <form onSubmit={save} className="pp-sf__form" autoComplete="off">
          {state?.error && <p className="pp-sf__msg is-bad">{state.error}</p>}
          <label className="pp-sf__field">
            <span>API key</span>
            <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Paste from Steadfast → API" autoComplete="off" spellCheck={false} />
          </label>
          <label className="pp-sf__field">
            <span>Secret key</span>
            <div className="pp-sf__secret">
              <input type={show ? 'text' : 'password'} value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="Paste the secret key" autoComplete="new-password" spellCheck={false} />
              <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide secret key' : 'Show secret key'}>{show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
            </div>
          </label>
          <div className="pp-sf__actions">
            <button type="submit" className="pp-sf__go" disabled={busy}>{busy ? 'Checking…' : 'Save & test'}</button>
            {editing && <button type="button" className="pp-sf__soft" onClick={() => { setEditing(false); setMsg(null); }}>Cancel</button>}
          </div>
          <p className="pp-sf__note"><Lock className="w-3 h-3" /> Saved only on your server. Never shown on the website.</p>
        </form>
      )}
      {msg && <p className={`pp-sf__msg ${msg.ok ? 'is-ok' : 'is-bad'}`}>{msg.text}</p>}
    </div>
  );
};

export default SteadfastSettings;
