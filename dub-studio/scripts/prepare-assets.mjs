// Build-time assets that do not live in git:
//  - onnxruntime-web's WebGPU/WASM runtime files -> public/ort/
//  - the htdemucs_6s model (MIT), pinned and checked, split into 20 MB parts -> public/models/htdemucs6s/
//    (Cloudflare Pages serves files up to 25 MB; the app joins the parts and keeps the model on the device)
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync, openSync, readSync, closeSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const MODEL = {
  url: 'https://huggingface.co/kramp/htdemucs-6s-webgpu-onnx/resolve/0c850a01007f48d94900b21b49a0d0ae1a17239f/htdemucs_6s.onnx',
  sha256: 'a3f5050696cda4b2344d465123acb21ee699dad7d0634dba1d282497a04ac86a',
  size: 284797240,
};
const PART = 20 * 1024 * 1024;

const ort = join(root, 'public/ort'); mkdirSync(ort, { recursive: true });
for (const f of ['ort-wasm-simd-threaded.jsep.mjs', 'ort-wasm-simd-threaded.jsep.wasm']) copyFileSync(join(root, 'node_modules/onnxruntime-web/dist', f), join(ort, f));

const out = join(root, 'public/models/htdemucs6s'), man = join(out, 'manifest.json');
if (process.env.SKIP_MODEL) { console.log('model: skipped (SKIP_MODEL)'); process.exit(0); }
if (existsSync(man) && JSON.parse(readFileSync(man, 'utf8')).sha256 === MODEL.sha256) { console.log('model: up to date'); process.exit(0); }
mkdirSync(out, { recursive: true });
const cache = join(root, 'node_modules/.cache/htdemucs_6s.onnx'); mkdirSync(dirname(cache), { recursive: true });
if (!existsSync(cache) || statSync(cache).size !== MODEL.size) {
  console.log('model: downloading', (MODEL.size / 1e6).toFixed(0), 'MB');
  const res = await fetch(MODEL.url); if (!res.ok) throw new Error('model download failed: ' + res.status);
  writeFileSync(cache, Buffer.from(await res.arrayBuffer()));
}
const data = readFileSync(cache), sha = createHash('sha256').update(data).digest('hex');
if (sha !== MODEL.sha256) throw new Error('model checksum mismatch: ' + sha);
const parts = [];
for (let i = 0, a = 0; a < data.length; i++, a += PART) { const name = `part-${String(i).padStart(2, '0')}.bin`; writeFileSync(join(out, name), data.subarray(a, a + PART)); parts.push(name); }
writeFileSync(man, JSON.stringify({ name: 'htdemucs_6s', sources: ['drums', 'bass', 'other', 'vocals', 'guitar', 'piano'], sr: 44100, segment: 343980, size: data.length, sha256: sha, parts }, null, 1));
console.log('model:', parts.length, 'parts');
