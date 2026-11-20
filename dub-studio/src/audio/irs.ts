// Reverb impulse responses, synthesised here (so they are ours, CC0). Swap in recorded CC0 IRs later: same shape.
// Springs: an impulse through a chain of allpasses (the chirp of a spring) inside a decaying feedback loop.
// Plate and room: decorrelated noise with a decay that darkens over time.

export interface IR { name: string; data: Float32Array[]; len: number; env: number[] }
interface Spec { name: string; make: (sr: number) => Float32Array[] }

function rng(seed: number) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2147483648 - 1; }; }

function spring(sr: number, secs: number, delayMs: number, rt60: number, stages: number, a: number, lpHz: number, seed: number): Float32Array {
  const n = Math.floor(secs * sr), out = new Float32Array(n), D = Math.max(1, Math.round(delayMs / 1000 * sr));
  const line = new Float32Array(D); let w = 0;
  const g = Math.pow(10, -3 * (D / sr) / rt60), xp = new Float32Array(stages), yp = new Float32Array(stages);
  const al = 1 - Math.exp(-2 * Math.PI * lpHz / sr); let lp = 0, hp = 0; const ah = 1 - Math.exp(-2 * Math.PI * 120 / sr);
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    let v = (i === 0 ? 1 : 0) + g * line[w] + (i < sr * 0.02 ? r() * 0.02 : 0);
    for (let k = 0; k < stages; k++) { const y = a * v + xp[k] - a * yp[k]; xp[k] = v; yp[k] = y; v = y; }
    lp += al * (v - lp); hp += ah * (lp - hp); v = lp - hp;
    line[w] = v; w = (w + 1) % D; out[i] = v;
  }
  return out;
}
function noiseVerb(sr: number, secs: number, rt60: number, pre: number, darken: number, seed: number): Float32Array {
  const n = Math.floor(secs * sr), out = new Float32Array(n), r = rng(seed), p = Math.floor(pre * sr);
  let lp = 0;
  for (let i = p; i < n; i++) {
    const t = (i - p) / sr, env = Math.pow(10, -3 * t / rt60), fc = 9000 * Math.exp(-darken * t) + 400;
    lp += (1 - Math.exp(-2 * Math.PI * fc / sr)) * (r() - lp); out[i] = lp * env * (t < 0.004 ? t / 0.004 : 1);
  }
  return out;
}

export const SPECS: Spec[] = [
  { name: 'Short Spring', make: sr => [spring(sr, 2.6, 31, 1.9, 60, 0.62, 4200, 1), spring(sr, 2.6, 33, 1.9, 60, 0.6, 4200, 2)] },
  { name: 'Long Spring', make: sr => [spring(sr, 4.2, 41, 3.4, 90, 0.66, 3600, 3), spring(sr, 4.2, 44, 3.4, 90, 0.64, 3600, 4)] },
  { name: 'Twin Spring', make: sr => [spring(sr, 3.4, 29, 2.6, 70, 0.6, 4000, 5), spring(sr, 3.4, 47, 2.8, 80, 0.65, 3800, 6)] },
  { name: 'Plate', make: sr => [noiseVerb(sr, 4, 2.8, 0.008, 0.9, 7), noiseVerb(sr, 4, 2.8, 0.008, 0.9, 8)] },
  { name: 'Room', make: sr => [noiseVerb(sr, 1.2, 0.7, 0.004, 2.5, 9), noiseVerb(sr, 1.2, 0.7, 0.005, 2.5, 10)] },
];

export function makeIR(i: number, sr: number): IR {
  const s = SPECS[i] || SPECS[0], data = s.make(sr);
  let e = 0; for (const c of data) for (let k = 0; k < c.length; k++) e += c[k] * c[k];
  const g = 0.6 / Math.sqrt(e / data.length || 1); for (const c of data) for (let k = 0; k < c.length; k++) c[k] *= g;   // level-match
  const len = data[0].length / sr, bins = 120, env: number[] = [], per = Math.floor(data[0].length / bins);
  for (let b = 0; b < bins; b++) { let q = 0; for (let k = b * per; k < (b + 1) * per; k++) q += data[0][k] * data[0][k]; env.push(Math.sqrt(q / per)); }
  const mx = Math.max(...env) || 1;
  return { name: s.name, data, len, env: env.map(v => Math.sqrt(v / mx)) };
}

// the IR cut to the Decay: a cosine fade over the last 30%
export function shaped(ir: IR, secs: number): Float32Array[] {
  if (!secs || secs >= ir.len) return ir.data;
  const sr = ir.data[0].length / ir.len, n = Math.floor(secs * sr), f0 = Math.floor(n * 0.7);
  return ir.data.map(c => { const o = c.slice(0, n); for (let k = f0; k < n; k++) o[k] *= 0.5 + 0.5 * Math.cos(Math.PI * (k - f0) / (n - f0)); return o; });
}
