// The audio graph. Per channel:
//   source -> in -> [clean | soft clip] -> HP1 -> HP2 -> LP1 -> LP2 -> fader -> mute -> master
//                                                                              |-> meter
//                                                                              |-> verb send  -> verb in
//                                                                              |-> echo send  -> echo bus
//                                                                              '-> throw (held) -> echo bus
// echo bus -> rig worklet: out 0 instruments dry -> master; out 1 echo -> Return -> master, and -> Echo to verb -> verb in
// verb in -> convolver -> low cut -> high cut -> Return -> master.   master -> limiter -> out (+ recorder tap)

import workletUrl from './rig.worklet.ts?worker&url';
import { DEFAULT_RIG, type RigParams } from './rig-params';
import { S, DIVS, HPF, LPF, VLC, VHC } from '../state';
import { makeIR, shaped, type IR } from './irs';
import { readPieceFloat, SEG, type StemMeta } from '../loader/store';

export interface Stem { name: string; meta: StemMeta | null; status?: string }
export interface Song { id: string; title: string; bpm: number; bpmAuto: boolean; sr: number; gain: number; cues: number[]; stems: Stem[]; count: number }
export const N = 8;   // channels on the desk; the strips show song.count of them
export const DEFAULT_NAMES = ['Drums', 'Bass', 'Other', 'Vocals', 'Guitar', 'Keys', 'Horns', 'FX'];

const FMIN = 70, FMAX = 2500;
export const xToHz = (x: number) => FMIN * Math.pow(FMAX / FMIN, x);
const qdb = (q: number) => 20 * Math.log10(q);   // Web Audio's LP/HP Q is in dB
const T9 = { lp: 0.713, hp: 1 / 0.713, q: 2.55, far: 16.8 };   // stepped-filter voicing: resonant pair + far pole

interface Ch { inp: GainNode; hp1: BiquadFilterNode; hp2: BiquadFilterNode; lp1: BiquadFilterNode; lp2: BiquadFilterNode;
  clean: GainNode; crunch: GainNode; pan: StereoPannerNode; fader: GainNode; mute: GainNode; solo: GainNode; echo: GainNode; throwG: GainNode; verb: GainNode; meter: AnalyserNode }

export const song: Song = { id: '', title: '', bpm: 75, bpmAuto: true, sr: 48000, gain: 1, cues: [], count: 4, stems: DEFAULT_NAMES.map(name => ({ name, meta: null })) };
export let ctx: AudioContext | null = null;
let master: GainNode, limiter: DynamicsCompressorNode, masterMeter: AnalyserNode;
let echoBus: GainNode, echoRet: GainNode, echoVerb: GainNode, verbIn: GainNode, conv: ConvolverNode, vLc: BiquadFilterNode, vHc: BiquadFilterNode, vRet: GainNode;
let rig: AudioWorkletNode | null = null;
const ch: Ch[] = [];
export let stereoOK = true;
const rp: RigParams = structuredClone(DEFAULT_RIG);

const ramp = (p: AudioParam, v: number, t = 0.015) => { if (!ctx) return; const n = ctx.currentTime; p.cancelScheduledValues(n); p.setValueAtTime(p.value, n); p.linearRampToValueAtTime(v, n + t); };

function crunchCurve() { const n = 2048, c = new Float32Array(n), k = 1.4, b = 0.12, t = Math.tanh(b), g = k * (1 - t * t);
  for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = (Math.tanh(k * x * 1.6 + b) - t) / g; } return c; }

// a quick test of how fast this phone runs JS DSP: slow ones keep one tape (mono) and a longer buffer
function speedTest(): boolean {
  const t0 = performance.now(); let s = 0, x = 0.1;
  for (let i = 0; i < 400000; i++) { x = x * 0.999 + 0.001 * Math.sin(i * 0.01); s += x * (27 + x * x) / (27 + 9 * x * x); }
  return performance.now() - t0 + (s > 1e12 ? 1 : 0) < 25;
}

let building: Promise<void> | null = null;
export function ensure(): Promise<void> {
  if (!building) { building = build(); building.catch(e => console.error('audio', e)); }
  if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {});
  return building;
}
function audioSession() { try { const n = navigator as Navigator & { audioSession?: { type: string } }; if (n.audioSession) n.audioSession.type = 'playback'; } catch { /* old iOS */ } }   // plays with the silent switch on
export function wake() { if (ctx && ctx.state !== 'running') { audioSession(); ctx.resume().catch(() => {}); } }

