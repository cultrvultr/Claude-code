// All the mix state, saved to localStorage, with an undo stack of whole-mix snapshots.

export interface Chan { cut: number; echo: number; verb: number; fader: number; mute: boolean; solo: boolean; pan: number }   // pan -1 (left) .. 1 (right)
export interface Mix {
  rep: number; dly: number; sync: boolean; div: number; width: number; bass: number; treb: number;
  e2v: number; ret: number;
  vIr: number; vDec: number; vLc: number; vHc: number; vRet: number;
  sir: { base: number; mode: number; beat: number; vol: number; momentary: boolean };
  syn: { x: number; dec: number; level: number };
  mix: number;
}
export interface State { ch: Chan[]; m: Mix }

export const DIVS: [string, number][] = [['1/16', 0.25], ['1/16.', 0.375], ['1/8', 0.5], ['1/8.', 0.75], ['1/4', 1], ['1/4.', 1.5], ['1/2', 2], ['1/2.', 3], ['1 bar', 4]];
export const HPF = [70, 100, 150, 250, 500, 1000, 2000, 3000, 5000, 7500];
export const LPF = [10000, 8000, 6000, 5000, 4000, 3000, 2000, 1000, 500, 250];
export const VLC = [0, 70, 100, 150, 250, 500, 1000, 2000, 3000, 5000, 7500];
export const VHC = [0, 10000, 8000, 6000, 5000, 4000, 3000, 2000, 1000, 500, 250];

export const freshChan = (): Chan => ({ cut: 0, echo: 0, verb: 0, fader: 1, mute: false, solo: false, pan: 0 });
export const freshMix = (): Mix => ({
  rep: 6, dly: 0.45, sync: true, div: 3, width: 0, bass: 0, treb: -1, e2v: 0.55, ret: 1,
  vIr: 0, vDec: 0, vLc: 3, vHc: 0, vRet: 1,
  sir: { base: 1, mode: 0, beat: 1, vol: 0.7, momentary: true },   // the siren plays while held
  syn: { x: 0.33, dec: 0.25, level: 0.5 },
  mix: 6.5,
});

const KEY = 'dub-studio-mix-v1';
const load = (): State => {
  const s: State = { ch: Array.from({ length: 8 }, freshChan), m: freshMix() };
  try {
    const j = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (j && Array.isArray(j.ch) && j.m) {
      j.ch.slice(0, 8).forEach((c: Partial<Chan>, i: number) => Object.assign(s.ch[i], c, { mute: false, solo: false }));
      Object.assign(s.m, j.m, { sir: { ...s.m.sir, ...(j.m.sir || {}) }, syn: { ...s.m.syn, ...(j.m.syn || {}) } });
    }
  } catch { /* private mode or bad data: defaults */ }
  try { if (!localStorage.getItem('dub-studio-siren-hold')) { s.m.sir.momentary = true; localStorage.setItem('dub-studio-siren-hold', '1'); } } catch { /* */ }   // once: hold becomes the default for everyone
  return s;
};

export const S: State = load();
let saveT = 0;
export function save() { clearTimeout(saveT); saveT = window.setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* full or blocked */ } }, 200); }

// undo: a snapshot is taken when a gesture starts; it is kept only if the gesture changed something
const undo: string[] = [];
let pending: string | null = null;
export function gestureStart() { pending = JSON.stringify(S); }
export function gestureEnd() { if (pending && pending !== JSON.stringify(S)) { undo.push(pending); if (undo.length > 60) undo.shift(); } pending = null; save(); onUndoChange(); }
export function canUndo() { return undo.length > 0; }
export function popUndo(): boolean {
  const j = undo.pop(); if (!j) return false;
  const o = JSON.parse(j) as State; o.ch.forEach((c, i) => Object.assign(S.ch[i], c)); Object.assign(S.m, o.m);
  save(); onUndoChange(); return true;
}
export function resetMix() { gestureStart(); S.ch.forEach(c => Object.assign(c, freshChan())); gestureEnd(); }
let onUndoChange = () => {};
export function watchUndo(fn: () => void) { onUndoChange = fn; }

