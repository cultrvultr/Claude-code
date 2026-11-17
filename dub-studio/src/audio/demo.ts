// The demo song: "Zion Gate Steppers", an original UK roots / steppers dub in D minor at 70 BPM, made for this app
// (CC0). Six parts, synthesised here one at a time (so a phone never holds the whole song in memory):
// Drums (steppers: kick on every beat, rim and snare on three, 808-style hats, tom fills), Bass (deep, round,
// sustained), Percussion (hand drums and shaker), Guitar (a plucked-string chop on two and four), Organ (drawbar
// bubble with a slow rotary wobble, harmonium pads) and Melodica (reedy lead with breath and late vibrato).

export const DEMO = { id: 'demo-zion', title: 'Zion Gate Steppers (demo)', bpm: 70, bars: 48, names: ['Drums', 'Bass', 'Percussion', 'Guitar', 'Organ', 'Melodica'] };

const TAU = Math.PI * 2;
const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
const NOTE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const n = (s: string) => { const m = /^([A-G])(b|#)?(-?\d)$/.exec(s)!; return 12 * (+m[3] + 1) + NOTE[m[1]] + (m[2] === 'b' ? -1 : m[2] === '#' ? 1 : 0); };
function rng(seed: number) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2147483648 - 1; }; }

// ---------- the song ----------
type Chord = 'Dm' | 'C' | 'Gm' | 'Bb';
const A: Chord[] = ['Dm', 'Dm', 'C', 'Dm'], B: Chord[] = ['Gm', 'Gm', 'Bb', 'C'];
// 48 bars: intro, riddim, melody, dub break, B section, melody again, bass-and-drums dub, outro
const FORM: { bars: number; prog: Chord[]; on: string }[] = [
  { bars: 4, prog: A, on: 'intro' },     // 0-3   percussion, pad, hats and rim; melodica pickup
  { bars: 8, prog: A, on: 'riddim' },    // 4-11  everything but the melodica
  { bars: 8, prog: A, on: 'melody' },    // 12-19 melodica A, A'
  { bars: 4, prog: A, on: 'break' },     // 20-23 kick, rim, bass, percussion: room for the echo
  { bars: 8, prog: B, on: 'bsec' },      // 24-31 the lift: Gm Gm Bb C, melodica B
  { bars: 8, prog: A, on: 'melody2' },   // 32-39 melodica A, A' up high
  { bars: 4, prog: A, on: 'dub' },       // 40-43 bass and drums
  { bars: 4, prog: A, on: 'outro' },     // 44-47 riddim, then the last hit
];
const BARS: { chord: Chord; sec: string; pos: number; i: number }[] = [];
for (const f of FORM) for (let k = 0; k < f.bars; k++) BARS.push({ chord: f.prog[k % 4], sec: f.on, pos: k, i: BARS.length });
const has = (sec: string, part: string) => ({
  drums: ['intro', 'riddim', 'melody', 'break', 'bsec', 'melody2', 'dub', 'outro'],
  kick: ['riddim', 'melody', 'break', 'bsec', 'melody2', 'dub', 'outro'],
  bass: ['riddim', 'melody', 'break', 'bsec', 'melody2', 'dub', 'outro'],
  guitar: ['riddim', 'melody', 'bsec', 'melody2', 'outro'],
  bubble: ['riddim', 'melody', 'bsec', 'melody2', 'outro'],
  pad: ['intro', 'bsec', 'melody2'],
  perc: ['intro', 'riddim', 'melody', 'break', 'bsec', 'melody2', 'outro'],
}[part] || []).includes(sec);
const VOICING: Record<Chord, string[]> = { Dm: ['D4', 'F4', 'A4'], C: ['C4', 'E4', 'G4'], Gm: ['D4', 'G4', 'Bb4'], Bb: ['D4', 'F4', 'Bb4'] };
// bass: [beat, note, beats]; a and b alternate on repeated chords
const BASS: Record<string, [number, string, number][]> = {
  Dm_a: [[0, 'D2', 2.5], [2.5, 'F2', 0.5], [3, 'G2', 1]],
  Dm_b: [[0, 'A2', 1.5], [1.5, 'G2', 0.5], [2, 'F2', 1], [3, 'E2', 0.75], [3.75, 'D2', 0.25]],
  C_a: [[0, 'C2', 2.5], [2.5, 'E2', 0.5], [3, 'G2', 1]],
  Gm_a: [[0, 'G2', 2.5], [2.5, 'Bb2', 0.5], [3, 'A2', 1]],
  Gm_b: [[0, 'G2', 1], [1, 'G2', 0.5], [1.5, 'F2', 0.5], [2, 'D2', 2]],
  Bb_a: [[0, 'Bb1', 2.5], [2.5, 'D2', 0.5], [3, 'F2', 1]],
  C_b: [[0, 'C2', 1.5], [1.5, 'E2', 0.5], [2, 'G2', 1], [3, 'A2', 1]],
};
// melodica phrases, 4 bars each: [beat, note, beats]
const MEL_A: [number, string, number][] = [[0.5, 'A4', 1], [1.5, 'C5', 0.5], [2, 'D5', 1.5], [3.5, 'C5', 0.5], [4, 'A4', 2.5], [6.5, 'G4', 0.5], [7, 'F4', 1],
  [8, 'G4', 1], [9, 'E4', 0.5], [9.5, 'G4', 0.5], [10, 'C5', 2], [12, 'A4', 2.5], [14.5, 'G4', 0.5], [15, 'F4', 0.5], [15.5, 'E4', 0.5]];
