// The page side of the splitter: decode the mix at the model's 44.1 kHz, run the worker, collect the six stems.
import SplitWorker from './split.worker.ts?worker';
import type { SplitIn, SplitOut } from './split.worker';
import type { StemOut } from '../loader/writer';
import { adoptPieces, SEG } from '../loader/store';

export const SOURCES = ['Drums', 'Bass', 'Other', 'Vocals', 'Guitar', 'Keys'];   // htdemucs_6s order; piano goes to Keys
export const SLOTS = [0, 1, 2, 3, 4, 5];
export const MODEL_MB = 285;

export interface SplitProgress { stage: 'decode' | 'model' | 'load' | 'split'; done: number; total: number; ep?: string; eta?: number }
let current: Worker | null = null;

export async function modelSaved(): Promise<boolean> {
  try { const d = await (await navigator.storage.getDirectory()).getDirectoryHandle('models'); return (await (await d.getFileHandle('htdemucs6s.onnx')).getFile()).size > 200e6; }
  catch { return false; }
}

export function cancelSplit() { current?.postMessage({ type: 'cancel' } satisfies SplitIn); }

export async function splitFile(file: Blob, songId: string, onProgress: (p: SplitProgress) => void): Promise<{ stems: StemOut[]; ep: string; secs: number }> {
  onProgress({ stage: 'decode', done: 0, total: 1 });
  const ab = await file.arrayBuffer();
  const buf = await new OfflineAudioContext(2, 1, 44100).decodeAudioData(ab);   // decoded straight to 44.1 kHz
  const left = new Float32Array(buf.getChannelData(0)), right = new Float32Array(buf.numberOfChannels > 1 ? buf.getChannelData(1) : buf.getChannelData(0));
  const base = new URL('./', location.href).href;
  return new Promise((ok, no) => {
    const w = new SplitWorker(); current = w;
    const stems: StemOut[] = []; let t0 = 0;
    w.onmessage = (e: MessageEvent<SplitOut>) => {
      const m = e.data;
      if (m.type === 'progress') {
        let eta: number | undefined;
        if (m.stage === 'split') { if (m.done === 0) t0 = performance.now(); else eta = (performance.now() - t0) / m.done * (m.total - m.done) / 1000; }
        onProgress({ stage: m.stage, done: m.done, total: m.total, ep: m.ep, eta });
      } else if (m.type === 'stem') { stems[m.source] = m.out; if (m.out.pieces) adoptPieces(songId, SLOTS[m.source], m.out.pieces); }
      else if (m.type === 'done') { w.terminate(); current = null; ok({ stems, ep: m.ep, secs: m.secs }); }
      else { w.terminate(); current = null; no(new Error(m.msg)); }
    };
    w.onerror = e => { w.terminate(); current = null; no(new Error(e.message || 'splitter failed')); };
    w.postMessage({ type: 'run', songId, base, left, right, seg: SEG, slots: SLOTS } satisfies SplitIn, [left.buffer, right.buffer]);
  });
}