// ---------- mix snapshots A-D: hold to store, tap to recall (kept with each song; see main.ts) ----------
let snaps: (string | null)[] = [null, null, null, null];
export let lastSnap = -1;
export const hasSnap = (i: number) => !!snaps[i];
export const getSnaps = () => snaps.slice();
export function setSnaps(a: (string | null)[] | undefined) { snaps = (a || []).slice(0, 4).concat([null, null, null, null]).slice(0, 4); lastSnap = -1; }
export function storeSnap(i: number) { snaps[i] = JSON.stringify({ ch: S.ch.map(c => ({ ...c, solo: false })), m: S.m }); lastSnap = i; onUndoChange(); }
// a stored mix (from a snapshot, or a song someone sent) is untrusted: only known keys, only numbers in range
const n = (v: unknown, lo: number, hi: number, d: number) => typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d;
function applyJson(j: string) {
  let o: { ch?: unknown; m?: Record<string, unknown> };
  try { o = JSON.parse(j); } catch { return; }
  if (!o || typeof o !== 'object') return;
  if (Array.isArray(o.ch)) o.ch.slice(0, 8).forEach((raw, k) => { if (!raw || typeof raw !== 'object') return; const c = raw as Record<string, unknown>, t = S.ch[k];
    t.cut = Math.round(n(c.cut, -10, 10, t.cut)); t.echo = n(c.echo, 0, 1, t.echo); t.verb = n(c.verb, 0, 1, t.verb); t.fader = n(c.fader, 0, 1, t.fader);
    t.pan = n(c.pan, -1, 1, 0); t.mute = c.mute === true; });
  const m = o.m; if (!m || typeof m !== 'object') return; const t = S.m;
  t.rep = n(m.rep, 0, 10, t.rep); t.dly = n(m.dly, 0, 1, t.dly); t.sync = typeof m.sync === 'boolean' ? m.sync : t.sync; t.div = Math.round(n(m.div, 0, 8, t.div));
  t.width = Math.round(n(m.width, 0, 2, t.width)); t.bass = n(m.bass, -5, 5, t.bass); t.treb = n(m.treb, -5, 5, t.treb); t.e2v = n(m.e2v, 0, 1, t.e2v); t.ret = n(m.ret, 0, 1.5, t.ret);
  t.vIr = Math.round(n(m.vIr, 0, 4, t.vIr)); t.vDec = n(m.vDec, 0, 60, t.vDec); t.vLc = Math.round(n(m.vLc, 0, 10, t.vLc)); t.vHc = Math.round(n(m.vHc, 0, 10, t.vHc)); t.vRet = n(m.vRet, 0, 1.5, t.vRet);
  t.mix = n(m.mix, 0, 10, t.mix);
  const sir = m.sir as Record<string, unknown> | undefined, syn = m.syn as Record<string, unknown> | undefined;
  if (sir && typeof sir === 'object') { t.sir.base = Math.round(n(sir.base, 0, 2, t.sir.base)); t.sir.mode = Math.round(n(sir.mode, 0, 3, t.sir.mode)); t.sir.beat = Math.round(n(sir.beat, 0, 3, t.sir.beat));
    t.sir.vol = n(sir.vol, 0, 1, t.sir.vol); if (typeof sir.momentary === 'boolean') t.sir.momentary = sir.momentary; }
  if (syn && typeof syn === 'object') { t.syn.x = n(syn.x, 0, 1, t.syn.x); t.syn.dec = n(syn.dec, 0.02, 2, t.syn.dec); t.syn.level = n(syn.level, 0, 1, t.syn.level); }
}
export function recallSnap(i: number): boolean { const j = snaps[i]; if (!j) return false; gestureStart(); applyJson(j); lastSnap = i; gestureEnd(); return true; }
// a song's own mix, when it is opened again
export const mixJson = () => JSON.stringify({ ch: S.ch.map(c => ({ ...c, solo: false })), m: S.m });
export function setMix(j: unknown) { if (typeof j === 'string') try { applyJson(j); save(); } catch { /* old or bad */ } }