const MEL_A2: [number, string, number][] = [[0.5, 'D5', 1], [1.5, 'F5', 0.5], [2, 'E5', 1], [3, 'D5', 1], [4, 'C5', 1.5], [5.5, 'A4', 0.5], [6, 'C5', 2],
  [8, 'E5', 1], [9, 'D5', 1], [10, 'C5', 1], [11, 'G4', 1], [12, 'A4', 3.5]];
const MEL_B: [number, string, number][] = [[0, 'D5', 2], [2, 'Bb4', 1], [3, 'G4', 1], [4, 'A4', 1], [5, 'Bb4', 1], [6, 'D5', 2],
  [8, 'F5', 1.5], [9.5, 'E5', 0.5], [10, 'D5', 1], [11, 'C5', 1], [12, 'E5', 2], [14, 'G5', 1], [15, 'E5', 1]];
const PICKUP: [number, string, number][] = [[14, 'A4', 0.5], [14.5, 'C5', 0.5], [15, 'D5', 1]];

// ---------- small DSP helpers ----------
class Buf {
  d: Float32Array; constructor(public sr: number, sec: number) { this.d = new Float32Array(Math.ceil(sec * sr)); }
  add(at: number, dur: number, fn: (t: number) => number, g = 1) { const i0 = Math.max(0, Math.round(at * this.sr)), n = Math.min(this.d.length - i0, Math.ceil(dur * this.sr)); for (let i = 0; i < n; i++) this.d[i0 + i] += g * fn(i / this.sr); }
}
const env = (t: number, a: number, d: number) => t < a ? t / a : Math.exp(-(t - a) / d);
const ar = (t: number, a: number, len: number, r: number) => t < a ? t / a : t < len ? 1 : Math.max(0, 1 - (t - len) / r);
function onePoleLP(fc: number, sr: number) { const a = 1 - Math.exp(-TAU * fc / sr); let y = 0; return (x: number) => (y += a * (x - y)); }
function onePoleHP(fc: number, sr: number) { const lp = onePoleLP(fc, sr); return (x: number) => x - lp(x); }

