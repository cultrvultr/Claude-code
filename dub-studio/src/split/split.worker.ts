// Stem splitter: htdemucs_6s (MIT) through ONNX Runtime Web, on WebGPU when the device has it, else WebAssembly.
// The model is downloaded once (in parts) and kept in OPFS. The song is processed in 7.8 s windows overlapping by a
// quarter, joined with linear crossfades, and each finished stretch goes straight to the six stems' piece writers,
// so memory stays flat however long the song is.
import * as ort from 'onnxruntime-web/webgpu';
import { StemWriter, type StemOut } from '../loader/writer';

export type SplitIn = { type: 'run'; songId: string; base: string; left: Float32Array; right: Float32Array; seg: number; slots: number[] } | { type: 'cancel' };
export type SplitOut =
  | { type: 'progress'; stage: 'model' | 'load' | 'split'; done: number; total: number; ep?: string }
  | { type: 'stem'; source: number; out: StemOut }
  | { type: 'done'; ep: string; secs: number }
  | { type: 'error'; msg: string };

interface Manifest { sources: string[]; sr: number; segment: number; size: number; parts: string[] }
const post = (m: SplitOut, tr: Transferable[] = []) => (self as unknown as Worker).postMessage(m, tr);
let cancelled = false;
type SyncHandle = { write(b: ArrayBufferView, o?: { at: number }): number; truncate(n: number): void; flush(): void; close(): void; getSize(): number };

async function modelBytes(base: string, man: Manifest): Promise<Uint8Array> {
  const root = await navigator.storage.getDirectory(), dir = await root.getDirectoryHandle('models', { create: true });
  const fh = await dir.getFileHandle('htdemucs6s.onnx', { create: true });
  let f = await fh.getFile();
  if (f.size !== man.size) {   // not here yet (or cut short): download the parts
    const h = await (fh as FileSystemFileHandle & { createSyncAccessHandle(): Promise<SyncHandle> }).createSyncAccessHandle();
    try {
      h.truncate(0); let at = 0;
      for (const p of man.parts) {
        if (cancelled) throw new Error('cancelled');
        const res = await fetch(base + 'models/htdemucs6s/' + p); if (!res.ok || !res.body) throw new Error('model download failed (' + res.status + ')');
        const rd = res.body.getReader();
        for (;;) { const { done, value } = await rd.read(); if (done) break; h.write(value, { at }); at += value.length; post({ type: 'progress', stage: 'model', done: at, total: man.size }); }
      }
      h.flush(); if (at !== man.size) throw new Error('model download incomplete');
    } finally { h.close(); }
    f = await fh.getFile();
  }
  return new Uint8Array(await f.arrayBuffer());
}

async function session(bytes: Uint8Array, base: string): Promise<[ort.InferenceSession, string]> {
  ort.env.wasm.wasmPaths = base + 'ort/';
  ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 2) : 1;
  const opts = { graphOptimizationLevel: 'all' as const };
  if ('gpu' in navigator) {
    try { return [await ort.InferenceSession.create(bytes, { ...opts, executionProviders: ['webgpu'] }), 'webgpu']; }
    catch (e) { console.warn('WebGPU not usable, using WebAssembly', e); }
  }
  return [await ort.InferenceSession.create(bytes, { ...opts, executionProviders: ['wasm'] }), 'wasm'];
}

self.onmessage = async (ev: MessageEvent<SplitIn>) => {
  const m = ev.data;
  if (m.type === 'cancel') { cancelled = true; return; }
  cancelled = false; const t0 = performance.now();
  try {
    const man: Manifest = await (await fetch(m.base + 'models/htdemucs6s/manifest.json')).json();
    const bytes = await modelBytes(m.base, man);
    post({ type: 'progress', stage: 'load', done: 0, total: 1 });
    const [sess, ep] = await session(bytes, m.base);
    const N = man.segment, S = man.sources.length, ov = N >> 2, stride = N - ov, total = m.left.length;
    const win = new Float32Array(N); for (let i = 0; i < N; i++) win[i] = i < ov ? i / (ov - 1) : i >= N - ov ? (N - 1 - i) / (ov - 1) : 1;
    const writers = await Promise.all(m.slots.map(async (slot, s) => { const w = new StemWriter(m.songId, slot, 2, man.sr, m.seg, total); await w.open(); void s; return w; }));
    // the overlap carried from one window into the next: weighted sum and weight
    const tail = Array.from({ length: S }, () => [new Float32Array(ov), new Float32Array(ov)]), tw = new Float32Array(ov);
    const chunks = Math.max(1, Math.ceil(total / stride)), input = new Float32Array(2 * N);
    post({ type: 'progress', stage: 'split', done: 0, total: chunks, ep });
    for (let k = 0; k < chunks; k++) {
      if (cancelled) throw new Error('cancelled');
      const a = k * stride, len = Math.min(N, total - a);
      input.fill(0); input.set(m.left.subarray(a, a + len), 0); input.set(m.right.subarray(a, a + len), N);
      const out = await sess.run({ mix: new ort.Tensor('float32', input, [1, 2, N]) });
      const y = out.stems.data as Float32Array;
      // final from this window: [a, a + stride) (or to the end of the song on the last one)
      const last = k === chunks - 1, emit = last ? len : Math.min(stride, len);
      for (let s = 0; s < S; s++) {
        const chans = [0, 1].map(c => {
          const o = new Float32Array(emit), base = (s * 2 + c) * N, t = tail[s][c];
          for (let i = 0; i < emit; i++) { const v = y[base + i] * win[i]; if (i < ov) { const wsum = tw[i] + win[i]; o[i] = wsum > 1e-8 ? (t[i] + v) / wsum : 0; } else o[i] = y[base + i]; }
          if (!last) for (let i = 0; i < ov; i++) t[i] = y[base + stride + i] * win[stride + i];
          return o;
        });
        await writers[s].push(chans);
      }
      if (!last) for (let i = 0; i < ov; i++) tw[i] = win[stride + i];
      post({ type: 'progress', stage: 'split', done: k + 1, total: chunks, ep });
    }
    for (let s = 0; s < S; s++) { const r = await writers[s].finish(); const tr: Transferable[] = [r.onsets.buffer]; r.pieces?.forEach(p => { if (p) tr.push(p.buffer); }); post({ type: 'stem', source: s, out: r }, tr); }
    await sess.release();
    post({ type: 'done', ep, secs: (performance.now() - t0) / 1000 });
  } catch (e) { post({ type: 'error', msg: e instanceof Error ? e.message : String(e) }); }
};
