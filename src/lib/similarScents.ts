/**
 * "You may also like": finds the perfumes whose scent is closest to the one being viewed,
 * using the scent profile already stored for each perfume (accords with strength, top / heart /
 * base notes, families, moods, seasons) plus who it is for.
 */
import type { FragranceProduct } from '../types';

type Profile = {
  accords: Map<string, number>;   // name -> strength 0..1
  notes: Set<string>;
  base: Set<string>;
  families: Set<string>;
  moods: Set<string>;
  seasons: Set<string>;
  gender: string;
};

const clean = (s: unknown) => String(s ?? '').toLowerCase().replace(/&amp;/g, '&').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

// Words that say nothing about the smell itself
const NOISE = new Set(['notes', 'note', 'accord', 'absolute', 'oil', 'essence', 'extract', 'natural', 'wood', 'woods']);
// Origin / colour words: "Calabrian bergamot" should match on bergamot, not on "calabrian"
const ADJ = new Set(['calabrian', 'madagascar', 'bourbon', 'indonesian', 'italian', 'french', 'sicilian', 'egyptian', 'turkish', 'bulgarian', 'haitian', 'tahitian', 'mexican', 'virginia', 'atlas', 'damask', 'white', 'black', 'pink', 'green', 'red', 'sweet', 'fresh', 'dark', 'bean', 'leaf', 'leaves', 'flower', 'blossom', 'tree']);
/** "Madagascar Vanilla" and "vanilla absolute" should both count as vanilla. */
const noteKeys = (n: unknown): string[] => {
  const c = clean(n);
  if (!c) return [];
  const words = c.split(' ').filter((w) => w.length > 2 && !NOISE.has(w));
  const keys = new Set<string>([c]);
  words.forEach((w) => { if (!ADJ.has(w)) keys.add(w.replace(/([^s])s$/, '$1')); });
  return [...keys];
};

const cache = new WeakMap<object, Profile>();
const profileOf = (p: FragranceProduct): Profile => {
  const hit = cache.get(p);
  if (hit) return hit;
  const sp: any = (p as any).scentProfile || (p as any).scent_profile || {};
  const accords = new Map<string, number>();
  const list = Array.isArray(sp.accords) && sp.accords.length ? sp.accords : (Array.isArray((p as any).accords) ? (p as any).accords : []);
  list.forEach((a: any) => {
    const k = clean(a?.name);
    if (k) accords.set(k, Math.max(0.2, Math.min(1, (Number(a?.intensity) || 60) / 100)));
  });
  const notes = new Set<string>();
  const base = new Set<string>();
  const add = (arr: unknown, set: Set<string>) => (Array.isArray(arr) ? arr : []).forEach((n) => noteKeys(n).forEach((k) => set.add(k)));
  [sp.topNotes, sp.heartNotes, sp.baseNotes, p.topNotes, p.heartNotes, p.baseNotes].forEach((a) => add(a, notes));
  [sp.baseNotes, p.baseNotes].forEach((a) => add(a, base));
  // The plain "notes" list is only used when nothing better exists (it is often a placeholder)
  if (!notes.size) add(p.notes, notes);
  const set = (arr: unknown) => new Set((Array.isArray(arr) ? arr : []).map(clean).filter(Boolean));
  const seasons = set(sp.seasons); seasons.delete('all seasons');
  const prof: Profile = {
    accords, notes, base,
    families: set(sp.fragranceFamilies),
    moods: set(sp.moods),
    seasons,
    gender: clean(p.gender || sp.genderPositioning),
  };
  cache.set(p, prof);
  return prof;
};

const genderFit = (a: string, b: string) => {
  const m = (g: string) => (/(him|mascul|men|male)/.test(g) && !/female|fem/.test(g) ? 'm' : /(her|femin|women|female)/.test(g) ? 'f' : 'u');
  const x = m(a), y = m(b);
  if (x === y) return 1;
  if (x === 'u' || y === 'u') return 0.3;
  return -2.5; // a men's scent next to a women's scent is rarely what people want
};

export type Match = { product: FragranceProduct; score: number; shared: string[] };

/** Score how close two perfumes smell, and which notes/accords they share. */
export const scentMatch = (a: FragranceProduct, b: FragranceProduct): Match => {
  const A = profileOf(a), B = profileOf(b);
  let score = 0;
  const shared: { w: number; label: string }[] = [];

  A.accords.forEach((va, k) => {
    const vb = B.accords.get(k);
    if (vb !== undefined) { const w = Math.min(va, vb); score += 3 * w; shared.push({ w: w * 1.2, label: k }); }
  });
  const seen = new Set<string>();
  A.notes.forEach((k) => {
    if (!B.notes.has(k) || seen.has(k)) return;
    seen.add(k);
    const w = A.base.has(k) && B.base.has(k) ? 1.5 : 1.1; // shared dry-down matters most
    score += w;
    shared.push({ w: k.includes(' ') ? w + 0.3 : w, label: k });
  });
  A.families.forEach((f) => { if (B.families.has(f)) score += 1.4; });
  A.moods.forEach((m) => { if (B.moods.has(m)) score += 0.5; });
  A.seasons.forEach((s) => { if (B.seasons.has(s)) score += 0.25; });
  score += genderFit(A.gender, B.gender);
  if (clean(a.category) && clean(a.category) === clean(b.category)) score += 0.4;

  const labels: string[] = [];
  // show whole note names ("tonka bean") before single words, never both
  shared.sort((x, y) => y.w - x.w).forEach((s) => {
    if (labels.length >= 3) return;
    const clash = labels.some((l) => l.split(' ').includes(s.label) || s.label.split(' ').includes(l) || l === s.label);
    if (!clash) labels.push(s.label);
  });
  return { product: b, score, shared: labels };
};

/** Him / Her / Unisex from the product, falling back to the scent profile. */
const sexOf = (p: FragranceProduct): 'm' | 'f' | 'u' => {
  const g = clean(p.gender);
  if (g === 'him') return 'm';
  if (g === 'her') return 'f';
  if (g === 'unisex') return 'u';
  const sp: any = (p as any).scentProfile || (p as any).scent_profile || {};
  const pos = clean(sp.genderPositioning);
  if (/femin|women|female/.test(pos)) return 'f';
  if (/mascul|men|male/.test(pos)) return 'm';
  return 'u';
};
/** Men's scent → men's + unisex; women's scent → women's + unisex; unisex → everything. */
const allowed = (current: FragranceProduct, other: FragranceProduct) => {
  const a = sexOf(current), b = sexOf(other);
  return a === 'u' || b === 'u' || a === b;
};

/** The best matches for a perfume, varied across brands. */
export const similarScents = (current: FragranceProduct, all: FragranceProduct[], count = 4): Match[] => {
  const scored = all
    .filter((p) => String(p.id) !== String(current.id) && allowed(current, p))
    .map((p) => scentMatch(current, p))
    .sort((x, y) => y.score - x.score);
  const out: Match[] = [];
  const perBrand = new Map<string, number>();
  for (const m of scored) {
    const b = clean(m.product.brand);
    if ((perBrand.get(b) || 0) >= 2) continue; // no more than two from one house
    out.push(m); perBrand.set(b, (perBrand.get(b) || 0) + 1);
    if (out.length === count) break;
  }
  // too little data to judge: fall back to the same category / gender
  if (out.length < count) {
    for (const m of scored) { if (out.length === count) break; if (!out.includes(m)) out.push(m); }
  }
  return out;
};