async function build() {
  audioSession();
  stereoOK = speedTest();
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  ctx = new AC({ latencyHint: stereoOK ? 'interactive' : 'playback' }); ctx.resume().catch(() => {});   // inside the tap, before any await (iPhone)
  const c = ctx;
  master = c.createGain(); master.gain.value = 0.75;
  limiter = c.createDynamicsCompressor(); limiter.threshold.value = -3; limiter.knee.value = 0; limiter.ratio.value = 20; limiter.attack.value = 0.002; limiter.release.value = 0.15;
  masterMeter = c.createAnalyser(); masterMeter.fftSize = 512;
  master.connect(limiter); limiter.connect(c.destination); limiter.connect(masterMeter);
  verbIn = c.createGain(); conv = c.createConvolver(); conv.normalize = false; vLc = c.createBiquadFilter(); vHc = c.createBiquadFilter(); vRet = c.createGain();
  vLc.type = 'highpass'; vHc.type = 'lowpass'; vLc.Q.value = vHc.Q.value = qdb(0.707);
  verbIn.connect(conv); conv.connect(vLc); vLc.connect(vHc); vHc.connect(vRet); vRet.connect(master);
  echoBus = c.createGain(); echoBus.channelCount = 2; echoBus.channelCountMode = 'explicit';
  echoRet = c.createGain(); echoRet.connect(master);
  echoVerb = c.createGain(); echoVerb.connect(verbIn);
  const curve = crunchCurve();
  for (let i = 0; i < N; i++) {
    const g = () => c.createGain(), bq = (type: BiquadFilterType, f: number, q: number) => { const b = c.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = qdb(q); return b; };
    const inp = g(), clean = g(), crunch = g(), shIn = g(), sum = g(), fader = g(), mute = g(), solo = g(), echo = g(), throwG = g(), verb = g();
    const sh = c.createWaveShaper(); sh.curve = curve; sh.oversample = '2x'; shIn.gain.value = 1 / 1.6; crunch.gain.value = 0; echo.gain.value = 0; throwG.gain.value = 0; verb.gain.value = 0;
    const hp1 = bq('highpass', 10, 0.707), hp2 = bq('highpass', 10, 0.5), lp1 = bq('lowpass', 22000, 0.707), lp2 = bq('lowpass', 22000, 0.5);
    const meter = c.createAnalyser(); meter.fftSize = 512;
    const pan = c.createStereoPanner();   // before the fader, so the echo and verb sends keep each part's place
    inp.connect(clean); clean.connect(sum); inp.connect(shIn); shIn.connect(sh); sh.connect(crunch); crunch.connect(sum);
    sum.connect(hp1); hp1.connect(hp2); hp2.connect(lp1); lp1.connect(lp2); lp2.connect(pan); pan.connect(fader); fader.connect(mute); mute.connect(solo);
    solo.connect(master); solo.connect(meter); solo.connect(verb); verb.connect(verbIn); solo.connect(echo); echo.connect(echoBus); solo.connect(throwG); throwG.connect(echoBus);
    ch.push({ inp, hp1, hp2, lp1, lp2, clean, crunch, pan, fader, mute, solo, echo, throwG, verb, meter });
  }
  for (let i = 0; i < N; i++) for (const p of ['cut', 'fader', 'mute', 'echo', 'verb', 'pan'] as const) applyChan(i, p);
  applySolo();
  try {
    await c.audioWorklet.addModule(workletUrl);
    rig = new AudioWorkletNode(c, 'dub-rig', { numberOfInputs: 1, numberOfOutputs: 2, outputChannelCount: [2, 2], channelCount: 2, channelCountMode: 'explicit' });
    rig.onprocessorerror = e => console.error('rig processor error', e);
    echoBus.connect(rig); rig.connect(master, 0); rig.connect(echoRet, 1); rig.connect(echoVerb, 1);
  } catch (e) { console.error('worklet failed', e); }
  applyEcho(); applyVerb(); await loadVerb();
}

