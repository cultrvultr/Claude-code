// Track loader worker: one decoded stem in, analysed and cut into 10 s pieces (see writer.ts).
import { StemWriter, type StemOut } from './writer';

export interface PieceJob { id: number; songId: string; stem: number; sr: number; seg: number; channels: Float32Array[] }
export type PieceResult = StemOut & { id: number; error?: string };

function isMono(L: Float32Array, R: Float32Array): boolean {
  let d = 0, e = 0; const step = Math.max(1, Math.floor(L.length / 200000));
  for (let i = 0; i < L.length; i += step) { const a = L[i], b = R[i]; d += (a - b) * (a - b); e += a * a + b * b; }
  return e === 0 || d / e < 1e-6;
}

self.onmessage = async (ev: MessageEvent<PieceJob>) => {
  const { id, songId, stem, sr, seg } = ev.data;
  try {
    let chans = ev.data.channels.slice(0, 2);
    if (chans.length === 2 && isMono(chans[0], chans[1])) chans = [chans[0]];   // half the space for mono parts
    const w = new StemWriter(songId, stem, chans.length, sr, seg, chans[0].length); await w.open();
    const step = sr * 5; for (let a = 0; a < chans[0].length; a += step) await w.push(chans.map(c => c.subarray(a, a + step)));
    const r: PieceResult = { id, ...(await w.finish()) };
    const tr: Transferable[] = [r.onsets.buffer]; r.pieces?.forEach(p => { if (p) tr.push(p.buffer); });
    (self as unknown as Worker).postMessage(r, tr);
  } catch (e) { (self as unknown as Worker).postMessage({ id, error: String(e) }); }
};
