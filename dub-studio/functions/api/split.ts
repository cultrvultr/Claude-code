// Cloud stem splitter: Demucs htdemucs_6s on Replicate. The Replicate token stays here on the server.
//   POST /api/split               body: the song file        -> { id }
//   GET  /api/split?id=…          the job's state            -> { status, error?, stems?: string[] }
//   GET  /api/split?id=…&stem=…   one finished part (MP3), streamed from Replicate
//   POST /api/split?id=…&cancel=1 stop the job
// Every request needs the invite code in X-Invite, so only people you gave it to can spend your credit.
interface Env { REPLICATE_API_TOKEN?: string; INVITE_CODE?: string }
type Ctx = { request: Request; env: Env };
interface Prediction { id: string; status: string; error?: string | null; output?: { stems?: { name: string; audio: string }[] } | null; input?: { audio?: string } }

const VERSION = 'bfc15c4c736da916143bf747f175ecf446b0242bd07837836c096d228866afbc';   // ryan5453/demucs, the version that has htdemucs_6s
const API = 'https://api.replicate.com/v1/';
const MAX_BYTES = 60 * 1024 * 1024;
const ID = /^[a-z0-9]{10,40}$/, STEM = /^(drums|bass|other|vocals|guitar|piano)$/;

const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const same = (a: string, b: string) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };
const rep = (env: Env, path: string, init: RequestInit = {}) => fetch(API + path, { ...init, headers: { authorization: 'Bearer ' + env.REPLICATE_API_TOKEN, ...(init.headers || {}) } });

function gate({ request, env }: Ctx): Response | null {
  if (!env.REPLICATE_API_TOKEN || !env.INVITE_CODE) return json({ error: 'The splitter is not set up on this site yet.' }, 503);
  const code = (request.headers.get('x-invite') || '').trim().toLowerCase();
  if (!same(code, env.INVITE_CODE.trim().toLowerCase())) return json({ error: 'invite' }, 401);
  return null;
}
async function job(env: Env, id: string): Promise<Prediction | Response> {
  const r = await rep(env, 'predictions/' + id);
  if (!r.ok) return json({ error: 'No such split' }, r.status === 404 ? 404 : 502);
  return r.json() as Promise<Prediction>;
}

export const onRequestPost = async (ctx: Ctx) => {
  const no = gate(ctx); if (no) return no;
  const { request, env } = ctx, url = new URL(request.url), id = url.searchParams.get('id');
  if (id) {
    if (!ID.test(id) || !url.searchParams.has('cancel')) return json({ error: 'Bad request' }, 400);
    await rep(env, `predictions/${id}/cancel`, { method: 'POST' }); return json({ ok: true });
  }
  const size = +(request.headers.get('content-length') || 0);
  if (!size || size > MAX_BYTES) return json({ error: `The song file must be under ${MAX_BYTES / 1024 / 1024} MB.` }, 413);
  const type = (request.headers.get('content-type') || '').split(';')[0];
  if (!/^(audio\/[\w.+-]+|video\/mp4|application\/octet-stream)$/.test(type)) return json({ error: 'Not an audio file' }, 415);
  const body = await request.arrayBuffer(); if (body.byteLength > MAX_BYTES) return json({ error: 'Too big' }, 413);
  const fd = new FormData(); fd.append('content', new Blob([body], { type }), 'song');
  const up = await rep(env, 'files', { method: 'POST', body: fd });
  if (!up.ok) return json({ error: 'Upload to the splitter failed (' + up.status + ')' }, 502);
  const file = await up.json() as { urls: { get: string } };
  const pr = await rep(env, 'predictions', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ version: VERSION, input: { audio: file.urls.get, model: 'htdemucs_6s', output_format: 'mp3', mp3_bitrate: 320 } }) });
  const p = await pr.json() as Prediction & { detail?: string };
  if (!pr.ok) return json({ error: pr.status === 402 ? 'The splitter is out of credit.' : 'Could not start the split (' + pr.status + ')' }, 502);
  return json({ id: p.id });
};

export const onRequestGet = async (ctx: Ctx) => {
  const no = gate(ctx); if (no) return no;
  const { request, env } = ctx, url = new URL(request.url), id = url.searchParams.get('id') || '', stem = url.searchParams.get('stem');
  if (!ID.test(id) || (stem !== null && !STEM.test(stem))) return json({ error: 'Bad request' }, 400);
  const p = await job(env, id); if (p instanceof Response) return p;
  const stems = p.output?.stems || [];
  if (stem === null) {
    if (/^(succeeded|failed|canceled)$/.test(p.status) && p.input?.audio?.startsWith(API + 'files/')) await rep(env, p.input.audio.slice(API.length), { method: 'DELETE' }).catch(() => {});   // the uploaded song is not needed any more
    return json({ status: p.status, error: p.status === 'failed' ? 'The split failed' : undefined, stems: p.status === 'succeeded' ? stems.map(s => s.name).filter(n => STEM.test(n)) : undefined });
  }
  const s = stems.find(x => x.name === stem); if (!s) return json({ error: 'Not ready' }, 404);
  const r = await fetch(s.audio);   // a Replicate output URL from Replicate's own answer, never from the request
  if (!r.ok || !r.body) return json({ error: 'Download failed' }, 502);
  return new Response(r.body, { headers: { 'content-type': 'audio/mpeg', 'cache-control': 'no-store' } });
};