// ---------- channels ----------
export function applyChan(i: number, p: 'cut' | 'fader' | 'mute' | 'echo' | 'verb' | 'pan') {
  if (!ctx) return; const s = ch[i], q = S.ch[i];
  if (p === 'fader') ramp(s.fader.gain, q.fader * q.fader);
  if (p === 'pan') ramp(s.pan.pan, Math.max(-1, Math.min(1, q.pan || 0)), 0.03);
  if (p === 'mute') ramp(s.mute.gain, q.mute ? 0 : 1, 0.008);
  if (p === 'verb') ramp(s.verb.gain, q.verb * q.verb * 1.5);
  if (p === 'echo') ramp(s.echo.gain, Math.pow(q.echo, 1.5));
  if (p === 'cut') {
    const st = q.cut, f = st > 0 ? HPF[st - 1] : 14, l = st < 0 ? LPF[-st - 1] : 20000;
    ramp(s.hp1.frequency, st > 0 ? f * T9.hp : 10, 0.02); ramp(s.hp2.frequency, st > 0 ? Math.max(10, f / T9.far) : 10, 0.02);
    ramp(s.lp1.frequency, st < 0 ? l * T9.lp : 22000, 0.02); ramp(s.lp2.frequency, st < 0 ? Math.min(22000, l * T9.far) : 22000, 0.02);
    ramp(s.hp1.Q, qdb(st > 0 ? T9.q : 0.707), 0.02); ramp(s.lp1.Q, qdb(st < 0 ? T9.q : 0.707), 0.02);
    ramp(s.clean.gain, st ? 0 : 1, 0.02); ramp(s.crunch.gain, st ? 1 : 0, 0.02);
  }
}
export const panOf = (i: number) => ch[i] ? ch[i].pan.pan.value : 0;   // for the tests
export function setThrow(i: number, on: boolean) { if (ctx) ramp(ch[i].throwG.gain, on ? 1 : 0, on ? 0.006 : 0.03); }
// solo: when any channel is soloed, the others are silenced (sends too, since the gate sits before them)
export function applySolo() { if (!ctx) return; const any = S.ch.some(c => c.solo); S.ch.forEach((c, i) => ramp(ch[i].solo.gain, any && !c.solo ? 0 : 1, 0.008)); }

// ---------- echo and instruments ----------
export const dlyMs = () => S.m.sync ? 60000 / song.bpm * DIVS[S.m.div][1] : 60 + 540 * S.m.dly;
export const widthNow = () => stereoOK ? S.m.width : 0;
export function applyEcho() {
  const m = S.m;
  Object.assign(rp, { rep: m.rep, delayMs: dlyMs(), width: widthNow(), bass: m.bass, treb: m.treb, mix: m.mix,
    syn: { hz: xToHz(m.syn.x), dec: m.syn.dec, wob: rp.syn.wob, level: m.syn.level },
    sir: { ...rp.sir, base: m.sir.base, mode: m.sir.mode, beat: m.sir.beat, vol: m.sir.vol } });
  post();
  if (ctx) { ramp(echoRet.gain, m.ret, 0.03); ramp(echoVerb.gain, m.e2v, 0.03); }
}
const post = () => { if (rig) rig.port.postMessage({ p: rp }); };
export function hit(v: number) { if (rig) rig.port.postMessage({ hit: v }); }
export function siren(on: boolean) { rp.sir.trig = on; post(); }
export const sirenOn = () => rp.sir.trig;
export function sirenHold(k: 'sirSig' | 'sirSwoop', on: boolean) { rp[k] = on; post(); }
export function wobble(w: number) { rp.syn.wob = w; post(); }

// ---------- verb ----------
const irs = new Map<number, IR>();
export const irOf = (i: number) => irs.get(i);
export function applyVerb() { if (!ctx) return; const m = S.m; ramp(vLc.frequency, VLC[m.vLc] || 10, 0.03); ramp(vHc.frequency, VHC[m.vHc] || 22000, 0.03); ramp(vRet.gain, m.vRet, 0.03); }
export async function loadVerb() {
  if (!ctx) return; const i = S.m.vIr;
  if (!irs.has(i)) { await new Promise(r => setTimeout(r, 0)); irs.set(i, makeIR(i, ctx.sampleRate)); }
  setVerbIR();
}
export function setVerbIR() {
  if (!ctx) return; const ir = irs.get(S.m.vIr); if (!ir) return;
  const d = shaped(ir, S.m.vDec), b = ctx.createBuffer(2, d[0].length, ctx.sampleRate);
  d.forEach((x, c) => b.copyToChannel(new Float32Array(x), c)); conv.buffer = b;
}

// ---------- meters ----------
const tmp = new Float32Array(512);
function peak(a: AnalyserNode) { a.getFloatTimeDomainData(tmp); let p = 0; for (let i = 0; i < tmp.length; i++) { const v = Math.abs(tmp[i]); if (v > p) p = v; } return p; }
export function meters(): { ch: number[]; master: number } | null { if (!ctx || !ch.length) return null; return { ch: ch.map(c => peak(c.meter)), master: peak(masterMeter) }; }

