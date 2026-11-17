// Where the pieces live: OPFS (songs/<id>/s<stem>/<k>.pcm, plus songs/<id>/meta.json), or memory when OPFS is unavailable.
import PieceWorker from './worker.ts?worker';
import type { PieceResult } from './worker';

export const SEG = 10;   // seconds per piece

export interface StemMeta { name: string; n: number; ch: number; dur: number; peaks: number[]; ms: number; offset: number; file?: string }
export interface SongMeta { id: string; title: string; bpm: number; bpmAuto?: boolean; sr: number; seg: number; gain: number; stems: (StemMeta | null)[]; cues: number[]; created: number; played?: number }

const mem = new Map<string, (Int16Array | null)[]>();   // `${songId}/${stem}` -> pieces OPFS could not take (null: that one is in OPFS)
export function adoptPieces(songId: string, stem: number, pieces: (Int16Array | null)[]) { mem.set(`${songId}/${stem}`, pieces); }
let worker: Worker | null = null, nextId = 1;
const waiting = new Map<number, (r: PieceResult) => void>();
function w(): Worker {
  if (!worker) { worker = new PieceWorker(); worker.onmessage = e => { const r = e.data as PieceResult; waiting.get(r.id)?.(r); waiting.delete(r.id); }; }
  return worker;
}

export const newSongId = () => 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// cut one decoded stem into pieces and analyse it; the channel data is handed to the worker (transferred, not copied)
export function pieceStem(songId: string, stem: number, sr: number, channels: Float32Array[]): Promise<PieceResult> {
  return new Promise((ok, no) => {
    const id = nextId++;
    waiting.set(id, r => { if (r.error) no(new Error(r.error)); else { if (r.pieces) mem.set(`${songId}/${stem}`, r.pieces); ok(r); } });
    w().postMessage({ id, songId, stem, sr, seg: SEG, channels }, channels.map(c => c.buffer));
  });
}

async function songDir(songId: string, create = false) {
  const root = await navigator.storage.getDirectory();
  const songs = await root.getDirectoryHandle('songs', { create: true });
  return songs.getDirectoryHandle(songId, { create });
}

export async function readPiece(songId: string, stem: number, k: number): Promise<Int16Array | null> {
  const m = mem.get(`${songId}/${stem}`); if (m && m[k]) return m[k];
  try { const d = await (await songDir(songId)).getDirectoryHandle('s' + stem); const f = await (await d.getFileHandle(k + '.pcm')).getFile(); return new Int16Array(await f.arrayBuffer()); }
  catch { return null; }
}

export async function saveMeta(meta: SongMeta) {
  try {
    const d = await songDir(meta.id, true), fh = await d.getFileHandle('meta.json', { create: true });
    const wr = await (fh as FileSystemFileHandle & { createWritable?: () => Promise<FileSystemWritableFileStream> }).createWritable?.();
    if (wr) { await wr.write(JSON.stringify(meta)); await wr.close(); return; }
  } catch { /* no OPFS writes from the page (older Safari): kept in localStorage below */ }
  try { localStorage.setItem('dub-studio-meta-' + meta.id, JSON.stringify(meta)); } catch { /* full */ }
}
export async function loadMeta(id: string): Promise<SongMeta | null> {
  try { const f = await (await (await songDir(id)).getFileHandle('meta.json')).getFile(); return JSON.parse(await f.text()); }
  catch { try { return JSON.parse(localStorage.getItem('dub-studio-meta-' + id) || 'null'); } catch { return null; } }
}
export async function listSongs(): Promise<SongMeta[]> {
  const out: SongMeta[] = [];
  try {
    const root = await navigator.storage.getDirectory(), songs = await root.getDirectoryHandle('songs', { create: true });
    for await (const [name] of (songs as unknown as { entries(): AsyncIterable<[string, FileSystemHandle]> }).entries()) { const m = await loadMeta(name); if (m) out.push(m); }
  } catch { /* no OPFS */ }
  return out.sort((a, b) => (b.played || b.created) - (a.played || a.created));
}
export async function deleteSong(id: string) {
  for (const k of [...mem.keys()]) if (k.startsWith(id + '/')) mem.delete(k);
  try { localStorage.removeItem('dub-studio-meta-' + id); } catch { /* */ }
  try { const root = await navigator.storage.getDirectory(), songs = await root.getDirectoryHandle('songs'); await songs.removeEntry(id, { recursive: true }); } catch { /* gone */ }
}
export const inMemory = (songId: string) => [...mem.keys()].some(k => k.startsWith(songId + '/'));
export function forgetMemory(songId: string) { for (const k of [...mem.keys()]) if (k.startsWith(songId + '/')) mem.delete(k); }

// ---------- tempo from an onset envelope: autocorrelation over 60-180 BPM, helped by the half and double lags ----------
export function detectBpm(on: Float32Array, sr: number, hop: number): number | null {
  const fps = sr / hop, n = Math.min(on.length, Math.floor(fps * 90));   // the first 90 s is plenty
  if (n < fps * 8) return null;
  let mean = 0; for (let i = 0; i < n; i++) mean += on[i]; mean /= n;
  const x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = on[i] - mean;
  const ac = (lag: number) => { const l = Math.round(lag); let s = 0; for (let i = l; i < n; i++) s += x[i] * x[i - l]; return s / (n - l); };
  let best = 0, bestBpm = 0;
  for (let bpm = 60; bpm <= 180; bpm += 0.25) {
    const lag = fps * 60 / bpm, s = ac(lag) + 0.5 * ac(lag * 2) + 0.25 * ac(lag / 2);
    const prior = Math.exp(-0.5 * Math.pow(Math.log2(bpm / 100) / 0.6, 2));   // a gentle lean to the middle of the range
    if (s * prior > best) { best = s * prior; bestBpm = bpm; }
  }
  return best > 0 ? Math.round(bestBpm * 10) / 10 : null;
}

// sum of stems' mean squares -> one gain for the whole song, so the mix lands near -16 LUFS without changing its balance
export function songGain(ms: number[]): number {
  const total = ms.reduce((a, b) => a + b, 0); if (!total) return 1;
  const lufs = -0.691 + 10 * Math.log10(total), db = Math.max(-12, Math.min(12, -16 - lufs));
  return Math.pow(10, db / 20);
}
