// All the mix state, saved to localStorage, with an undo stack of whole-mix snapshots.

export interface Chan { cut: number; echo: number; verb: number; fader: number; mute: boolean; solo: boolean }
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

export const freshChan = (): Chan => ({ cut: 0, echo: 0, verb: 0, fader: 1, mute: false, solo: false });
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
function applyJson(j: string) {
  const o = JSON.parse(j) as State; o.ch.forEach((c, k) => { if (S.ch[k]) Object.assign(S.ch[k], c); });
  Object.assign(S.m, o.m, { sir: { ...S.m.sir, ...o.m.sir }, syn: { ...S.m.syn, ...o.m.syn } });
}
export function recallSnap(i: number): boolean { const j = snaps[i]; if (!j) return false; gestureStart(); applyJson(j); lastSnap = i; gestureEnd(); return true; }
// a song's own mix, when it is opened again
export const mixJson = () => JSON.stringify({ ch: S.ch.map(c => ({ ...c, solo: false })), m: S.m });
export function setMix(j: unknown) { if (typeof j === 'string') try { applyJson(j); save(); } catch { /* old or bad */ } }