// ---------- transport: the piece player ----------
// Each stem is stored as 10 s pieces. Pieces are read and turned into AudioBuffers just ahead of the playhead and
// scheduled back to back, sample-exact (they are cut from one timeline, so no crossfade is needed). Only the pieces
// around the playhead (and the loop) stay in memory. A breakpoint list maps context time to song time, through loops and seeks.
const LOOK = 1.5;
export const loop = { on: false, a: 0, b: 0 };
export let playing = false;
let pos0 = 0, schedSong = 0, schedCtx = 0, timer = 0, gen = 0;
let bps: { ctx: number; song: number }[] = [];
let sess: GainNode[] = [], srcs: AudioBufferSourceNode[] = [];
const cache = new Map<string, AudioBuffer>(), pend = new Set<string>();
const off = (i: number) => (song.stems[i].meta?.offset || 0) / 1000;
const live = () => song.stems.map((s, i) => i < song.count && s.meta ? i : -1).filter(i => i >= 0);
export const dur = () => Math.max(0, ...live().map(i => song.stems[i].meta!.dur + off(i)));
const loopOn = () => loop.on && loop.b > loop.a;
const key = (i: number, k: number) => `${song.id}/${i}/${k}`;

function want(i: number, k: number) {
  const id = key(i, k), sid = song.id; if (cache.has(id) || pend.has(id) || !ctx) return;
  pend.add(id);
  const ch = song.stems[i].meta?.ch || 1;
  const m = song.stems[i].meta; readPieceFloat(sid, m && m.dir !== undefined ? m.dir : i, k, ch).then(chans => {   // read and converted in a worker; here only a fast copy
    pend.delete(id); if (!chans || !ctx || sid !== song.id) return;
    const b = ctx.createBuffer(ch, chans[0].length, song.sr); chans.forEach((d, c) => b.copyToChannel(d as Float32Array<ArrayBuffer>, c));
    cache.set(id, b);
  }, () => pend.delete(id));
}
// the pieces of stem i that cover song time [a, b)
function piecesFor(i: number, a: number, b: number): number[] {
  const m = song.stems[i].meta!, o = off(i), ta = Math.max(0, a - o), tb = Math.min(m.dur, b - o), out: number[] = [];
  if (tb <= ta) return out;
  for (let k = Math.floor(ta / SEG); k * SEG < tb && k < m.n; k++) out.push(k);
  return out;
}
function pump(g: number) {
  if (!ctx || g !== gen || !playing) return;
  const d = dur(), t = ctx.currentTime;
  if (schedCtx < t + 0.01) { schedCtx = t + 0.06; bps.push({ ctx: schedCtx, song: schedSong }); }   // a piece was late: carry on from here
  while (schedCtx < t + LOOK) {
    if (schedSong >= d - 1e-6 && !(loopOn() && schedSong < loop.b)) break;   // the end: nothing more to line up
    let end = Math.min(d, (Math.floor(schedSong / SEG + 1e-9) + 1) * SEG);
    if (loopOn() && schedSong < loop.b) end = Math.min(end, loop.b);
    if (end - schedSong < 1e-6) { schedSong = end; continue; }
    const lv = live(); let ready = true;
    for (const i of lv) for (const k of piecesFor(i, schedSong, end)) if (!cache.has(key(i, k))) { want(i, k); ready = false; }
    if (!ready) break;   // wait for the pieces; the next pump lines them up
    for (const i of lv) {
      const o = off(i);
      for (const k of piecesFor(i, schedSong, end)) {
        const buf = cache.get(key(i, k))!, ps = k * SEG, p0 = Math.max(ps, schedSong - o), p1 = Math.min(ps + buf.duration, end - o);
        if (p1 - p0 < 1e-6) continue;
        const s = ctx.createBufferSource(); s.buffer = buf; s.connect(sess[i]);
        s.start(schedCtx + (p0 + o - schedSong), p0 - ps, p1 - p0);
        srcs.push(s); s.onended = () => { const j = srcs.indexOf(s); if (j >= 0) srcs.splice(j, 1); };
      }
    }
    schedCtx += end - schedSong; schedSong = end;
    if (loopOn() && Math.abs(schedSong - loop.b) < 1e-6) { schedSong = loop.a; bps.push({ ctx: schedCtx, song: loop.a }); }
  }
  // read ahead two pieces; forget pieces away from the playhead and the loop
  const lv = live(), nowS = now(); for (const i of lv) for (const k of piecesFor(i, schedSong, schedSong + 2 * SEG)) want(i, k);
  if (loopOn()) for (const i of lv) for (const k of piecesFor(i, loop.a, Math.min(loop.a + SEG, loop.b))) want(i, k);
  for (const id of [...cache.keys()]) {
    const [sid, si, sk] = id.split('/'), k = +sk, i = +si; if (sid !== song.id) { cache.delete(id); continue; }
    const st = (k * SEG + off(i)), en = st + SEG, keep = (en > nowS - 2 && st < schedSong + 2.5 * SEG) || (loopOn() && en > loop.a && st < loop.b);
    if (!keep) cache.delete(id);
  }
  if (bps.length > 64) bps = bps.slice(-32);
}
export function now(): number {
  if (!playing || !ctx || !bps.length) return pos0;
  const t = ctx.currentTime; let bp = bps[0]; for (const b of bps) { if (b.ctx <= t) bp = b; else break; }
  return Math.min(dur(), bp.song + Math.max(0, t - bp.ctx));
}
export function play(at = pos0) {
  if (!ctx || !dur()) return; stopSources();
  const d = dur(); if (at >= d - 0.05) at = 0;
  const g = ++gen; pos0 = at; schedSong = at; schedCtx = ctx.currentTime + 0.08; bps = [{ ctx: schedCtx, song: at }];
  sess = ch.map(c => { const s = ctx!.createGain(); s.gain.setValueAtTime(0, schedCtx); s.gain.linearRampToValueAtTime(song.gain, schedCtx + 0.012); s.connect(c.inp); return s; });
  playing = true; pump(g); clearInterval(timer); timer = window.setInterval(() => pump(g), 100);
}
function stopSources() {
  if (!ctx) return; const n = ctx.currentTime; gen++; clearInterval(timer);
  for (const s of sess) { s.gain.cancelScheduledValues(n); s.gain.setValueAtTime(s.gain.value, n); s.gain.linearRampToValueAtTime(0, n + 0.012); }
  for (const s of srcs) { try { s.stop(n + 0.02); } catch { /* not started */ } }
  const old = sess; setTimeout(() => old.forEach(x => x.disconnect()), 100);
  srcs = []; sess = [];
}
export function stop() { pos0 = now(); stopSources(); playing = false; }
export function seek(t: number) { const d = dur(); t = Math.max(0, Math.min(d, t)); if (playing) play(t); else pos0 = t; }
// loop switched: the scheduler follows on its own, unless what is already lined up (up to 1.5 s ahead) disagrees
export function relooped() {
  if (!playing || !ctx) return; const t = ctx.currentTime;
  const wrapAhead = bps.some(b => b.ctx > t && Math.abs(b.song - loop.a) < 1e-6);   // a jump back to the loop start, no longer wanted
  if ((loopOn() && schedSong > loop.b + 1e-6) || (!loopOn() && wrapAhead)) play(now());
}
export const ended = () => playing && !loopOn() && now() >= dur() - 0.02;
export function rewind() { pos0 = 0; }
export function songChanged() { cache.clear(); pend.clear(); }
export function setSongGain(g: number) { song.gain = g; if (ctx) for (const s of sess) ramp(s.gain, g, 0.05); }

