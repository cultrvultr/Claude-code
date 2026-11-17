// Reads a stored piece and turns its 16-bit samples into float channels off the main thread,
// so playback never stalls the page (the page only copies the floats into an AudioBuffer).
self.onmessage = async (e: MessageEvent<{ id: number; path: string[]; ch: number; pcm?: Int16Array }>) => {
  const { id, path, ch } = e.data;
  try {
    let pcm = e.data.pcm;
    if (!pcm) {
      let d = await navigator.storage.getDirectory();
      for (const p of path.slice(0, -1)) d = await d.getDirectoryHandle(p);
      pcm = new Int16Array(await (await (await d.getFileHandle(path[path.length - 1])).getFile()).arrayBuffer());
    }
    const n = pcm.length / ch, out = Array.from({ length: ch }, () => new Float32Array(n));
    for (let c = 0; c < ch; c++) { const o = out[c]; for (let j = 0, q = c; j < n; j++, q += ch) o[j] = pcm[q] / 32768; }
    (self as unknown as Worker).postMessage({ id, out }, out.map(o => o.buffer));
  } catch { (self as unknown as Worker).postMessage({ id, out: null }); }
};
