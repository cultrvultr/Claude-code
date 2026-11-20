// Small OPFS helpers for the library: write (createWritable, or a worker with a sync handle), read, list, remove.
import FsWorker from './fs.worker.ts?worker';

let w: Worker | null = null, nid = 1;
const wait = new Map<number, (r: { ok: boolean; error?: string }) => void>();
function worker() { if (!w) { w = new FsWorker(); w.onmessage = e => { wait.get(e.data.id)?.(e.data); wait.delete(e.data.id); }; } return w; }

async function dirOf(path: string[], create: boolean): Promise<FileSystemDirectoryHandle> {
  let d = await navigator.storage.getDirectory();
  for (const p of path) d = await d.getDirectoryHandle(p, { create });
  return d;
}
export async function writeAt(path: string[], data: Blob | ArrayBuffer | string): Promise<void> {
  const blob = data instanceof Blob ? data : new Blob([data]);
  try {
    const d = await dirOf(path.slice(0, -1), true), fh = await d.getFileHandle(path[path.length - 1], { create: true });
    const cw = (fh as FileSystemFileHandle & { createWritable?: () => Promise<FileSystemWritableFileStream> }).createWritable;
    if (cw) { const s = await cw.call(fh); await s.write(blob); await s.close(); return; }
  } catch { /* fall through to the worker */ }
  const buf = await blob.arrayBuffer();
  const r = await new Promise<{ ok: boolean; error?: string }>(ok => { const id = nid++; wait.set(id, ok); worker().postMessage({ id, path, data: buf }, [buf]); });
  if (!r.ok) throw new Error(r.error || 'write failed');
}
export async function fileAt(path: string[]): Promise<File | null> {
  try { const d = await dirOf(path.slice(0, -1), false); return await (await d.getFileHandle(path[path.length - 1])).getFile(); } catch { return null; }
}
export async function list(path: string[]): Promise<string[]> {
  try { const d = await dirOf(path, false), out: string[] = []; for await (const [n] of (d as unknown as { entries(): AsyncIterable<[string, FileSystemHandle]> }).entries()) out.push(n); return out; } catch { return []; }
}
export async function remove(path: string[]): Promise<void> {
  try { const d = await dirOf(path.slice(0, -1), false); await d.removeEntry(path[path.length - 1], { recursive: true }); } catch { /* gone */ }
}