// ---------- the parts ----------
function drums(sr: number, len: number, beat: number, bar: number): Float32Array {
  const o = new Buf(sr, len), r = rng(11);
  const kick = (at: number, v: number) => { let ph = 0; o.add(at, 0.7, t => { ph += (46 + 90 * Math.exp(-t / 0.035)) / sr; return (Math.sin(TAU * ph) * env(t, 0.002, 0.32) + (t < 0.004 ? r() * 0.3 : 0)); }, v); };
  const rim = (at: number, v: number) => { const hp = onePoleHP(900, sr); o.add(at, 0.06, t => (Math.sin(TAU * 1720 * t) * 0.5 + Math.sin(TAU * 520 * t) * 0.4 + hp(r()) * 0.6) * env(t, 0.0005, 0.011), v); };
  const snare = (at: number, v: number) => { const hp = onePoleHP(1200, sr), lp = onePoleLP(7000, sr); o.add(at, 0.35, t => Math.sin(TAU * 185 * t) * env(t, 0.001, 0.05) * 0.6 + lp(hp(r())) * env(t, 0.001, 0.13), v); };
  // 808-style metal: six detuned squares, high-passed twice
  const HZ = [263, 400, 421, 474, 587, 845].map(f => f * 1.6);
  const hat = (at: number, v: number, open: boolean) => { const h1 = onePoleHP(6500, sr), h2 = onePoleHP(6500, sr); const ph = HZ.map(() => r() + 1);
    o.add(at, open ? 0.35 : 0.08, t => { let s = 0; for (let k = 0; k < 6; k++) { ph[k] += HZ[k] / sr; s += (ph[k] % 1) < 0.5 ? 1 : -1; } return h2(h1(s / 6)) * env(t, 0.0008, open ? 0.12 : 0.022); }, v); };
  const tom = (at: number, f: number, v: number) => { let ph = 0; o.add(at, 0.5, t => { ph += f * (1 + 0.6 * Math.exp(-t / 0.04)) / sr; return Math.sin(TAU * ph) * env(t, 0.002, 0.18); }, v); };
  for (const b of BARS) {
    if (!has(b.sec, 'drums')) continue;
    const t0 = b.i * bar, lastOf8 = b.pos % 8 === 7 && b.sec !== 'intro', end = b.i === BARS.length - 1;
    if (end) { kick(t0, 0.95); snare(t0, 0.5); continue; }   // the last hit
    for (let q = 0; q < 4; q++) if (has(b.sec, 'kick') && !(lastOf8 && q === 3)) kick(t0 + q * beat, q === 0 ? 0.95 : 0.85);   // steppers: four on the floor
    rim(t0 + 2 * beat, 0.55); if (b.sec !== 'intro' && b.sec !== 'break') snare(t0 + 2 * beat, 0.42);
    if (b.sec !== 'break' && b.sec !== 'dub' || b.pos % 2) for (let s = 0; s < 16; s++) {   // hats on the sixteenths, a lazy swing
      if (lastOf8 && s >= 12) break;
      const at = t0 + s * beat / 4 + (s % 2 ? beat * 0.035 : 0), open = s === 14 && b.pos % 2 === 1;
      hat(at, [0.32, 0.1, 0.2, 0.12][s % 4] * (1 + 0.15 * r()), open);
    }
    if (b.pos % 4 === 3 && !lastOf8) rim(t0 + 3.75 * beat, 0.3);
    if (lastOf8) [0, 0.25, 0.5, 0.75].forEach((x, k) => tom(t0 + (3 + x) * beat, [196, 165, 131, 98][k], 0.6));   // fill into the next eight
  }
  return finish(o.d, 0.9);
}

function bass(sr: number, len: number, beat: number, bar: number): Float32Array {
  const o = new Buf(sr, len);
  for (const b of BARS) {
    if (!has(b.sec, 'bass')) continue;
    if (b.i === BARS.length - 1) { note(b.i * bar, 'D2', beat * 3); continue; }
    const key = b.chord === 'Dm' ? (b.pos % 2 ? 'Dm_b' : 'Dm_a') : b.chord === 'Gm' ? (b.pos % 2 ? 'Gm_b' : 'Gm_a') : b.chord === 'C' ? (b.sec === 'bsec' ? 'C_b' : 'C_a') : 'Bb_a';
    for (const [x, m, d] of BASS[key]) note(b.i * bar + x * beat, m, d * beat * 0.95);
  }
  function note(at: number, m: string, dur: number) {
    const f = mtof(n(m)), lp1 = onePoleLP(420, sr), lp2 = onePoleLP(420, sr); let ph = 0;
    o.add(at, dur + 0.12, t => { ph += f / sr; const x = Math.sin(TAU * ph) + 0.18 * Math.sin(2 * TAU * ph) + 0.06 * Math.sin(3 * TAU * ph);
      return lp2(lp1(Math.tanh(1.6 * x) / Math.tanh(1.6))) * ar(t, 0.012, dur, 0.09); }, 0.62);
  }
  return finish(o.d, 0.62);
}

