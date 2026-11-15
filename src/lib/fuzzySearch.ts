/**
 * Spelling-tolerant product search for the customer search box.
 * "kamrah" → Khamrah, "sovaj" → Sauvage, "avantus" → Aventus, "9 pm" → 9pm, "good gril" → Good Girl.
 */

const decode = (s: string) => {
  let out = String(s || '');
  for (let i = 0; i < 6 && /&(amp|#0?39|quot|apos);/.test(out); i++) {
    out = out.replace(/&amp;/g, '&').replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"');
  }
  return out;
};

export const normalize = (s: string) =>
  decode(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/&/g, ' and ').replace(/['’]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

/** Rough sound-alike form: how people type a name they've only heard. */
export const phonetic = (w: string) => {
  let s = w
    .replace(/ph/g, 'f').replace(/ck/g, 'k').replace(/q/g, 'k')
    .replace(/c(?=[eiy])/g, 's').replace(/c/g, 'k').replace(/x/g, 'ks').replace(/z/g, 's')
    .replace(/g(?=[eiy])/g, 'j').replace(/w/g, 'v')
    .replace(/([kdtgs])h/g, '$1').replace(/y/g, 'i')
    .replace(/au|aw|ao/g, 'o').replace(/ou|oo/g, 'u').replace(/ee|ea|ie/g, 'i').replace(/ai|ei|ay|ey/g, 'e');
  s = s.replace(/(.)\1+/g, '$1');
  if (s.length > 3) s = s.replace(/e$/, '');
  if (s.length > 2) s = s[0] + s.slice(1).replace(/h/g, '');
  return s;
};

/** Damerau–Levenshtein (optimal string alignment), stops early past `max`. */
const dist = (a: string, b: string, max: number) => {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const m = a.length, n = b.length;
  let p2: number[] = [], p1: number[] = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(p1[j] + 1, cur[j - 1] + 1, p1[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, p2[j - 2] + 1);
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    p2 = p1; p1 = cur;
  }
  return p1[n];
};

const tol = (len: number) => (len <= 3 ? 0 : len <= 5 ? 1 : len <= 8 ? 2 : 3);

/** How well one typed word matches one word of a product (0 = no match). */
const wordScore = (t: string, tp: string, w: string, wp: string) => {
  if (t === w) return 3;
  if (t.length >= 2 && w.startsWith(t)) return 2.6;
  if (tp === wp && tp.length >= 2) return 2.3;
  if (tp.length >= 3 && wp.startsWith(tp)) return 2.1;
  const k = tol(t.length);
  if (k === 0) return 0;
  const d = Math.min(dist(t, w, k), dist(tp, wp, k));
  // two or more mistakes only count when the word starts the same way
  if (d <= k && (d <= 1 || t[0] === w[0] || tp[0] === wp[0])) return 2 - d * 0.35;
  // still typing a long word: compare with the start of it
  if (t.length >= 4 && w.length > t.length) {
    const dp = Math.min(dist(t, w.slice(0, t.length), 1), dist(tp, wp.slice(0, tp.length), 1));
    if (dp <= 1) return 1.4;
  }
  return 0;
};

const FILLER = new Set(['for', 'the', 'de', 'by', 'of', 'and', 'la', 'le', 'perfume', 'parfum', 'edp', 'edt', 'ml']);

export type Searchable = { name: string; brand: string; category?: string; notes?: string[] };

type Indexed = { words: string[]; phon: string[]; compact: string; nameCompact: string; initials: Set<string> };

/**
 * First letters of the brand / name, so short forms work:
 * "cdn" → Club De Nuit, "cdnim" → Club De Nuit Intense Man, "ysl", "jpg", "bdc", "swy", "vgg", "qaf", "dg".
 */
const initialsOf = (brandWords: string[], nameWords: string[]) => {
  const out = new Set<string>();
  const add = (ws: string[]) => {
    for (const list of [ws, ws.filter((w) => !FILLER.has(w))]) {
      let acc = '';
      for (const w of list) {
        acc += /^\d/.test(w) ? w : w[0];
        if (acc.length >= 2) out.add(acc);
      }
    }
  };
  add(nameWords);
  add(brandWords);
  add([...brandWords, ...nameWords]);
  return out;
};
const cache = new WeakMap<object, Indexed>();
const index = (p: Searchable): Indexed => {
  let ix = cache.get(p);
  if (!ix) {
    const bw = normalize(p.brand).split(' ').filter(Boolean);
    const nw = normalize(p.name).split(' ').filter(Boolean);
    const words = [...bw, ...nw];
    ix = { words, phon: words.map(phonetic), compact: words.join(''), nameCompact: nw.join(''), initials: initialsOf(bw, nw) };
    cache.set(p, ix);
  }
  return ix;
};

/** Score a product against the query. 0 means it doesn't match. */
export const scoreProduct = (p: Searchable, query: string): number => {
  const q = normalize(query);
  if (!q) return 0;
  const ix = index(p);
  const qCompact = q.replace(/ /g, '');

  // Plain contains (old behaviour), incl. notes & category
  const plain = `${normalize(p.brand)} ${normalize(p.name)}`;
  if (` ${plain}`.includes(` ${q}`)) return 10 + (q.length / Math.max(plain.length, 1));
  if (plain.includes(q) || (qCompact.length >= 3 && ix.compact.includes(qCompact))) return 6 + (q.length / Math.max(plain.length, 1));

  // Whole query is a short form: "cdn", "c d n", "d&g", "ysl"
  const qi = q.split(' ').filter((w) => w !== 'and').join('');
  if (qi.length >= 2 && qi.length <= 7 && ix.initials.has(qi)) return 8 + 1 / ix.words.length;

  const toks = q.split(' ').filter((t) => t.length >= 2 || /\d/.test(t));
  const real = toks.filter((t) => !FILLER.has(t));
  const use = real.length ? real : toks.filter((t) => t !== 'and');

  let total = 0, miss = 0;
  for (const t of use) {
    const tp = phonetic(t);
    let best = 0;
    for (let i = 0; i < ix.words.length; i++) best = Math.max(best, wordScore(t, tp, ix.words[i], ix.phon[i]));
    if (best < 2.8 && t.length >= 2 && t.length <= 7 && ix.initials.has(t)) best = 2.8;
    if (best === 0) miss++;
    total += best;
  }
  const allowMiss = use.length >= 3 ? 1 : 0;

  // Whole thing typed as one blob / with odd spacing: "khamradukhan", "clubdenuit"
  let blob = 0;
  if (qCompact.length >= 5) {
    const k = tol(qCompact.length);
    for (const target of [ix.nameCompact, ix.compact]) {
      const d = Math.min(dist(qCompact, target, k), target.length > qCompact.length ? dist(qCompact, target.slice(0, qCompact.length), k) : k + 1);
      if (d <= k) blob = Math.max(blob, 6 - d);
    }
  }

  if (use.length && miss <= allowMiss && total > 0) {
    const avg = total / use.length - miss * 0.8;
    const cover = Math.min(1, use.length / ix.words.length);
    return Math.max(blob, avg * 2 + cover);
  }
  if (blob) return blob;

  const notesHit = (p.notes || []).some((n) => normalize(n).includes(q)) || normalize(p.category || '').includes(q);
  return notesHit ? 1 : 0;
};

export function fuzzySearch<T extends Searchable>(products: T[], query: string, limit = 40): T[] {
  if (!normalize(query)) return [];
  const scored: { p: T; s: number }[] = [];
  for (const p of products) {
    const s = scoreProduct(p, query);
    if (s > 0) scored.push({ p, s });
  }
  scored.sort((a, b) => b.s - a.s);
  if (!scored.length) return [];
  // Drop weak tails when there are strong hits
  const top = scored[0].s;
  const floor = top >= 5 ? Math.max(top - 2.2, Math.min(top * 0.55, 4)) : Math.min(top * 0.55, 4);
  const main = scored.filter((x) => x.s >= floor).map((x) => x.p);
  // Perfumes whose notes or category contain the words (e.g. "vanilla", "oud") come after
  const q = normalize(query);
  const seen = new Set(main);
  const byNote = q.length >= 3 ? products.filter((p) => !seen.has(p) && ((p.notes || []).some((n) => normalize(n).includes(q)) || normalize(p.category || '') === q)) : [];
  return [...main, ...byNote].slice(0, limit);
}
