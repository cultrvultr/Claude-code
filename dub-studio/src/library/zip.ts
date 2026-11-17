// Store-only zip (no compression: the pieces are PCM and barely compress). Writing builds a Blob that refers to the
// source Files, so a 300 MB song is never held in memory; CRC-32s are computed by streaming each file once.
// Reading uses the central directory and slices the Blob.

const TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
async function crc32(b: Blob): Promise<number> {
  let c = 0xffffffff; const r = b.stream().getReader();
  for (;;) { const { done, value } = await r.read(); if (done) break; for (let i = 0; i < value.length; i++) c = TABLE[(c ^ value[i]) & 0xff] ^ (c >>> 8); }
  return (c ^ 0xffffffff) >>> 0;
}
const enc = new TextEncoder();

export async function makeZip(entries: { name: string; data: Blob }[], onFile?: (i: number) => void): Promise<Blob> {
  const parts: BlobPart[] = [], central: Uint8Array<ArrayBuffer>[] = []; let off = 0;
  for (let i = 0; i < entries.length; i++) {
    const { name, data } = entries[i], nm = enc.encode(name) as Uint8Array<ArrayBuffer>, crc = await crc32(data), size = data.size;
    if (size >= 0xffffffff || off >= 0xffffffff) throw new Error('song too large to export');
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
    h.setUint32(14, crc, true); h.setUint32(18, size, true); h.setUint32(22, size, true); h.setUint16(26, nm.length, true);
    parts.push(h.buffer, nm, data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
    c.setUint32(16, crc, true); c.setUint32(20, size, true); c.setUint32(24, size, true); c.setUint16(28, nm.length, true); c.setUint32(42, off, true);
    const cc = new Uint8Array(46 + nm.length); cc.set(new Uint8Array(c.buffer)); cc.set(nm, 46); central.push(cc);
    off += 30 + nm.length + size; onFile?.(i);
  }
  const cdSize = central.reduce((a, c) => a + c.length, 0), e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, entries.length, true); e.setUint16(10, entries.length, true); e.setUint32(12, cdSize, true); e.setUint32(16, off, true);
  return new Blob([...parts, ...central, e.buffer], { type: 'application/zip' });
}

export async function readZip(z: Blob): Promise<{ name: string; data: Blob }[]> {
  const tailLen = Math.min(z.size, 65557), tail = new DataView(await z.slice(z.size - tailLen).arrayBuffer());
  let eo = -1; for (let i = tailLen - 22; i >= 0; i--) if (tail.getUint32(i, true) === 0x06054b50) { eo = i; break; }
  if (eo < 0) throw new Error('not a zip file');
  const n = tail.getUint16(eo + 10, true), cdSize = tail.getUint32(eo + 12, true), cdOff = tail.getUint32(eo + 16, true);
  const cd = new DataView(await z.slice(cdOff, cdOff + cdSize).arrayBuffer()), dec = new TextDecoder(), out: { name: string; data: Blob }[] = [];
  for (let i = 0, p = 0; i < n; i++) {
    if (cd.getUint32(p, true) !== 0x02014b50) throw new Error('bad zip directory');
    const method = cd.getUint16(p + 10, true), size = cd.getUint32(p + 20, true), nl = cd.getUint16(p + 28, true), xl = cd.getUint16(p + 30, true), cl = cd.getUint16(p + 32, true), lo = cd.getUint32(p + 42, true);
    const name = dec.decode(new Uint8Array(cd.buffer, p + 46, nl));
    if (method !== 0) throw new Error('compressed zips are not supported: export it from Dub Studio');
    const lh = new DataView(await z.slice(lo, lo + 30).arrayBuffer()), start = lo + 30 + lh.getUint16(26, true) + lh.getUint16(28, true);
    out.push({ name, data: z.slice(start, start + size) });
    p += 46 + nl + xl + cl;
  }
  return out;
}

// a WAV is a 44-byte header in front of interleaved 16-bit samples, which is exactly how the pieces are stored
export function wavHeader(frames: number, ch: number, sr: number): ArrayBuffer {
  const b = new DataView(new ArrayBuffer(44)), bytes = frames * ch * 2, s = (o: number, t: string) => { for (let i = 0; i < 4; i++) b.setUint8(o + i, t.charCodeAt(i)); };
  s(0, 'RIFF'); b.setUint32(4, 36 + bytes, true); s(8, 'WAVE'); s(12, 'fmt '); b.setUint32(16, 16, true); b.setUint16(20, 1, true); b.setUint16(22, ch, true);
  b.setUint32(24, sr, true); b.setUint32(28, sr * ch * 2, true); b.setUint16(32, ch * 2, true); b.setUint16(34, 16, true); s(36, 'data'); b.setUint32(40, bytes, true);
  return b.buffer;
}