function percussion(sr: number, len: number, beat: number, bar: number): Float32Array {
  const o = new Buf(sr, len), r = rng(23);
  const drum = (at: number, f: number, v: number, dec: number, slap = 0) => { let ph = 0, ph2 = 0; const hp = onePoleHP(1500, sr);
    o.add(at, dec * 5, t => { ph += f * (1 + 0.25 * Math.exp(-t / 0.02)) / sr; ph2 += f * 1.59 / sr; return (Math.sin(TAU * ph) + 0.35 * Math.sin(TAU * ph2) * Math.exp(-t / (dec * 0.4))) * env(t, 0.0015, dec) + slap * hp(r()) * env(t, 0.0005, 0.012); }, v); };
  const shake = (at: number, v: number) => { const hp = onePoleHP(4000, sr), lp = onePoleLP(9000, sr); o.add(at, 0.12, t => lp(hp(r())) * (t < 0.018 ? t / 0.018 : Math.exp(-(t - 0.018) / 0.03)), v); };
  for (const b of BARS) {
    if (!has(b.sec, 'perc') || b.i === BARS.length - 1) continue;
    const t0 = b.i * bar;
    // the heartbeat: a low drum, da-DUM into two and four
    for (const q of [1, 3]) { drum(t0 + (q - 0.25) * beat, 98, 0.35, 0.09); drum(t0 + q * beat, 98, 0.75, 0.16); }
    // the repeater: a high hand drum, a few notes per bar, different every bar
    for (let s = 0; s < 16; s++) if ((s % 4 === 2 && r() > -0.2) || r() > 0.82) drum(t0 + s * beat / 4, 330 + 40 * (s % 3), 0.18 + 0.12 * (r() + 1) / 2, 0.06, 0.5);
    if (b.sec !== 'intro' || b.pos >= 2) for (let e = 0; e < 8; e++) shake(t0 + e * beat / 2 + (e % 2 ? beat * 0.03 : 0), e % 2 ? 0.22 : 0.14);
  }
  return finish(o.d, 0.5);
}

function guitar(sr: number, len: number, beat: number, bar: number): Float32Array {
  const o = new Buf(sr, len), r = rng(37);
  // a muted chop: plucked strings (Karplus-Strong), damped hard, strummed down in 7 ms
  const chop = (at: number, chord: Chord, v: number) => VOICING[chord].concat(VOICING[chord][0].replace(/\d/, d => String(+d + 1))).forEach((nm, k) => {
    const f = mtof(n(nm)), N = Math.max(2, Math.round(sr / f)), line = new Float32Array(N), lp = onePoleLP(3000, sr); for (let i = 0; i < N; i++) line[i] = lp(r());
    let p = 0; const hp = onePoleHP(160, sr);
    o.add(at + k * 0.007, 0.22, t => { const a = line[p], bq = line[(p + 1) % N]; line[p] = 0.5 * (a + bq) * 0.985; p = (p + 1) % N; return hp(a) * (t < 0.11 ? 1 : Math.max(0, 1 - (t - 0.11) / 0.1)); }, v);
  });
  for (const b of BARS) { if (!has(b.sec, 'guitar') || b.i === BARS.length - 1) continue; chop(b.i * bar + beat, b.chord, 0.32); chop(b.i * bar + 3 * beat, b.chord, 0.32); }
  return finish(o.d, 0.75);
}

