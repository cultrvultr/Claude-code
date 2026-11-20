// The rig: tape echo + siren + drum synth, one AudioWorklet so the pads answer in one render quantum.
// Input 0: the stems' echo sends (stereo). Output 0: the instruments, dry (stereo). Output 1: the echo, wet only (stereo).
// Our own DSP, written for this project.

declare const sampleRate: number;
declare function registerProcessor(name: string, ctor: unknown): void;
declare class AudioWorkletProcessor { readonly port: MessagePort; }

import { DEFAULT_RIG, type RigParams } from './rig-params';

const TAU = Math.PI * 2;
const onePole = (fc: number) => 1 - Math.exp(-TAU * fc / sampleRate);
// soft clip: tanh-like, cheap, unity for small signals
const sat = (x: number) => { if (x > 3) x = 3; else if (x < -3) x = -3; return x * (27 + x * x) / (27 + 9 * x * x); };

class Tape {
  private buf: Float32Array; private mask: number; private w = 0;
  private d = 0; target = 0;
  private wow = Math.random(); private flut = Math.random();
  private lp = 0; private hp = 0; private lo = 0; private hi = 0;
  private aLp = onePole(4800); private aHp = onePole(70); private aLo = onePole(280); private aHi = onePole(2800);
  private glide = 1 - Math.exp(-1 / (0.09 * sampleRate));   // tape-speed glide: a time change bends the pitch, like the real thing
  gb = 1; gt = 1;
  constructor() { let n = 1; while (n < sampleRate * 4.5) n <<= 1; this.buf = new Float32Array(n); this.mask = n - 1; }
  read(): number {
    if (this.d === 0) this.d = this.target;
    this.d += (this.target - this.d) * this.glide;
    this.wow += 0.55 / sampleRate; if (this.wow > 1) this.wow -= 1;
    this.flut += 6.3 / sampleRate; if (this.flut > 1) this.flut -= 1;
    const dd = this.d * (1 + 0.0014 * Math.sin(TAU * this.wow) + 0.00035 * Math.sin(TAU * this.flut));
    const rp = this.w - dd, i = Math.floor(rp), f = rp - i, m = this.mask;
    const a = this.buf[(i - 1) & m], b = this.buf[i & m], c = this.buf[(i + 1) & m], e = this.buf[(i + 2) & m];
    // 4-point cubic (Catmull-Rom)
    let y = b + 0.5 * f * (c - a + f * (2 * a - 5 * b + 4 * c - e + f * (3 * (b - c) + e - a)));
    this.lp += this.aLp * (y - this.lp); y = this.lp;          // tape bandwidth
    this.hp += this.aHp * (y - this.hp); y -= this.hp;
    this.lo += this.aLo * (y - this.lo); this.hi += this.aHi * (y - this.hi);
    return y + this.lo * (this.gb - 1) + (y - this.hi) * (this.gt - 1);   // echo bass / treble, inside the loop
  }
  write(x: number) { this.buf[this.w & this.mask] = sat(x * 1.1) / 1.1; this.w = (this.w + 1) & this.mask; }
}

class Siren {
  private ph = 0; private lph = 0; private amp = 0; private swoop = 0; private sig = 0;
  step(p: RigParams): number {
    const s = p.sir, rate = [0, 1.3, 3.6, 7.5][s.beat] || 0;
    this.lph += rate / sampleRate; if (this.lph >= 1) this.lph -= 1;
    const l = this.lph, f0 = [300, 520, 860][s.base] || 520;
    let mul = 1, gate = 1;
    if (rate > 0) {
      if (s.mode === 0) mul = Math.pow(2, 1.1 * l);                                  // sweep up
      else if (s.mode === 1) gate = l < 0.5 ? 1 : 0.08;                               // pulse
      else if (s.mode === 2) mul = l < 0.5 ? 1 : 1.335;                               // two-tone
      else mul = Math.pow(2, 1.3 * (l < 0.5 ? 2 * l : 2 - 2 * l));                    // up and down
    }
    this.swoop += ((p.sirSwoop ? 1 : 0) - this.swoop) * (p.sirSwoop ? 2.2 : 0.9) / sampleRate * 2;
    this.sig += ((p.sirSig ? 1 : 0) - this.sig) * 0.004;
    mul *= Math.pow(2, 1.6 * this.swoop) * (1 + this.sig);
    this.ph += f0 * mul / sampleRate; if (this.ph >= 1) this.ph -= 1;
    const on = s.trig || p.sirSig || p.sirSwoop || this.swoop > 0.03 ? 1 : 0;
    this.amp += (on - this.amp) * (on ? 0.012 : 0.0012);
    return Math.tanh(3 * Math.sin(TAU * this.ph)) * this.amp * gate * s.vol * 0.32;
  }
}

