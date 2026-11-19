// Cloud stem splitter: forwards to the Modal app in modal/splitter.py (Demucs htdemucs_6s on a GPU).
// SPLIT_URL and SPLIT_KEY are set on the Pages project by .github/workflows/dub-splitter-deploy.yml; the key never reaches the browser.
//   POST /api/split               body: the song file        -> { id }
//   GET  /api/split?id=…          the job's state            -> { status, progress?, error?, stems?: string[] }
//   GET  /api/split?id=…&stem=…   one finished part (MP3)
//   POST /api/split?id=…&cancel=1 stop the job
interface Env { SPLIT_URL?: string; SPLIT_KEY?: string }
type Ctx = { request: Request; env: Env };

const MAX_BYTES = 60 * 1024 * 1024;
const ID = /^fc-[A-Za-z0-9]{10,40}$/, STEM = /^(drums|bass|other|vocals|guitar|piano)$/;

const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const ready = (env: Env) => !!env.SPLIT_URL && /^https:\/\/[a-z0-9-]+\.modal\.run\/?$/.test(env.SPLIT_URL) && !!env.SPLIT_KEY;
const call = (env: Env, path: string, init: RequestInit = {}) =>
  fetch(env.SPLIT_URL!.replace(/\/$/, '') + path, { ...init, headers: { 'x-key': env.SPLIT_KEY!, ...(init.headers || {}) } });
async function pass(r: Response) {
  let j: Record<string, unknown> = {}; try { j = await r.json(); } catch { /* */ }
  if (r.ok) return json(j);
  return json({ error: typeof j.error === 'string' ? j.error : 'The splitter answered ' + r.status }, r.status === 404 || r.status === 413 ? r.status : 502);
}
const notSetUp = () => json({ error: 'The splitter is not set up on this site yet.' }, 503);

export const onRequestPost = async ({ request, env }: Ctx) => {
  if (!ready(env)) return notSetUp();
  const url = new URL(request.url), id = url.searchParams.get('id');
  if (id) {
    if (!ID.test(id) || !url.searchParams.has('cancel')) return json({ error: 'Bad request' }, 400);
    return pass(await call(env, '/cancel/' + id, { method: 'POST' }));
  }
  const size = +(request.headers.get('content-length') || 0);
  if (!size || size > MAX_BYTES) return json({ error: `The song file must be under ${MAX_BYTES / 1024 / 1024} MB.` }, 413);
  const type = (request.headers.get('content-type') || '').split(';')[0];
  if (!/^(audio\/[\w.+-]+|video\/mp4|application\/octet-stream)$/.test(type)) return json({ error: 'Not an audio file' }, 415);
  const body = await request.arrayBuffer(); if (body.byteLength > MAX_BYTES) return json({ error: 'Too big' }, 413);
  return pass(await call(env, '/split', { method: 'POST', headers: { 'content-type': type }, body }));
};

export const onRequestGet = async ({ request, env }: Ctx) => {
  if (!ready(env)) return notSetUp();
  const url = new URL(request.url), id = url.searchParams.get('id') || '', stem = url.searchParams.get('stem');
  if (!ID.test(id) || (stem !== null && !STEM.test(stem))) return json({ error: 'Bad request' }, 400);
  if (stem === null) return pass(await call(env, '/status/' + id));
  const r = await call(env, `/stem/${id}/${stem}`);
  if (!r.ok || !r.body) return pass(r);
  return new Response(r.body, { headers: { 'content-type': 'audio/mpeg', 'cache-control': 'no-store' } });
};