function organ(sr: number, len: number, beat: number, bar: number): Float32Array {
  // drawbars 16', 8', 4', 2 2/3', 2' as one wavetable (built on the 16' sub, so every partial is a whole harmonic)
  const o = new Buf(sr, len), TN = 4096, TAB = new Float32Array(TN + 1);
  for (let i = 0; i <= TN; i++) { const x = TAU * i / TN; TAB[i] = 0.45 * Math.sin(x) + Math.sin(2 * x) + 0.55 * Math.sin(4 * x) + 0.3 * Math.sin(6 * x) + 0.15 * Math.sin(8 * x); }
  const tone = (f: number, t: number) => { const p = ((f * 0.5 * t) % 1) * TN, i = p | 0; return TAB[i] + (TAB[i + 1] - TAB[i]) * (p - i); };
  const rot = (t: number, at: number) => 1 + 0.08 * Math.sin(TAU * 0.8 * (t + at));   // slow rotary wobble
  // the bubble: short chords on the off-eighths, low and high in turn
  const stab = (at: number, notes: string[], v: number) => notes.forEach(nm => { const f = mtof(n(nm)); o.add(at, 0.2, t => tone(f, t) * ar(t, 0.004, 0.11, 0.06) * rot(t, at) + (t < 0.003 ? 0.3 * Math.sin(TAU * f * 3 * t) : 0), v); });
  // pads: harmonium-like, a soft attack and the whole bar
  const pad = (at: number, notes: string[], dur: number, v: number) => notes.forEach((nm, k) => { const f = mtof(n(nm)) * (1 + 0.0015 * (k - 1)), lp = onePoleLP(1800, sr);
    o.add(at, dur + 0.5, t => lp(tone(f, t) + 0.3 * (2 * ((f * 2.003 * t) % 1) - 1)) * ar(t, 0.45, dur, 0.5) * rot(t, at), v); });
  for (const b of BARS) {
    if (b.i === BARS.length - 1) continue;
    const t0 = b.i * bar, v = VOICING[b.chord];
    if (has(b.sec, 'bubble')) for (let e = 0; e < 4; e++) stab(t0 + (e + 0.5) * beat, e % 2 ? v : [v[0].replace(/\d/, d => String(+d - 1)), v[1]], 0.085);
    if (has(b.sec, 'pad')) pad(t0, v, bar * 0.98, b.sec === 'intro' ? 0.05 : 0.04);
  }
  return finish(o.d, 0.38);
}

function melodica(sr: number, len: number, beat: number, bar: number): Float32Array {
  const o = new Buf(sr, len), r = rng(53);
  const play = (start: number, phrase: [number, string, number][], up = 0) => { for (const [x, nm, d] of phrase) {
    const f = mtof(n(nm) + up), dur = d * beat * 0.92, lp = onePoleLP(2600, sr), hp = onePoleHP(220, sr), bn = onePoleLP(3000, sr); let ph = 0;
    o.add(start + x * beat, dur + 0.15, t => {
      const scoop = 1 - 0.009 * Math.exp(-t / 0.05), vib = 1 + 0.0045 * Math.sin(TAU * 5.4 * t) * Math.min(1, Math.max(0, (t - 0.28) / 0.35));
      const dt = f * scoop * vib / sr; ph += dt; const p = ph % 1, q = (p + 0.68) % 1;
      // band-limited (polyBLEP) pulse and saw: no aliasing fizz in the highs
      const pulse = (p < 0.32 ? 1 : -1) + blep(p, dt) - blep(q, dt), saw = 2 * p - 1 - blep(p, dt);
      const reed = 0.6 * pulse + 0.4 * saw, breath = bn(r()) * 0.035;
      return hp(lp(reed + breath)) * ar(t, 0.03, dur, 0.12);
    }, 0.42);
  } };
  BARS.forEach(b => {
    const t0 = b.i * bar;
    if (b.sec === 'intro' && b.pos === 0) play(t0, PICKUP);
    if ((b.sec === 'melody' || b.sec === 'melody2') && b.pos % 8 === 0) play(t0, MEL_A, b.sec === 'melody2' ? 12 : 0);
    if ((b.sec === 'melody' || b.sec === 'melody2') && b.pos % 8 === 4) play(t0, MEL_A2, b.sec === 'melody2' ? 12 : 0);
    if (b.sec === 'bsec' && b.pos % 4 === 0) play(t0, MEL_B, b.pos === 4 ? 12 : 0);
  });
  return finish(o.d, 0.4);
}

// the polyBLEP correction for a step at phase 0 (dt: phase step per sample)
function blep(p: number, dt: number) { if (p < dt) { const t = p / dt; return t + t - t * t - 1; } if (p > 1 - dt) { const t = (p - 1) / dt; return t * t + t + t + 1; } return 0; }

// soft-clip and level each part: its peak is set by hand (drums and bass up front, organ and melodica behind)
function finish(d: Float32Array, peak: number): Float32Array {
  let m = 0; for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > m) m = a; }
  const g = m ? peak / m : 1; for (let i = 0; i < d.length; i++) d[i] = Math.tanh(1.2 * d[i] * g) / Math.tanh(1.2);
  return d;
}

export function renderDemoStem(i: number, sr: number): Float32Array {
  const beat = 60 / DEMO.bpm, bar = 4 * beat, len = DEMO.bars * bar + 2.5;
  return [drums, bass, percussion, guitar, organ, melodica][i](sr, len, beat, bar);
}