class Drum {
  private t = 1e9; private vel = 0; private ph = 0;
  hit(v: number) { this.t = 0; this.vel = v; }
  step(p: RigParams): number {
    if (this.t > 8 * sampleRate) return 0;
    const ts = this.t++ / sampleRate, y = p.syn;
    const env = Math.exp(-ts / Math.max(0.01, y.dec)), pe = Math.exp(-ts / Math.max(0.006, y.dec * 0.55));
    let f = y.hz * Math.pow(2, (1.4 + this.vel) * pe - 0.7 * (1 - pe));                // the dive
    if (y.wob > 0) f *= 1 + 0.35 * y.wob * Math.sin(TAU * (2 + 10 * y.wob) * ts);
    this.ph += f / sampleRate; if (this.ph >= 1) this.ph -= 1;
    const tri = 1 - 4 * Math.abs(this.ph - 0.5), sq = this.ph < 0.5 ? 1 : -1;
    const click = ts < 0.004 ? (Math.random() * 2 - 1) * (1 - ts / 0.004) * 0.4 : 0;
    return (0.75 * tri + 0.25 * sq + click) * env * this.vel * y.level * 0.55;
  }
}

class Rig extends AudioWorkletProcessor {
  private p: RigParams = JSON.parse(JSON.stringify(DEFAULT_RIG));   // no structuredClone in the worklet scope
  private tL = new Tape(); private tR = new Tape(); private yL = 0; private yR = 0;
  private siren = new Siren(); private drum = new Drum(); private fb = 0;
  constructor() {
    super();
    this.port.onmessage = (e: MessageEvent) => {
      const d = e.data;
      if (d.hit) this.drum.hit(d.hit);
      if (d.p) { const s = d.p as Partial<RigParams>; Object.assign(this.p, s, { sir: { ...this.p.sir, ...(s.sir || {}) }, syn: { ...this.p.syn, ...(s.syn || {}) } }); this.update(); }
    };
    this.update();
  }
  private update() {
    const p = this.p, ds = Math.min(4.2, p.delayMs / 1000) * sampleRate;
    this.tL.target = ds; this.tR.target = ds;
    const r = p.rep; this.fb = r <= 9 ? 0.97 * Math.pow(r / 9, 0.85) : 0.97 + (r - 9) * 0.26;   // past 9 it runs away
    const gb = Math.pow(10, p.bass * 1.1 / 20), gt = Math.pow(10, p.treb * 1.1 / 20);
    this.tL.gb = this.tR.gb = gb; this.tL.gt = this.tR.gt = gt;
  }
  process(inputs: Float32Array[][], outputs: Float32Array[][]) {
    const inp = inputs[0], dry = outputs[0], wet = outputs[1], p = this.p, n = dry[0].length;
    const iL = inp && inp[0], iR = inp && (inp[1] || inp[0]);
    const send = Math.min(1, p.mix / 5), keep = Math.min(1, (10 - p.mix) / 5), fb = this.fb;
    for (let k = 0; k < n; k++) {
      const inst = this.siren.step(p) + this.drum.step(p);
      dry[0][k] = dry[1][k] = inst * keep;
      const xl = (iL ? iL[k] : 0) + inst * send, xr = (iR ? iR[k] : 0) + inst * send;
      const yl = this.tL.read(), yr = p.width ? this.tR.read() : yl;
      if (p.width === 0) { this.tL.write(0.5 * (xl + xr) + fb * yl); wet[0][k] = wet[1][k] = yl; }
      else if (p.width === 1) { this.tL.write(xl + fb * yl); this.tR.write(xr + fb * yr); wet[0][k] = yl; wet[1][k] = yr; }
      else { this.tL.write(0.5 * (xl + xr) + fb * this.yR); this.tR.write(fb * this.yL); wet[0][k] = yl; wet[1][k] = yr; }   // ping-pong
      this.yL = yl; this.yR = yr;
    }
    return true;
  }
}
registerProcessor('dub-rig', Rig);
