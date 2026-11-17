// Writes a file into OPFS with a sync access handle (works in every browser that has OPFS, unlike createWritable).
type SyncHandle = { write(b: ArrayBufferView, o?: { at: number }): number; truncate(n: number): void; flush(): void; close(): void };
self.onmessage = async (e: MessageEvent<{ id: number; path: string[]; data: ArrayBuffer }>) => {
  const { id, path, data } = e.data;
  try {
    let d = await navigator.storage.getDirectory();
    for (const p of path.slice(0, -1)) d = await d.getDirectoryHandle(p, { create: true });
    const fh = await d.getFileHandle(path[path.length - 1], { create: true });
    const h = await (fh as FileSystemFileHandle & { createSyncAccessHandle(): Promise<SyncHandle> }).createSyncAccessHandle();
    h.truncate(0); h.write(new Uint8Array(data), { at: 0 }); h.flush(); h.close();
    (self as unknown as Worker).postMessage({ id, ok: true });
  } catch (err) { (self as unknown as Worker).postMessage({ id, ok: false, error: String(err) }); }
};
