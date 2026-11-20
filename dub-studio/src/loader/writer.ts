// Streams one stem into 10 s pieces of 16-bit PCM (OPFS, or kept in memory), computing as it goes:
// waveform peaks, gated mean square (loudness) and an onset envelope (tempo). Runs inside workers.

const PEAKS = 320, HOP = 512;
type SyncHandle = { write(b: ArrayBufferView, o?: { at: number }): number; truncate(n: number): void; flush(): void; close(): void };

// pieces: present when some pieces could not be written to OPFS; null entries are in OPFS
export interface StemOut { n: number; ch: number; dur: number; peaks: number[]; ms: number; onsets: Float32Array; hop: number; opfs: boolean; pieces?: (Int16Array | null)[] }

export async function stemDir(songId: string, stem: number): Promise<FileSystemDirectoryHandle | null> {
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
    const h = await (fh as FileSystemFileHandle & { createSyncAccessHandle(): Promise<SyncHandle> }).createSyncAccessHandle();
    h.truncate(0); h.write(data, { at: 0 }); h.flush(); h.close(); return true;
  } catch { return false; }
}

export class StemWriter {
  private segN: number; private buf: Int16Array; private fill = 0; private k = 0; private pos = 0;
  private dir: FileSystemDirectoryHandle | null = null; private opfs = true; private kept: (Int16Array | null)[] = []; private inMem = false;
  private peaks = new Float32Array(PEAKS); private per: number;
  private blk: number; private bq = 0; private bn = 0; private sum = 0; private cnt = 0;
  private on: number[] = []; private hq = 0; private hn = 0; private prev = 0; private hp = 0; private x1 = 0;
  constructor(private songId: string, private stem: number, private ch: number, private sr: number, seg: number, total: number) {
    this.segN = Math.round(seg * sr); this.buf = new Int16Array(this.segN * ch);
    this.per = Math.max(1, Math.floor(total / PEAKS)); this.blk = Math.floor(0.4 * sr);
  }
  async open() { this.dir = await stemDir(this.songId, this.stem); this.opfs = !!this.dir; }
  // frames of audio, one Float32Array per channel (same length)
  async push(chans: Float32Array[]) {
    const n = chans[0].length, ch = this.ch;
    for (let i = 0; i < n; i++) {
      let m = 0, a = 0;
      for (let c = 0; c < ch; c++) { const v = chans[c][i], q = v >= 1 ? 32767 : v <= -1 ? -32768 : Math.round(v * 32767); this.buf[this.fill * ch + c] = q; const av = v < 0 ? -v : v; if (av > a) a = av; m += v; }
      const b = Math.min(PEAKS - 1, Math.floor(this.pos / this.per)); if (a > this.peaks[b]) this.peaks[b] = a;
      for (let c = 0; c < ch; c++) this.bq += chans[c][i] * chans[c][i];
      if (++this.bn === this.blk) { const q = this.bq / (this.blk * ch); if (q > 1e-7) { this.sum += q; this.cnt++; } this.bq = 0; this.bn = 0; }
      const x = m / ch; this.hp = 0.95 * (this.hp + x - this.x1); this.x1 = x; this.hq += this.hp * this.hp;
      if (++this.hn === HOP) { const e = Math.log1p(1000 * this.hq / HOP); this.on.push(Math.max(0, e - this.prev)); this.prev = e; this.hq = 0; this.hn = 0; }
      this.pos++;
      if (++this.fill === this.segN) await this.flush();
    }
  }
  private async flush() {
    if (!this.fill) return;
    const out = this.buf.slice(0, this.fill * this.ch);
    if (this.opfs && !(await writeFile(this.dir!, this.k + '.pcm', out))) this.opfs = false;   // OPFS full or gone: the rest stays in memory
    if (this.opfs) this.kept.push(null); else { this.kept.push(out); this.inMem = true; }
    this.k++; this.fill = 0;
  }
  async finish(): Promise<StemOut> {
    await this.flush();
    const onsets = Float32Array.from(this.on);
    return { n: this.k, ch: this.ch, dur: this.pos / this.sr, peaks: Array.from(this.peaks, v => Math.round(v * 1000) / 1000), ms: this.cnt ? this.sum / this.cnt : 0,
      onsets, hop: HOP, opfs: !this.inMem, pieces: this.inMem ? this.kept : undefined };
  }
}
