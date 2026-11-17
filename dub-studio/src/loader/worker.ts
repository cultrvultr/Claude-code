// Track loader worker: one decoded stem in, analysed and cut into 10 s pieces of 16-bit PCM out.
// Pieces go to the origin private file system (OPFS) when it is there; otherwise they come back to the page.
// Also: mono detection, waveform peaks, loudness (mean square, gated) and an onset envelope for tempo.

export interface PieceJob { id: number; songId: string; stem: number; sr: number; seg: number; channels: Float32Array[] }
export interface PieceResult {
  id: number; n: number; ch: number; dur: number; peaks: number[]; ms: number; onsets: Float32Array; hop: number;
  opfs: boolean; pieces?: Int16Array[]; error?: string;
}

const PEAKS = 320, HOP = 512;

async function dir(songId: string, stem: number): Promise<FileSystemDirectoryHandle | null> {
  try {
    const root = await navigator.storage.getDirectory();
    const songs = await root.getDirectoryHandle('songs', { create: true });
    const song = await songs.getDirectoryHandle(songId, { create: true });
    return await song.getDirectoryHandle('s' + stem, { create: true });
  } catch { return null; }
}

async function writeFile(d: FileSystemDirectoryHandle, name: string, data: Int16Array): Promise<boolean> {
  try {
    const fh = await d.getFileHandle(name, { create: true });
    const h = await (fh as FileSystemFileHandle & { createSyncAccessHandle(): Promise<{ write(b: ArrayBufferView, o?: { at: number }): number; truncate(n: number): void; flush(): void; close(): void }> }).createSyncAccessHandle();
    h.truncate(0); h.write(data, { at: 0 }); h.flush(); h.close(); return true;
  } catch { return false; }
}

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
    const len = chans[0].length, ch = chans.length, segN = Math.round(seg * sr), n = Math.max(1, Math.ceil(len / segN));

    // peaks for the waveform, loudness (400 ms blocks, gated at -70 dB) and the onset envelope
    const peaks: number[] = [], per = Math.max(1, Math.floor(len / PEAKS));
    for (let b = 0; b < PEAKS; b++) { let p = 0; const a = b * per, z = Math.min(len, a + per); for (const c of chans) for (let i = a; i < z; i++) { const v = Math.abs(c[i]); if (v > p) p = v; } peaks.push(Math.round(p * 1000) / 1000); }
    const blk = Math.floor(0.4 * sr); let sum = 0, cnt = 0;
    for (let a = 0; a + blk <= len; a += blk) { let q = 0; for (const c of chans) for (let i = a; i < a + blk; i++) q += c[i] * c[i]; q /= blk * ch; if (q > 1e-7) { sum += q; cnt++; } }
    const ms = cnt ? sum / cnt : 0;
    const frames = Math.floor(len / HOP), onsets = new Float32Array(frames); let prev = 0, hp = 0, x1 = 0;
    for (let f = 0; f < frames; f++) {
      let e = 0; for (let i = f * HOP; i < (f + 1) * HOP; i++) { const x = ch === 2 ? 0.5 * (chans[0][i] + chans[1][i]) : chans[0][i]; hp = 0.95 * (hp + x - x1); x1 = x; e += hp * hp; }
      e = Math.log1p(1000 * e / HOP); onsets[f] = Math.max(0, e - prev); prev = e;
    }

    // the pieces: interleaved 16-bit, each exactly seg long (the last may be shorter)
    const cut = (k: number) => {
      const a = k * segN, z = Math.min(len, a + segN), out = new Int16Array((z - a) * ch);
      for (let i = a, j = 0; i < z; i++) for (let c = 0; c < ch; c++, j++) { const v = chans[c][i]; out[j] = v >= 1 ? 32767 : v <= -1 ? -32768 : Math.round(v * 32767); }
      return out;
    };
    const d = await dir(songId, stem); let opfs = !!d; const keep: Int16Array[] = [];
    for (let k = 0; k < n; k++) {
      const out = cut(k);
      if (opfs && !(await writeFile(d!, k + '.pcm', out))) { opfs = false; for (let j = 0; j < k; j++) keep.push(cut(j)); }   // OPFS failed part way: send all of it back
      if (!opfs) keep.push(out);
    }
    const res: PieceResult = { id, n, ch, dur: len / sr, peaks, ms, onsets, hop: HOP, opfs };
    if (!opfs) res.pieces = keep;
    (self as unknown as Worker).postMessage(res, [onsets.buffer, ...keep.map(k => k.buffer)]);
  } catch (e) {
    (self as unknown as Worker).postMessage({ id, error: String(e) });
  }
};
