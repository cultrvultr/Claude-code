// Stem splitting in the cloud: the song goes to this site's /api/split (Demucs htdemucs_6s on Modal),
// the parts come back as MP3s. A phone hasn't the memory to run the model itself.
export const SOURCES: Record<string, string> = { drums: 'Drums', bass: 'Bass', other: 'Other', vocals: 'Vocals', guitar: 'Guitar', piano: 'Keys' };
export const ORDER = ['drums', 'bass', 'other', 'vocals', 'guitar', 'piano'];

/** done: bytes, seconds or parts; pct: how far the split itself is (0–100) */
export interface SplitProgress { stage: 'upload' | 'queue' | 'split' | 'download'; done: number; total: number; pct?: number }
let job: { id: string; cancel: () => void } | null = null;
let cancelled = false;

const API = new URL('api/split', location.href).href;
async function answer(r: Response) {
  let j: { error?: string } & Record<string, unknown> = {}; try { j = await r.json(); } catch { /* */ }
  if (!r.ok) throw new Error(j.error || 'the splitter answered ' + r.status);
  return j;
}

function upload(file: Blob, onProgress: (p: SplitProgress) => void): Promise<string> {
  return new Promise((ok, no) => {   // XHR: fetch can't report upload progress
    const x = new XMLHttpRequest(); x.open('POST', API);
    x.setRequestHeader('content-type', file.type || 'application/octet-stream');
    x.upload.onprogress = e => onProgress({ stage: 'upload', done: e.loaded, total: e.total || file.size });
    x.onload = () => answer(new Response(x.responseText || '{}', { status: x.status })).then(j => ok(String(j.id)), no);
    x.onerror = () => no(new Error('no connection'));
    x.onabort = () => no(new Error('cancelled'));
    job = { id: '', cancel: () => x.abort() };
    x.send(file);
  });
}
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

export function cancelSplit() { cancelled = true; job?.cancel(); }

/** Upload, wait, download. Returns the parts in ORDER that came back. */
export async function splitFile(file: Blob, onProgress: (p: SplitProgress) => void): Promise<{ name: string; blob: Blob }[]> {
  cancelled = false;
  try {
    const id = await upload(file, onProgress);
    if (cancelled) throw new Error('cancelled');
    job = { id, cancel: () => { fetch(API + '?id=' + id + '&cancel=1', { method: 'POST' }).catch(() => {}); } };
    const t0 = Date.now(); let stems: string[] = [];
    for (;;) {
      if (cancelled) throw new Error('cancelled');
      const j = await answer(await fetch(API + '?id=' + id, { cache: 'no-store' })) as { status: string; progress?: number; error?: string; stems?: string[] };
      if (j.status === 'succeeded') { stems = j.stems || []; break; }
      if (j.status === 'failed' || j.status === 'canceled') throw new Error(j.status === 'canceled' ? 'cancelled' : j.error || 'the split failed');
      onProgress({ stage: j.status === 'starting' ? 'queue' : 'split', done: (Date.now() - t0) / 1000, total: 0, pct: j.progress || 0 });
      await wait(3000);
    }
    const names = ORDER.filter(n => stems.includes(n)), out: { name: string; blob: Blob }[] = [];
    for (let i = 0; i < names.length; i++) {
      if (cancelled) throw new Error('cancelled');
      onProgress({ stage: 'download', done: i, total: names.length });
      const r = await fetch(API + '?id=' + id + '&stem=' + names[i], { cache: 'no-store' });
      if (!r.ok) await answer(r);
      out.push({ name: names[i], blob: await r.blob() });
    }
    return out;
  } finally { job = null; }
}