// ---------- record the master ----------
let recDest: MediaStreamAudioDestinationNode | null = null, rec: MediaRecorder | null = null, chunks: Blob[] = [];
export const recording = () => !!rec && rec.state === 'recording';
export function recStart() {
  if (!ctx || typeof MediaRecorder === 'undefined') return false;
  if (!recDest) { recDest = ctx.createMediaStreamDestination(); limiter.connect(recDest); }
  const type = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find(t => MediaRecorder.isTypeSupported(t)) || '';
  rec = new MediaRecorder(recDest.stream, type ? { mimeType: type, audioBitsPerSecond: 256000 } : undefined);
  chunks = []; rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); }; rec.start(1000); return true;
}
export function recStop(): Promise<Blob | null> {
  return new Promise(res => { if (!rec) return res(null); const r = rec; r.onstop = () => { res(new Blob(chunks, { type: r.mimeType || 'audio/mp4' })); rec = null; }; r.stop(); });
}

// ---------- loading ----------
export async function decodeFile(f: Blob): Promise<AudioBuffer> {
  await ensure(); const ab = await f.arrayBuffer();
  return await new Promise((ok, no) => ctx!.decodeAudioData(ab, ok, no));
}
export const latency = () => ctx ? (ctx.baseLatency || 0) + ((ctx as AudioContext & { outputLatency?: number }).outputLatency || 0) : 0;
