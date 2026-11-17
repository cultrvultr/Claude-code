// The demo song: a one-drop riddim in A minor, synthesised in the browser so there is something to dub on first launch.
// Four mono stems: Drums, Bass, Riddim (skank), Horns (melodica). Ours, CC0.

export const DEMO = { title: 'Pocket Riddim (demo)', bpm: 74, bars: 32 };

type Buf = Float32Array<ArrayBuffer>;
const TAU = Math.PI * 2;
function rng(seed: number) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2147483648 - 1; }; }
const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

function note(b: Buf, sr: number, at: number, dur: number, fn: (t: number, i: number) => number) {
  const i0 = Math.floor(at * sr), n = Math.min(b.length - i0, Math.floor(dur * sr));
  for (let i = 0; i < n; i++) b[i0 + i] += fn(i / sr, i);
}

export function renderDemo(sr: number): { names: string[]; data: Buf[]; bpm: number; title: string } {
  const beat = 60 / DEMO.bpm, bar = beat * 4, len = Math.ceil((DEMO.bars * bar + 2) * sr);
  const [drums, bass, skank, horns] = [0, 1, 2, 3].map(() => new Float32Array(len));
  const r = rng(42);
  const chords = [57, 57, 62, 64];   // A, A, D, E roots (bars of a 4-bar cycle)
  const minor = [0, 3, 7];

  for (let bi = 0; bi < DEMO.bars; bi++) {
    const t0 = bi * bar, root = chords[bi % 4], fill = bi % 8 === 7;
    // ---- drums: hats on the eighths (lazy offbeats), kick and rim together on 3 ----
    for (let e = 0; e < 8; e++) {
      const at = t0 + e * beat / 2 + (e % 2 ? beat * 0.06 : 0), open = e === 7 && bi % 2 === 1, a = e % 2 ? 0.16 : 0.1;
      let hp = 0; note(drums, sr, at, open ? 0.25 : 0.05, t => { const x = r(); hp += 0.5 * (x - hp); return (x - hp) * a * Math.exp(-t / (open ? 0.09 : 0.014)); });
    }
    if (bi >= 2) note(drums, sr, t0 + 2 * beat, 0.6, t => Math.sin(TAU * (48 * t + 70 * 0.045 * (1 - Math.exp(-t / 0.045)))) * Math.exp(-t / 0.3) * 0.7);
    const rim = (at: number, v: number) => note(drums, sr, at, 0.08, t => (Math.sin(TAU * 1750 * t) * 0.6 + r() * 0.5) * Math.exp(-t / 0.012) * v);
    rim(t0 + 2 * beat, 0.55);
    if (fill) { rim(t0 + 3 * beat, 0.4); rim(t0 + 3.5 * beat, 0.45); rim(t0 + 3.75 * beat, 0.35); }

    // ---- bass: in from bar 2, rests on the one ----
    if (bi >= 2) {
      const line: [number, number, number][] = [[0.5, 0, 0.45], [1, 0, 0.4], [1.5, 3, 0.4], [2.5, 7, 0.45], [3, 5, 0.3], [3.5, 3, 0.4]];
      for (const [b0, iv, d] of line) {
        const f = mtof(root - 24 + iv), dur = d * beat; let lp = 0;
        note(bass, sr, t0 + b0 * beat, dur + 0.08, t => {
          const env = Math.min(1, t / 0.006) * (t < dur ? 1 : Math.max(0, 1 - (t - dur) / 0.08));
          const x = Math.sin(TAU * f * t) + 0.3 * Math.sin(TAU * 2 * f * t) + 0.08 * Math.sin(TAU * 3 * f * t);
          lp += 0.2 * (x - lp); return lp * env * 0.55; });
      }
    }

    // ---- riddim: the skank on 2 and 4, a bubble of organ on the off-eighths ----
    for (const b0 of [1, 3]) {
      const fs = minor.map(iv => mtof(root - 12 + iv + (iv === 0 ? 12 : 0))); let lp = 0;
      note(skank, sr, t0 + b0 * beat, 0.2, t => {
        let x = 0; for (const f of fs) for (const dt of [0.997, 1.003]) x += 2 * ((f * dt * t) % 1) - 1;
        lp += 0.35 * (x - lp); return lp * Math.exp(-t / 0.05) * 0.12; });
    }
    if (bi >= 4) for (const b0 of [0.5, 1.5, 2.5, 3.5]) {
      const f = mtof(root - 12 + (b0 > 2 ? 7 : 3));
      note(skank, sr, t0 + b0 * beat, 0.16, t => (Math.sin(TAU * f * t) + 0.5 * Math.sin(TAU * 2 * f * t) + 0.25 * Math.sin(TAU * 4 * f * t)) * Math.exp(-t / 0.06) * 0.06);
    }
  }

  // ---- horns: a melodica line, bars 8-15 and 20-31 ----
  const phrase: [number, number, number][] = [   // [beat in 4 bars, midi, beats]
    [0, 69, 1.5], [1.5, 72, 0.5], [2, 76, 1], [3, 74, 1], [4, 72, 2], [6, 69, 1.5], [7.5, 67, 0.5],
    [8, 69, 1], [9, 72, 1], [10, 74, 1.5], [11.5, 76, 0.5], [12, 74, 3], [15, 72, 1]];
  for (const start of [8, 12, 20, 24, 28]) for (const [b0, m, d] of phrase) {
    const f = mtof(m + (start === 24 ? 12 : 0)), dur = d * beat * 0.92; let lp = 0, ph = 0;
    note(horns, sr, start * bar + b0 * beat, dur + 0.1, t => {
      ph += f * (1 + 0.006 * Math.sin(TAU * 5 * t) * Math.min(1, t / 0.3)) / sr; ph %= 1;
      const env = Math.min(1, t / 0.03) * (t < dur ? 1 : Math.max(0, 1 - (t - dur) / 0.1));
      lp += 0.12 * ((ph < 0.42 ? 1 : -1) - lp); return lp * env * 0.22; });
  }
  return { names: ['Drums', 'Bass', 'Riddim', 'Horns'], data: [drums, bass, skank, horns], bpm: DEMO.bpm, title: DEMO.title };
}
