import '@fontsource/shrikhand/latin-400.css';
import '@fontsource/courier-prime/latin-400.css';
import '@fontsource/courier-prime/latin-700.css';
import './styles.css';
import { freshChan, S, DIVS, VLC, VHC, save, popUndo, canUndo, resetMix, watchUndo, gestureStart, gestureEnd, storeSnap, recallSnap, hasSnap, lastSnap, getSnaps, setSnaps, mixJson, setMix } from './state';
import { makeTour, MIXER_TOUR } from './ui/tour';
import * as A from './audio/engine';
import { SPECS } from './audio/irs';
import { DEMO } from './audio/demo';
import * as Store from './loader/store';
import * as Split from './split/split';
import { control, guardPage, clamp, xFrac, abandonWithin } from './ui/control';
import { knob, fader, bar, seg } from './ui/widgets';
import { tick } from './ui/haptic';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const setText = (id: string, t: string) => { const e = $(id); if (e.textContent !== t) e.textContent = t; };   // writing equal text still costs a layout
const draws: (() => void)[] = [];
const redraw = () => draws.forEach(f => f());
guardPage();

// ---------- toast ----------
let toastT = 0;
function toast(msg: string, ms = 2600) { const t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = window.setTimeout(() => { t.hidden = true; }, ms); }

// ---------- channel strips ----------
const cutLab = (st: number) => { const hz = (f: number) => f >= 1000 ? f / 1000 + 'K' : String(f); return st === 0 ? 'Cut' : st < 0 ? 'LP ' + hz([10000, 8000, 6000, 5000, 4000, 3000, 2000, 1000, 500, 250][-st - 1]) : 'HP ' + hz([70, 100, 150, 250, 500, 1000, 2000, 3000, 5000, 7500][st - 1]); };
const strips = $('strips');
for (let c = 0; c < A.N; c++) strips.insertAdjacentHTML('beforeend', `<div class="st" data-c="${c}">
  <button class="slot" data-c="${c}"></button>
  <div class="k"><span class="kv">Cut</span><svg class="kn" data-p="cut"></svg></div>
  <div class="k"><span class="kv">Echo</span><svg class="kn" data-p="echo"></svg></div>
  <div class="k"><span class="kv">Verb</span><svg class="kn" data-p="verb"></svg></div>
  <div class="fd"><div class="tr"></div><div class="lv"></div><div class="mt"><i></i></div><div class="cap"></div></div>
  <button class="throw">Throw</button><button class="mute">Mute</button></div>`);
const meterEls: HTMLElement[] = [];
// track names: full size if they fit, else smaller, else two lines (never cut off)
function fitName(el: HTMLElement) {
  el.style.fontSize = ''; el.classList.remove('two');
  requestAnimationFrame(() => { const w = el.clientWidth; if (!w) return; const full = el.scrollWidth;
    if (full <= w) return; const k = w / full;
    if (k >= 0.72) el.style.fontSize = `calc(${(13 * k).toFixed(1)}px * var(--z))`; else el.classList.add('two'); });
}
const muteDraws: (() => void)[] = [], faderDraws: (() => void)[] = [];
document.querySelectorAll<HTMLElement>('.st').forEach(st => {
  const c = +st.dataset.c!, q = S.ch[c];
  const [kc, ke, kv] = [...st.querySelectorAll<SVGSVGElement>('.kn')];
  draws.push(knob(kc, { get: () => (q.cut + 10) / 20, set: v => { q.cut = Math.round(v * 20) - 10; A.applyChan(c, 'cut'); }, home: 0.5, bi: true, steps: 20, label: v => cutLab(Math.round(v * 20) - 10), sens: 100 }));
  draws.push(knob(ke, { get: () => q.echo, set: v => { q.echo = v; A.applyChan(c, 'echo'); }, home: 0, name: 'Echo' }));
  draws.push(knob(kv, { get: () => q.verb, set: v => { q.verb = v; A.applyChan(c, 'verb'); }, home: 0, name: 'Verb' }));
  const fd = st.querySelector<HTMLElement>('.fd')!;
  const df = fader(fd, () => q.fader, v => { q.fader = v; A.applyChan(c, 'fader'); }); draws.push(df); faderDraws.push(df); addEventListener('resize', df);
  meterEls.push(st.querySelector<HTMLElement>('.mt i')!);
  const th = st.querySelector<HTMLElement>('.throw')!;
  const throwOff = () => { A.setThrow(c, false); th.classList.remove('on'); };
  control(th, { undoable: false, down: async () => { await A.ensure(); A.setThrow(c, true); th.classList.add('on'); }, up: throwOff, cancel: throwOff });
  // Mute: tap toggles mute; a long press toggles solo (green)
  const mu = st.querySelector<HTMLElement>('.mute')!;
  const dm = () => { mu.classList.toggle('on', q.mute && !q.solo); mu.classList.toggle('solo', q.solo); mu.textContent = q.solo ? 'Solo' : 'Mute'; };
  draws.push(dm); muteDraws.push(dm);
  // tap: mute. Hold: solo for as long as the finger stays down; letting go puts the part back as it was.
  control(mu, { longMs: 300,
    long: g => { (g as typeof g & { wasMuted: boolean }).wasMuted = q.mute; if (q.mute) { q.mute = false; A.applyChan(c, 'mute'); }
      q.solo = true; A.applySolo(); tick(); muteDraws.forEach(f => f()); },
    cancel: g => { if (!g.long) return; q.solo = false; if ((g as typeof g & { wasMuted: boolean }).wasMuted) { q.mute = true; A.applyChan(c, 'mute'); } A.applySolo(); muteDraws.forEach(f => f()); },
    up: g => {
      if (g.long) { q.solo = false; if ((g as typeof g & { wasMuted: boolean }).wasMuted) { q.mute = true; A.applyChan(c, 'mute'); } A.applySolo(); muteDraws.forEach(f => f()); return; }
      tick(); q.mute = !q.mute; A.applyChan(c, 'mute'); muteDraws.forEach(f => f()); } });
  const slot = st.querySelector<HTMLElement>('.slot')!;
  draws.push(() => { const s = A.song.stems[c], t = s.status ? '…' : s.name; if (slot.textContent !== t) { slot.textContent = t; fitName(slot); } slot.classList.toggle('empty', !s.meta); st.hidden = c >= A.song.count; });
  control(slot, { undoable: false, up: () => pickOne(c) });
});
// banks: phones show 4 strips at a time; 1-4 / 5-8 switches when there are more than 4 tracks
let bank = 0;
function drawBank() {
  const many = A.song.count > 4, wide = innerWidth >= 700;
  $('banks').hidden = !many || wide; strips.style.setProperty('--cols', String(wide ? A.song.count : 4));
  if (!many || wide) bank = 0;
  strips.querySelectorAll<HTMLElement>('.st').forEach((st, c) => st.classList.toggle('off', !wide && many && Math.floor(c / 4) !== bank));
  $('banks').querySelectorAll<HTMLElement>('i').forEach((b, i) => { b.classList.toggle('on', i === bank); b.textContent = i ? `5–${A.song.count}` : '1–4'; });
  requestAnimationFrame(() => { faderDraws.forEach(f => f()); strips.querySelectorAll<HTMLElement>('.st:not(.off):not([hidden]) .slot').forEach(fitName); });
}
function setBank(b: number) {
  if (b === bank) return; const dir = b > bank ? 'in-r' : 'in-l'; bank = b; tick(); drawBank(); requestAnimationFrame(redraw);
  strips.classList.remove('in-l', 'in-r'); void strips.offsetWidth; strips.classList.add(dir);   // 5-8 slides in from the right, 1-4 from the left
}
$('banks').querySelectorAll<HTMLElement>('i').forEach((b, i) => control(b, { undoable: false, down: () => setBank(i) }));
// swipe across the strips to switch banks: they follow the finger, then snap (any knob or fader the swipe started on lets go)
{ let id = -1, x0 = 0, y0 = 0, t0 = 0, on = false, dx = 0;
  const canSwipe = () => A.song.count > 4 && innerWidth < 700;
  strips.addEventListener('pointerdown', e => { if (id >= 0 || !canSwipe()) return; id = e.pointerId; x0 = e.clientX; y0 = e.clientY; t0 = e.timeStamp; on = false; dx = 0; });
  strips.addEventListener('pointermove', e => {
    if (e.pointerId !== id) return; dx = e.clientX - x0; const dy = e.clientY - y0;
    // a deliberate sideways stroke, not a wobble
    if (!on) { if (Math.abs(dx) > 34 && Math.abs(dx) > 2.4 * Math.abs(dy)) { on = true; abandonWithin(strips); try { strips.setPointerCapture(id); } catch { /* */ } strips.classList.remove('in-l', 'in-r'); } else return; }
    const edge = (bank === 0 && dx > 0) || (bank === 1 && dx < 0);   // nothing that way: resist
    strips.style.transform = `translate3d(${(edge ? dx * 0.25 : dx).toFixed(1)}px, 0, 0)`;
  });
  const end = (e: PointerEvent) => {
    if (e.pointerId !== id) return; id = -1; if (!on) return; on = false;
    const v = dx / Math.max(1, e.timeStamp - t0), far = Math.abs(dx) > strips.clientWidth * 0.35 || (Math.abs(dx) > strips.clientWidth * 0.2 && Math.abs(v) > 0.9);   // a third of the way, or a fast flick
    strips.style.transform = '';
    if (far && dx < 0 && bank === 0) setBank(1); else if (far && dx > 0 && bank === 1) setBank(0);
    else { strips.classList.add('back'); setTimeout(() => strips.classList.remove('back'), 200); }
  };
  strips.addEventListener('pointerup', end); strips.addEventListener('pointercancel', end);
}
draws.push(drawBank); addEventListener('resize', drawBank);

// ---------- Siren and Synare pads ----------
const strike = (u: number) => Math.pow(0.31 + 0.69 * u, 2);
const pSir = $('pSir'), pSyn = $('pSyn');
const onKnob = (e: PointerEvent) => !!(e.target as Element).closest?.('.lvk');
function sirenUI() { const on = A.sirenOn(); pSir.classList.toggle('on', on); $('sTrig').classList.toggle('on', on); }
control(pSir, { undoable: false,
  down: async (s, e) => { if (onKnob(e)) { s.skip = true; return; } tick(); await A.ensure(); A.siren(S.m.sir.momentary ? true : !A.sirenOn()); sirenUI(); },
  up: s => { if (!s.skip && S.m.sir.momentary) { A.siren(false); sirenUI(); } } });
control(pSyn, { undoable: false, down: async (s, e) => {
  if (onKnob(e)) return; await A.ensure();
  const u = clamp(1 - (e.clientY - s.r.top) / s.r.height, 0, 1); A.hit(strike(0.55 + 0.45 * u)); tick();
  pSyn.classList.add('on'); setTimeout(() => pSyn.classList.remove('on'), 160); } });
document.querySelectorAll<SVGSVGElement>('.lvk').forEach(k => {
  k.addEventListener('pointerdown', e => e.stopPropagation());
  const sir = k.dataset.l === 'sir';
  draws.push(knob(k, { get: () => sir ? S.m.sir.vol : S.m.syn.level, set: v => { if (sir) S.m.sir.vol = v; else S.m.syn.level = v; A.applyEcho(); }, home: sir ? 0.7 : 0.5, sens: 70, name: sir ? 'Siren' : 'Synare' }));
});

// ---------- the echo card ----------
const echoChange = () => { A.applyEcho(); drawEcho(); drawFx(); };
function drawEcho() {
  setText('rDly', S.m.sync ? DIVS[S.m.div][0] : Math.round(A.dlyMs()) + 'ms');
  setText('rRep', S.m.rep.toFixed(1)); setText('rRet', String(Math.round(S.m.ret * 100)));
  $('bRep').classList.toggle('hot', S.m.rep > 9); setText('bpm', A.song.bpm.toFixed(0));
  dDly(); dRep(); dRet();
}
const dDly = bar($('bDly'), { get: () => S.m.sync ? S.m.div / 8 : S.m.dly, set: v => { if (S.m.sync) S.m.div = Math.round(v * 8); else S.m.dly = v; echoChange(); } });
const dRep = bar($('bRep'), { relative: true, get: () => S.m.rep / 10, set: v => { S.m.rep = v * 10; echoChange(); } });   // relative: a tap never throws it into the runaway
const dRet = bar($('bRet'), { get: () => S.m.ret / 1.5, set: v => { S.m.ret = v * 1.5; echoChange(); }, snap: 1 / 1.5 });
draws.push(drawEcho);

// tap tempo: the average of the last taps, reset after 2 s
let taps: number[] = [];
control($('tapBtn'), { undoable: false, down: () => {
  tick(); const n = performance.now(); if (taps.length && n - taps[taps.length - 1] > 2000) taps = []; taps.push(n); taps = taps.slice(-6);
  if (taps.length >= 3) { const d = (taps[taps.length - 1] - taps[0]) / (taps.length - 1); A.song.bpm = Math.round(60000 / d * 10) / 10; echoChange(); saveSong(); }
  $('tapBtn').classList.add('on'); setTimeout(() => $('tapBtn').classList.remove('on'), 90); } });

// ---------- pages ----------
const pages = ['fx', 'syn', 'sir'];
function openPage(p: string) { A.ensure(); pages.forEach(x => { $(x).hidden = x !== p; }); if (p === 'fx') { drawFx(); drawVerb(); } }
document.querySelectorAll<HTMLElement>('[data-open]').forEach(b => control(b, { undoable: false, down: () => openPage(b.dataset.open!) }));
document.querySelectorAll<HTMLElement>('[data-close]').forEach(b => control(b, { undoable: false, down: () => pages.forEach(x => { $(x).hidden = true; }) }));
document.querySelectorAll<HTMLElement>('#fxTabs [data-t]').forEach(t => control(t, { undoable: false, down: () => {
  document.querySelectorAll('#fxTabs [data-t]').forEach(x => x.classList.toggle('on', x === t));
  document.querySelectorAll<HTMLElement>('.fxp').forEach(x => { x.hidden = x.dataset.p !== t.dataset.t; }); drawVerb(); } }));

// ---------- FX: echo ----------
const dSync = seg($('xSync'), () => S.m.sync ? 0 : 1, i => { S.m.sync = i === 0; echoChange(); });
const dDiv = seg($('xDiv'), () => S.m.sync ? S.m.div : -1, i => { S.m.sync = true; S.m.div = i; echoChange(); });
const dWid = seg($('xWid'), () => A.widthNow(), i => { S.m.width = i; echoChange(); }, i => !A.stereoOK && i > 0);
const biBar = (id: string, k: 'bass' | 'treb') => {
  const el = $(id), c = el.querySelector<HTMLElement>('.c')!;
  const draw = () => { const v = S.m[k]; c.style.left = (v < 0 ? 50 + v * 10 : 50) + '%'; c.style.width = Math.abs(v) * 10 + '%'; $(id === 'bBass' ? 'rBass' : 'rTreb').textContent = (v > 0 ? '+' : '') + v.toFixed(1); };
  control(el, { down: s => { s.v0 = S.m[k]; }, move: (s, e) => { let v = s.v0! + (e.clientX - s.x0) / s.r.width * 10; if (Math.abs(v) < 0.25) v = 0; S.m[k] = clamp(v, -5, 5); echoChange(); }, dbl: () => { S.m[k] = 0; echoChange(); } });
  return draw;
};
const dBass = biBar('bBass', 'bass'), dTreb = biBar('bTreb', 'treb');
const dE2V = bar($('bE2V'), { get: () => S.m.e2v, set: v => { S.m.e2v = v; echoChange(); } });
const dRet2 = bar($('bRet2'), { get: () => S.m.ret / 1.5, set: v => { S.m.ret = v * 1.5; echoChange(); }, snap: 1 / 1.5 });
const dMix = bar($('bMix'), { get: () => S.m.mix / 10, set: v => { S.m.mix = v * 10; echoChange(); }, snap: 0.5 });
function drawFx() {
  if ($('fx').hidden) return;
  dSync(); dDiv(); dWid(); dBass(); dTreb(); dE2V(); dRet2(); dMix();
  $('xDiv').classList.toggle('dim', !S.m.sync);
  $('xTempo').textContent = A.song.bpm.toFixed(1).replace(/\.0$/, '') + ' BPM';
  $('xNote').textContent = S.m.sync ? `${DIVS[S.m.div][0]} at ${A.song.bpm.toFixed(0)} BPM = ${Math.round(A.dlyMs())} ms. 1/8. is the classic dub skip.` : 'Free: the mixer\'s Time bar sets 60 to 600 ms by ear.';
  $('xWNote').textContent = A.stereoOK ? 'Mono: one tape. Stereo: a tape each side. Ping-pong: repeats jump across.' : 'This phone keeps one tape (mono) so the sound stays clean.';
  $('rE2V').textContent = String(Math.round(S.m.e2v * 100)); $('rRet2').textContent = String(Math.round(S.m.ret * 100)); $('rMix').textContent = S.m.mix.toFixed(1);
}
draws.push(drawFx);

// ---------- FX: verb ----------
$('vSel').innerHTML = SPECS.map(s => `<i>${s.name}</i>`).join('');
const dSel = seg($('vSel'), () => S.m.vIr, i => { S.m.vIr = i; S.m.vDec = 0; A.loadVerb().then(drawVerb); drawVerb(); });
const decCommit = () => { clearTimeout(decT); decT = window.setTimeout(() => A.setVerbIR(), 120); };
let decT = 0;
const dDec = bar($('bDec'), { get: () => { const ir = A.irOf(S.m.vIr); return !ir || !S.m.vDec ? 1 : (S.m.vDec - 0.3) / (ir.len - 0.3); },
  set: v => { const ir = A.irOf(S.m.vIr); if (!ir) return; S.m.vDec = v > 0.985 ? 0 : 0.3 + v * (ir.len - 0.3); drawVerb(); decCommit(); } });
const dLC = bar($('bLC'), { steps: 10, get: () => S.m.vLc / 10, set: v => { S.m.vLc = Math.round(v * 10); A.applyVerb(); drawVerb(); } });
const dHC = bar($('bHC'), { steps: 10, get: () => S.m.vHc / 10, set: v => { S.m.vHc = Math.round(v * 10); A.applyVerb(); drawVerb(); } });
const dVRet = bar($('bVRet'), { get: () => S.m.vRet / 1.5, set: v => { S.m.vRet = v * 1.5; A.applyVerb(); drawVerb(); }, snap: 1 / 1.5 });
const hzLab = (f: number) => f ? (f >= 1000 ? f / 1000 + 'K' : String(f)) : 'Off';
function drawVerb() {
  if ($('fx').hidden) return;
  dSel(); dDec(); dLC(); dHC(); dVRet();
  const ir = A.irOf(S.m.vIr), d = S.m.vDec || (ir ? ir.len : 0), g = $('vGraph') as unknown as SVGSVGElement;
  $('rDec').textContent = ir ? d.toFixed(1) + ' s' + (S.m.vDec ? '' : ' (full)') : 'Press play to load';
  if (ir) { const W = 300, H = 64, pts = ir.env.map((v, i) => `${(i * W / (ir.env.length - 1)).toFixed(1)},${(H - v * H).toFixed(1)}`).join(' '), fx = W * d / ir.len;
    g.innerHTML = `<polygon points="0,${H} ${pts} ${W},${H}" class="g-fill"/><polyline points="${pts}" class="g-line"/><rect x="${fx}" y="0" width="${Math.max(0, W - fx)}" height="${H}" class="g-shade"/><line x1="${fx}" y1="0" x2="${fx}" y2="${H}" class="g-cut"/>`; }
  else g.innerHTML = '';
  $('rLC').textContent = hzLab(VLC[S.m.vLc]); $('rHC').textContent = hzLab(VHC[S.m.vHc]); $('rVRet').textContent = String(Math.round(S.m.vRet * 100));
}
draws.push(drawVerb);

// ---------- Synare page: the XY pad ----------
const xy = $('xy'), xyDot = $('xyDot');
function drawSyn() {
  $('rHz').textContent = Math.round(A.xToHz(S.m.syn.x)) + ' Hz'; $('rSDec').textContent = S.m.syn.dec.toFixed(2) + ' s';
  xyDot.style.transform = `translate3d(${(S.m.syn.x * xy.clientWidth).toFixed(1)}px, ${((1 - Math.sqrt((S.m.syn.dec - 0.02) / 1.98)) * xy.clientHeight).toFixed(1)}px, 0)`;
}
{ const pts = new Map<number, { x: number; y: number }>(); let first = -1, d0 = 0;
  xy.addEventListener('pointerdown', async e => {
    e.preventDefault(); try { xy.setPointerCapture(e.pointerId); } catch { /* */ }
    await A.ensure(); pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const r = xy.getBoundingClientRect();
    if (pts.size === 1) { first = e.pointerId; gestureStart(); d0 = S.m.syn.dec;
      S.m.syn.x = clamp((e.clientX - r.left) / r.width, 0, 1); A.applyEcho(); A.hit(strike(0.5 + 0.5 * clamp(1 - (e.clientY - r.top) / r.height, 0, 1))); drawSyn(); }
    else wob(); });
  const wob = () => { const a = pts.get(first), b = [...pts.entries()].find(([k]) => k !== first)?.[1]; if (!a || !b) { A.wobble(0); $('rWob').textContent = 'off'; return; }
    const w = clamp(Math.hypot(a.x - b.x, a.y - b.y) / (xy.clientWidth * 0.8), 0, 1); A.wobble(w); $('rWob').textContent = Math.round(w * 100) + '%'; };
  xy.addEventListener('pointermove', e => { const p = pts.get(e.pointerId); if (!p) return; const r = xy.getBoundingClientRect();
    if (e.pointerId === first) { const dy = (p.y - e.clientY) / r.height; S.m.syn.x = clamp((e.clientX - r.left) / r.width, 0, 1);
      const u = clamp(Math.sqrt((d0 - 0.02) / 1.98) + dy, 0, 1); S.m.syn.dec = 0.02 + 1.98 * u * u; A.applyEcho(); drawSyn(); }
    else { pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); wob(); } });
  const end = (e: PointerEvent) => { if (!pts.delete(e.pointerId)) return; if (e.pointerId === first) { first = pts.keys().next().value ?? -1; gestureEnd(); } wob(); };
  xy.addEventListener('pointerup', end); xy.addEventListener('pointercancel', end);
}
draws.push(drawSyn);

// ---------- Siren page ----------
const sdraws = [
  seg($('sBase'), () => S.m.sir.base, i => { S.m.sir.base = i; A.applyEcho(); }),
  seg($('sMode'), () => S.m.sir.mode, i => { S.m.sir.mode = i; A.applyEcho(); }),
  seg($('sBeat'), () => S.m.sir.beat, i => { S.m.sir.beat = i; A.applyEcho(); }),
  seg($('sTrigMode'), () => S.m.sir.momentary ? 1 : 0, i => { S.m.sir.momentary = i === 1; }),
  bar($('bSVol'), { get: () => S.m.sir.vol, set: v => { S.m.sir.vol = v; A.applyEcho(); $('rSVol').textContent = String(Math.round(v * 100)); } }),
];
draws.push(() => { sdraws.forEach(f => f()); $('rSVol').textContent = String(Math.round(S.m.sir.vol * 100)); });
control($('sTrig'), { undoable: false, down: async () => { await A.ensure(); A.siren(S.m.sir.momentary ? true : !A.sirenOn()); sirenUI(); }, up: () => { if (S.m.sir.momentary) { A.siren(false); sirenUI(); } } });
for (const [id, k] of [['sSig', 'sirSig'], ['sSwoop', 'sirSwoop']] as const)
  control($(id), { undoable: false, down: async () => { await A.ensure(); A.sirenHold(k, true); $(id).classList.add('on'); }, up: () => { A.sirenHold(k, false); $(id).classList.remove('on'); } });

// ---------- transport ----------
const fmt = (x: number) => Math.floor(x / 60) + ':' + String(Math.floor(x % 60)).padStart(2, '0');
let scrub: number | null = null;
function icon() { $('playIcon').innerHTML = A.playing ? '<path d="M5 3h3.5v14H5zM11.5 3H15v14h-3.5z"/>' : '<path d="M5 3l12 7-12 7z"/>'; $('play').setAttribute('aria-label', A.playing ? 'Pause' : 'Play'); }
async function playToggle() {
  await A.ensure();
  if (!A.dur()) { openSheet('songSheet'); toast('Load your tracks first'); return; }
  if (A.playing) { A.stop(); letSleep(); silentAudio.pause(); } else { A.play(); keepAwake(); silentAudio.play().catch(() => {}); latencyCheck(); }
  icon(); media();
}
control($('play'), { undoable: false, down: () => { tick(); playToggle(); } });
control($('prog'), { undoable: false, down: (s, e) => { scrub = xFrac(s, e) * A.dur(); }, move: (s, e) => { scrub = xFrac(s, e) * A.dur(); },
  up: () => { if (scrub !== null) { const d = A.dur(), near = A.song.cues.find(c => Math.abs(c - scrub!) < d * 0.04); A.seek(near ?? scrub); } scrub = null; } });
addEventListener('keydown', e => { if (e.code !== 'Space' || !$('start').hidden || (e.target as Element).closest?.('input, select, textarea, button')) return; e.preventDefault(); if (!e.repeat) playToggle(); });

// loop: 4 bars from the bar you are in
function drawLoop() { const b = $('band'), d = A.dur() || 1; b.hidden = !A.loop.on; b.style.left = A.loop.a / d * 100 + '%'; b.style.width = (A.loop.b - A.loop.a) / d * 100 + '%'; $('loopBtn').classList.toggle('on', A.loop.on); $('loopBtn').setAttribute('aria-pressed', String(A.loop.on)); }
function toggleLoop() {
  if (A.loop.on) A.loop.on = false;
  else { const barS = 240 / A.song.bpm, t = A.now(); A.loop.a = Math.floor(t / barS) * barS; A.loop.b = Math.min(A.dur(), A.loop.a + 4 * barS); A.loop.on = true; }
  A.relooped(); drawLoop();
}
control($('loopBtn'), { undoable: false, longMs: 450,
  down: () => { if (!A.dur()) return; tick(); toggleLoop(); },
  long: () => { if (!A.dur()) return; toggleLoop(); tick(); const t = Math.round(A.now() * 100) / 100; A.song.cues = [...A.song.cues.filter(c => Math.abs(c - t) > 0.5), t].sort((a, b) => a - b).slice(-12); drawCues(); saveSong(); toast(`Cue at ${fmt(t)}. Tap near it on the line to jump there.`); } });

// undo and reset
const drawUndo = () => { ($('undoBtn') as HTMLButtonElement).disabled = !canUndo(); };
watchUndo(() => { drawUndo(); saveSong(); }); drawUndo();
const applyAll = () => { A.applySolo(); for (let c = 0; c < A.N; c++) for (const p of ['cut', 'fader', 'mute', 'echo', 'verb', 'pan'] as const) A.applyChan(c, p); A.applyEcho(); A.applyVerb(); A.setVerbIR(); redraw(); };
control($('undoBtn'), { undoable: false, down: () => { if (popUndo()) applyAll(); } });
control($('resetBtn'), { undoable: false, long: () => { resetMix(); applyAll(); toast('Mix reset'); }, longMs: 500, up: s => { if (!s.long) toast('Hold Reset to clear the channels'); } });

// record
let recUrl = '', recBlob: Blob | null = null;
control($('recBtn'), { undoable: false, down: async () => {
  await A.ensure();
  if (A.recording()) {
    const b = await A.recStop(); $('recBtn').classList.remove('on');
    if (b) { recBlob = b; if (recUrl) URL.revokeObjectURL(recUrl); recUrl = URL.createObjectURL(b); ($('recAudio') as HTMLAudioElement).src = recUrl; openSheet('recSheet');
      Store.saveTake(A.song.id, b).catch(() => toast('Could not save the take: share it now to keep it')); }
  } else if (A.recStart()) { $('recBtn').classList.add('on'); if (!A.playing) playToggle(); toast('Recording'); }
  else toast('Recording is not supported in this browser'); } });
control($('recShare'), { undoable: false, up: async () => {
  if (!recBlob) return; const ext = recBlob.type.includes('mp4') ? 'm4a' : 'webm';
  shareBlob(recBlob, `${fileSafe(A.song.title || 'dub')}-dub.${ext}`); } });
const fileSafe = (t: string) => t.replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '') || 'dub';
async function shareBlob(b: Blob, name: string) {
  const f = new File([b], name, { type: b.type || 'application/octet-stream' });
  if (navigator.canShare?.({ files: [f] })) { try { await navigator.share({ files: [f], title: name }); return; } catch (e) { if ((e as Error).name === 'AbortError') return; } }
  const u = URL.createObjectURL(f), a = document.createElement('a'); a.href = u; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(u), 60000);
}

// ---------- mix snapshots ----------
const snapEls = [...$('snaps').querySelectorAll<HTMLElement>('i')];
const drawSnaps = () => snapEls.forEach((el, i) => { el.classList.toggle('set', hasSnap(i)); el.classList.toggle('cur', lastSnap === i); });
snapEls.forEach((el, i) => control(el, { undoable: false, longMs: 500,
  long: () => { storeSnap(i); drawSnaps(); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 300); toast(`Mix stored in ${'ABCD'[i]}`); },
  up: s => { if (s.long) return; if (recallSnap(i)) { applyAll(); drawSnaps(); } else toast(`Hold ${'ABCD'[i]} to store this mix`); } }));
draws.push(drawSnaps);

// ---------- tour ----------
const tour = makeTour(p => { pages.forEach(x => { $(x).hidden = x !== p; }); if (p === 'fx') { drawFx(); drawVerb(); } });
$('tourBtn').addEventListener('click', () => { closeSheets(); tour.open(MIXER_TOUR); });
function firstTour() { try { if (localStorage.getItem('dub-studio-toured')) return; localStorage.setItem('dub-studio-toured', '1'); } catch { return; } setTimeout(() => tour.open(MIXER_TOUR), 900); }

// ---------- the frame loop: time, position, meters ----------
// Writes only what changed, and only transforms (no layout): the clock when its text changes, the playhead every
// frame, meters 30 times a second with a little smoothing.
let peakHold = 0, lastTime = '', lastPos = -1, odd = false, brandClip = false, progW = 0;
const meterShown = new Float32Array(8), meterClip = new Uint8Array(8), brand = document.querySelector('.brand')!, posBar = $('pos'), posDot = $('posDot');
const measureProg = () => { progW = $('prog').clientWidth; lastPos = -1; };
addEventListener('resize', measureProg); requestAnimationFrame(measureProg);
function frame() {
  requestAnimationFrame(frame);
  if (A.ended()) { A.stop(); A.rewind(); icon(); letSleep(); media(); }
  const d = A.dur(), t = scrub ?? A.now();
  const tt = fmt(t) + ' / ' + fmt(d); if (tt !== lastTime) { lastTime = tt; $('time').textContent = tt; }
  const f = d ? t / d : 0; if (Math.abs(f - lastPos) * progW > 0.3) { lastPos = f; posBar.style.transform = `scaleX(${f.toFixed(5)})`; posDot.style.transform = `translate3d(${(f * progW).toFixed(1)}px, 0, 0)`; }
  if ((odd = !odd)) return;   // meters at 30 fps
  const m = A.meters(); if (!m) return;
  m.ch.forEach((p, i) => {
    const db = 20 * Math.log10(p + 1e-6), h = clamp((db + 48) / 48, 0, 1), v = h > meterShown[i] ? h : meterShown[i] * 0.86 + h * 0.14;   // fast up, smooth fall
    if (Math.abs(v - meterShown[i]) > 0.004) { meterShown[i] = v; meterEls[i].style.transform = `scaleY(${v.toFixed(3)})`; }
    const c = p > 0.98 ? 1 : 0; if (c !== meterClip[i]) { meterClip[i] = c; meterEls[i].classList.toggle('clip', !!c); }
  });
  peakHold = Math.max(m.master, peakHold * 0.95); const bc = peakHold > 0.99; if (bc !== brandClip) { brandClip = bc; brand.classList.toggle('clip', bc); }
}
requestAnimationFrame(frame);

// ---------- screen, lock and lock-screen controls ----------
let wl: WakeLockSentinel | null = null;
async function keepAwake() { try { if ('wakeLock' in navigator && !wl && !document.hidden) { wl = await navigator.wakeLock.request('screen'); wl.addEventListener('release', () => { wl = null; }); } } catch { wl = null; } }
function letSleep() { wl?.release().catch(() => {}); wl = null; }
// a silent looping <audio> makes iOS show the song on the lock screen and Control Centre
const silentAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAACAgICA');
silentAudio.loop = true; silentAudio.setAttribute('playsinline', '');
function media() {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({ title: A.song.title || 'Untitled', artist: 'Pocket Dub Studio' });
  navigator.mediaSession.playbackState = A.playing ? 'playing' : 'paused';
}
if ('mediaSession' in navigator) {
  navigator.mediaSession.setActionHandler('play', () => { if (!A.playing) playToggle(); });
  navigator.mediaSession.setActionHandler('pause', () => { if (A.playing) playToggle(); });
  try { navigator.mediaSession.setActionHandler('seekto', d => { if (d.seekTime != null) A.seek(d.seekTime); }); } catch { /* unsupported */ }
}
document.addEventListener('visibilitychange', () => { if (document.hidden) return; A.wake(); if (A.playing) keepAwake(); });
for (const ev of ['touchend', 'pointerup', 'click']) document.addEventListener(ev, () => A.wake(), true);   // after a call or Siri, the next touch wakes the audio
let latencyShown = false;
function latencyCheck() { if (latencyShown) return; setTimeout(() => { const l = A.latency(); if (l > 0.09) { latencyShown = true; toast(`Sound delay ${Math.round(l * 1000)} ms (Bluetooth?). For live pads use wired or the speaker.`, 5000); } }, 1500); }

// ---------- songs: load files, the demo, the Song sheet ----------
// the song's metadata (names, tempo, gain, offsets, cues) is saved next to its pieces, so it can be opened again
let metaT = 0;
function songMeta(): Store.SongMeta {
  return { id: A.song.id, title: A.song.title, bpm: A.song.bpm, bpmAuto: A.song.bpmAuto, sr: A.song.sr, seg: Store.SEG, gain: A.song.gain, cues: A.song.cues,
    stems: A.song.stems.slice(0, A.song.count).map(st => st.meta ? { ...st.meta, name: st.name } : null), created: created, played: Date.now(),
    mix: mixJson(), snaps: getSnaps(), source, spread };
}
let created = Date.now(), source: Store.SongMeta['source'] = 'files', persistAsked = false, spread = true;
// stereo spread: each part gets a place from its name (the low end and the voice stay in the middle)
const PLACES: [RegExp, number][] = [[/drum|kick|snare|kit|beat/i, 0], [/bass|sub/i, 0], [/vox|vocal|voice|sing|lead vo/i, 0],
  [/guit|gtr|chop|skank/i, -0.35], [/key|organ|piano|synth|pad|clav|rhodes/i, 0.35], [/perc|shak|tamb|conga|bongo|hand|nyab|bell/i, 0.5],
  [/horn|brass|sax|trump|tromb|flute|melod|harmonica/i, -0.25], [/fx|effect|noise/i, 0.2], [/other|inst|music|backing/i, -0.1]];
const placeOf = (name: string, c: number) => PLACES.find(([r]) => r.test(name))?.[1] ?? (c % 2 ? 0.25 : -0.25);
const loadedNow = new Set<number>();   // parts loaded in this go: they get their place when the load finishes
function setPan(c: number, v: number) { S.ch[c].pan = Math.round(clamp(v, -1, 1) * 100) / 100; A.applyChan(c, 'pan'); }
function applySpread(all: boolean) { for (let c = 0; c < A.song.count; c++) if (all || loadedNow.has(c)) setPan(c, spread ? placeOf(A.song.stems[c].name, c) : 0); loadedNow.clear(); save(); }
function saveSong(now = false) { if (!A.song.id) return; if (now) { clearTimeout(metaT); Store.saveMeta(songMeta()); try { localStorage.setItem('dub-studio-last', A.song.id); } catch { /* */ } return; } if (!persistAsked) { persistAsked = true; navigator.storage?.persist?.().catch(() => {}); } clearTimeout(metaT); metaT = window.setTimeout(() => { Store.saveMeta(songMeta()); try { localStorage.setItem('dub-studio-last', A.song.id); } catch { /* */ } }, 300); }

// file names to slots: each role has its home channel (see DEFAULT_NAMES)
const ROLE: [RegExp, number][] = [[/drum|perc|beat|kit/i, 0], [/bass/i, 1], [/other|inst|music|backing/i, 2], [/vox|vocal|voice|sing|acap/i, 3],
  [/guit|gtr/i, 4], [/key|piano|organ|synth|pad/i, 5], [/horn|brass|sax|trump|tromb|flute|melod/i, 6], [/fx|sfx|effect|noise/i, 7]];
const roleOf = (f: File) => ROLE.find(([r]) => r.test(f.name))?.[1] ?? -1;
const base = (f: File) => f.name.replace(/\.[^.]+$/, '');
// a part's name from its file: without the song name the files share ("Song - sax" -> "Sax")
function partName(f: File, all: File[]) {
  const r = roleOf(f); if (r >= 0) return A.DEFAULT_NAMES[r];
  let n = base(f); const p = all.length > 1 ? commonPrefix(all.map(base)) : '';
  if (p.length > 2 && n.length > p.length) n = n.slice(p.length);
  n = n.replace(/^[\s_\-.()[\]]+|[\s_\-.()[\]]+$/g, '').replace(/[_]+/g, ' ');
  n = n.charAt(0).toUpperCase() + n.slice(1);
  if (n.length > 24) { const w = n.slice(0, 25).lastIndexOf(' '); n = w > 6 ? n.slice(0, w) : n.slice(0, 24); }   // whole words
  return n || 'Track';
}
function commonPrefix(n: string[]) { let p = n[0] || ''; for (const x of n) while (!x.startsWith(p)) p = p.slice(0, -1); return p; }
const status = (c: number, t?: string) => { A.song.stems[c].status = t; slotsDraw(); redraw(); };
const onsetsBy = new Map<number, { on: Float32Array; hop: number }>();

// one stem: decode, hand to the worker (pieces, peaks, loudness, onsets), keep its metadata
class Superseded extends Error {}   // the song changed while a part was loading: stop quietly
async function stemFrom(c: number, name: string, channels: () => Promise<Float32Array[]>, file?: string) {
  const id = A.song.id, same = () => { if (A.song.id !== id) throw new Superseded(); };
  status(c, 'Decoding…');
  const data = await channels(); same();
  status(c, 'Saving…');
  const r = await Store.pieceStem(id, c, A.song.sr, data); same();
  A.song.stems[c].meta = { name, n: r.n, ch: r.ch, dur: r.dur, peaks: r.peaks, ms: r.ms, offset: 0, file };
  A.song.stems[c].name = name; onsetsBy.set(c, { on: r.onsets, hop: r.hop }); loadedNow.add(c);
  status(c, undefined);
}
const fromFile = (f: File) => async () => { const b = await A.decodeFile(f); const out: Float32Array[] = []; for (let k = 0; k < Math.min(2, b.numberOfChannels); k++) out.push(new Float32Array(b.getChannelData(k))); return out; };
function finishSong() {
  // tempo: from the drums if there are any, else the first part
  if (A.song.bpmAuto) { const src = onsetsBy.get(0) || onsetsBy.values().next().value; const bpm = src ? Store.detectBpm(src.on, A.song.sr, src.hop) : null; if (bpm) { A.song.bpm = bpm; echoChange(); } }
  A.setSongGain(Store.songGain(A.song.stems.slice(0, A.song.count).map(s => s.meta?.ms || 0)));
  applySpread(false);
  onsetsBy.clear(); saveSong(true); redraw(); slotsDraw(); drawLoop(); drawCues(); media();
}
function newSong(count: number, title: string, id = Store.newSongId()) {
  if (A.playing) { A.stop(); icon(); letSleep(); }
  A.loop.on = false; A.songChanged(); A.seek(0);
  Object.assign(A.song, { id, title, count, bpmAuto: true, cues: [], gain: 1, sr: A.ctx ? A.ctx.sampleRate : 48000 }); created = Date.now(); source = 'files';
  setSnaps([]); recBlob = null; spread = true; loadedNow.clear();
  A.song.stems.forEach((s, i) => { s.meta = null; s.status = undefined; s.name = A.DEFAULT_NAMES[i]; });
  S.ch.forEach(c => Object.assign(c, freshChan())); applyAll();   // a new song starts on a clean desk; echo and verb settings stay
}
async function loadInto(c: number, f: File) {
  await A.ensure();
  if (!A.song.id) newSong(Math.max(4, c + 1), base(f));
  const wasPlaying = A.playing, t = A.now(); if (wasPlaying) A.stop();
  const name = partName(f, [f]);
  try { await stemFrom(c, name, fromFile(f), f.name); A.songChanged(); }
  catch (e) { if (e instanceof Superseded) return; status(c, undefined); toast(`Could not read ${f.name}. Protected (Apple Music) or unsupported file.`, 4500); }
  if (c !== 0) onsetsBy.clear();   // only the drums re-set the tempo
  finishSong(); if (wasPlaying) A.play(t);
}
async function loadMany(files: File[]) {
  if (!files.length) return; await A.ensure();
  const fs = files.slice(0, A.N), count = Math.max(4, fs.length), order: (File | null)[] = Array(count).fill(null), rest: File[] = [];
  if (files.length > A.N) toast(`Up to ${A.N} tracks: the first ${A.N} were loaded`, 4000);
  for (const f of fs) { const r = roleOf(f); if (r >= 0 && r < count && !order[r]) order[r] = f; else rest.push(f); }
  for (let i = 0; i < count && rest.length; i++) if (!order[i]) order[i] = rest.shift()!;
  newSong(count, commonName(fs));
  order.forEach((f, i) => { if (f) A.song.stems[i].status = 'Waiting…'; }); redraw();
  let ok = 0;
  for (let i = 0; i < count; i++) { const f = order[i]; if (!f) continue;   // one at a time keeps memory low on a phone
    try { await stemFrom(i, partName(f, fs), fromFile(f), f.name); ok++; }
    catch (e) { if (e instanceof Superseded) return; status(i, undefined); toast(`Could not read ${f.name}. Protected (Apple Music) or unsupported file.`, 4500); } }
  finishSong(); toast(`Loaded ${ok} track${ok === 1 ? '' : 's'}${A.song.bpmAuto ? ` · ${A.song.bpm} BPM` : ''}`);
}
function commonName(fs: File[]) { const n = fs.map(base); let p = n[0] || ''; for (const x of n) while (!x.startsWith(p)) p = p.slice(0, -1); p = p.replace(/[\s_\-.(]+$/, ''); return p.length > 2 ? p : 'My song'; }
async function openSong(m: Store.SongMeta) {
  await A.ensure();
  newSong(Math.max(4, m.stems.length), m.title, m.id);
  Object.assign(A.song, { bpm: m.bpm, bpmAuto: m.bpmAuto ?? false, sr: m.sr, cues: m.cues || [] }); created = m.created; source = m.source || 'files'; spread = m.spread ?? true; loadedNow.clear();
  setMix(m.mix); setSnaps(m.snaps); applyAll();
  m.stems.forEach((st, i) => { if (st) { A.song.stems[i].meta = st; A.song.stems[i].name = st.name; } });
  A.setSongGain(m.gain); echoChange(); saveSong(); redraw(); slotsDraw(); drawLoop(); drawCues(); media();
}
async function loadDemo() {
  await A.ensure();
  const id = DEMO.id, old = await Store.loadMeta(id);
  if (old && old.sr === A.ctx!.sampleRate && (!Store.inMemory(id) ? await Store.readPiece(id, 0, 0) : true)) { await openSong(old); return; }   // loaded before: open it
  for (const o of DEMO.old) Store.deleteSong(o);   // earlier demo songs
  await Store.deleteSong(id);
  newSong(DEMO.parts.length, DEMO.title, id); A.song.bpm = DEMO.bpm; A.song.bpmAuto = false; source = 'demo';
  DEMO.parts.forEach(([nm], i) => { A.song.stems[i].name = nm; A.song.stems[i].status = 'Waiting…'; }); redraw();
  toast('Loading the demo song…', 60000);
  // fetch all six at once (the files are small), decode and cut them into pieces one at a time (memory stays low)
  const files = DEMO.parts.map(([, f]) => fetch(DEMO.dir + f + '.m4a').then(r => { if (!r.ok) throw new Error('download failed (' + r.status + ')'); return r.blob(); }));
  try {
    for (let i = 0; i < DEMO.parts.length; i++) {
      A.song.stems[i].status = 'Downloading…'; redraw();
      const blob = await files[i];
      await stemFrom(i, DEMO.parts[i][0], async () => { const b = await A.decodeFile(blob); const out: Float32Array[] = []; for (let k = 0; k < Math.min(2, b.numberOfChannels); k++) out.push(new Float32Array(b.getChannelData(k))); return out; }, DEMO.parts[i][1] + '.m4a');
    }
  } catch (e) {
    if (e instanceof Superseded) { Store.deleteSong(id); return; }   // left half loaded: loaded again next time
    Store.deleteSong(id); newSong(4, '', ''); redraw(); toast('Could not load the demo: ' + (e as Error).message + '. Check the connection and try again.', 6000); return;
  }
  finishSong(); toast(DEMO.title.replace(' (demo)', '') + ' · ' + DEMO.bpm + ' BPM');
}

let pickSlot = 0;
function pickOne(c: number) { pickSlot = c; ($('oneFile') as HTMLInputElement).click(); }
$('oneFile').addEventListener('change', e => { const i = e.target as HTMLInputElement; const f = i.files?.[0]; if (f) loadInto(pickSlot, f); i.value = ''; });
$('allFiles').addEventListener('change', e => { const i = e.target as HTMLInputElement; loadMany([...(i.files || [])]); i.value = ''; });
control($('loadAll'), { undoable: false, up: () => ($('allFiles') as HTMLInputElement).click() });
control($('loadDemo'), { undoable: false, up: () => { closeSheets(); loadDemo(); } });

const wave = (peaks: number[], h = 22) => { const W = peaks.length; return `<svg class="wave" viewBox="0 0 ${W} ${h}" preserveAspectRatio="none"><path d="${peaks.map((p, x) => `M${x} ${(h / 2 - p * h / 2).toFixed(1)}V${(h / 2 + p * h / 2).toFixed(1)}`).join('')}"/></svg>`; };
const esc = (t: string) => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const panLab = (v: number) => Math.abs(v) < 0.005 ? 'C' : (v < 0 ? 'L' : 'R') + Math.round(Math.abs(v) * 100);
function slotsDraw() {
  ($('fTitle') as HTMLInputElement).value = A.song.title; ($('fBpm') as HTMLInputElement).value = String(A.song.bpm);
  $('bpmNote').textContent = A.song.bpmAuto && A.song.id ? 'Found from the drums. Tap Tap on the mixer, or type, to change it.' : '';
  $('slots').innerHTML = A.song.stems.slice(0, A.song.count).map((s, i) => `<div class="slotrow">
      <input data-i="${i}" value="${esc(s.name)}" maxlength="24" aria-label="Track ${i + 1} name">
      <span>${s.status || (s.meta ? fmt(s.meta.dur) + (s.meta.ch === 1 ? ' mono' : '') : 'empty')}</span><button data-load="${i}">Load</button>
      ${s.meta ? `<div class="wv">${wave(s.meta.peaks)}<label>Nudge <input type="number" data-off="${i}" value="${s.meta.offset}" step="5" min="-2000" max="2000" inputmode="numeric"> ms</label><button class="share" data-wav="${i}">WAV</button></div>
      <div class="pn"><span>Pan</span><input type="range" data-pan="${i}" min="-100" max="100" step="1" value="${Math.round((S.ch[i].pan || 0) * 100)}" aria-label="Track ${i + 1} pan"><b data-panv="${i}">${panLab(S.ch[i].pan || 0)}</b></div>` : ''}</div>`).join('')
    + `<div class="slotadd">${A.song.count < A.N ? '<button id="addTrack">+ Add track</button>' : ''}${A.song.count > 4 ? '<button id="delTrack">− Remove last</button>' : ''}${A.song.cues.length ? '<button id="clearCues">Clear cues</button>' : ''}</div>`;
  $('slots').querySelectorAll<HTMLInputElement>('input[data-i]').forEach(inp => inp.addEventListener('input', () => { A.song.stems[+inp.dataset.i!].name = inp.value || '—'; redraw(); saveSong(); }));
  $('slots').querySelectorAll<HTMLInputElement>('input[data-off]').forEach(inp => inp.addEventListener('change', () => { const m = A.song.stems[+inp.dataset.off!].meta; if (!m) return;
    m.offset = clamp(Math.round(+inp.value || 0), -2000, 2000); inp.value = String(m.offset); A.songChanged(); if (A.playing) A.play(A.now()); saveSong(); }));
  $('slots').querySelectorAll<HTMLElement>('[data-load]').forEach(b => b.addEventListener('click', () => pickOne(+b.dataset.load!)));
  $('slots').querySelectorAll<HTMLInputElement>('input[data-pan]').forEach(inp => {
    const i = +inp.dataset.pan!, lab = $('slots').querySelector<HTMLElement>(`[data-panv="${i}"]`)!;
    inp.addEventListener('pointerdown', () => gestureStart());
    inp.addEventListener('input', () => { let v = +inp.value / 100; if (Math.abs(v) < 0.05) { v = 0; inp.value = '0'; } setPan(i, v); lab.textContent = panLab(v); });
    inp.addEventListener('change', () => { gestureEnd(); save(); });
    inp.addEventListener('dblclick', () => { setPan(i, 0); inp.value = '0'; lab.textContent = panLab(0); save(); });
  });
  ($('fSpread') as HTMLInputElement).checked = spread;
  $('slots').querySelectorAll<HTMLElement>('[data-wav]').forEach(b => b.addEventListener('click', async () => { const i = +b.dataset.wav!;
    try { await shareBlob(await Store.stemWav(songMeta(), i), `${fileSafe(A.song.title)}-${fileSafe(A.song.stems[i].name)}.wav`); } catch (e) { toast('Could not export: ' + (e as Error).message); } }));
  document.getElementById('addTrack')?.addEventListener('click', () => { A.song.count++; bank = Math.floor((A.song.count - 1) / 4); slotsDraw(); redraw(); saveSong(); });
  document.getElementById('delTrack')?.addEventListener('click', () => { const i = --A.song.count; const st = A.song.stems[i]; st.meta = null; st.name = A.DEFAULT_NAMES[i];
    S.ch[i].solo = false; A.applySolo(); if (A.playing) A.play(A.now()); slotsDraw(); redraw(); saveSong(); });
  document.getElementById('clearCues')?.addEventListener('click', () => { A.song.cues = []; drawCues(); slotsDraw(); saveSong(); });
}
$('fSpread').addEventListener('change', e => { gestureStart(); spread = (e.target as HTMLInputElement).checked; applySpread(true); gestureEnd(); saveSong(); slotsDraw(); });
$('fTitle').addEventListener('input', e => { A.song.title = (e.target as HTMLInputElement).value; $('songBtn').textContent = A.song.title || 'Untitled'; saveSong(); media(); });
$('fBpm').addEventListener('change', e => { const v = +(e.target as HTMLInputElement).value; if (v >= 40 && v <= 220) { A.song.bpm = v; A.song.bpmAuto = false; echoChange(); saveSong(); slotsDraw(); } });
draws.push(() => { $('songBtn').textContent = A.song.title || 'Load tracks'; });
control($('songBtn'), { undoable: false, up: () => { slotsDraw(); openSheet('songSheet'); } });

// ---------- splitter ----------
let splitting = false;
const mmss = (s: number) => s >= 60 ? `${Math.floor(s / 60)} min ${Math.round(s % 60)} s` : `${Math.round(s)} s`;
async function openSplit() {
  slotsDraw(); closeSheets(); openSheet('splitSheet'); $('splitRun').hidden = !splitting;
  $('splitModel').textContent = (await Split.modelSaved()) ? 'The splitter model is saved on this phone.' : `The first split downloads the splitter model: ${Split.MODEL_MB} MB, once. Use Wi-Fi.`;
}
async function runSplit(f: File) {
  await A.ensure(); splitting = true; $('splitRun').hidden = false; ($('splitPick') as HTMLButtonElement).disabled = true;
  const fill = $('splitBar').querySelector<HTMLElement>('.fill')!, st = $('splitStatus');
  newSong(6, base(f)); keepAwake(); redraw();
  const id = A.song.id;
  try {
    const r = await Split.splitFile(f, id, p => {
      if (p.stage === 'decode') { fill.style.transform = 'scaleX(.02)'; st.textContent = 'Reading the song…'; }
      if (p.stage === 'model') { fill.style.transform = `scaleX(${(p.done / p.total).toFixed(4)})`; st.textContent = `Downloading the model: ${Math.round(p.done / 1e6)} of ${Math.round(p.total / 1e6)} MB`; }
      if (p.stage === 'load') { fill.style.transform = 'scaleX(1)'; st.textContent = 'Starting the splitter…'; }
      if (p.stage === 'split') { fill.style.transform = `scaleX(${(p.done / p.total).toFixed(4)})`; st.textContent = `Splitting: ${Math.round(p.done / p.total * 100)}%` + (p.eta !== undefined ? ` · about ${mmss(p.eta)} left` : '') + (p.ep === 'wasm' ? ' (no GPU: slower)' : ''); }
    });
    if (A.song.id !== id) return;
    A.song.sr = 44100; A.song.title = base(f); source = 'split';
    r.stems.forEach((o, i) => { const slot = Split.SLOTS[i]; A.song.stems[slot].meta = { name: Split.SOURCES[i], n: o.n, ch: o.ch, dur: o.dur, peaks: o.peaks, ms: o.ms, offset: 0, file: f.name }; A.song.stems[slot].name = Split.SOURCES[i]; });
    onsetsBy.set(0, { on: r.stems[0].onsets, hop: r.stems[0].hop });
    finishSong(); closeSheets(); toast(`Split in ${mmss(r.secs)}${A.song.bpmAuto ? ` · ${A.song.bpm} BPM` : ''}`, 4000);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await Store.deleteSong(id); if (A.song.id === id) newSong(4, '', '');
    redraw(); toast(msg === 'cancelled' ? 'Split cancelled' : 'Could not split: ' + msg, 5000);
  } finally { splitting = false; $('splitRun').hidden = true; ($('splitPick') as HTMLButtonElement).disabled = false; letSleep(); }
}
control($('splitBtn'), { undoable: false, up: openSplit });
$('splitPick').addEventListener('click', () => ($('splitFile') as HTMLInputElement).click());
$('splitFile').addEventListener('change', e => { const i = e.target as HTMLInputElement; const f = i.files?.[0]; i.value = ''; if (f) runSplit(f); });
$('splitCancel').addEventListener('click', () => Split.cancelSplit());

// ---------- library ----------
const mb = (b: number) => b >= 1e9 ? (b / 1e9).toFixed(1) + ' GB' : Math.round(b / 1e6) + ' MB';
const day = (t: number) => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
const armed = new Map<string, number>();   // two taps to delete
const confirmTap = (key: string, btn: HTMLElement, label: string) => { const n = Date.now(); if ((armed.get(key) || 0) > n) { armed.delete(key); return true; }
  armed.set(key, n + 3000); btn.classList.add('warn'); btn.textContent = 'Sure?'; setTimeout(() => { btn.classList.remove('warn'); btn.textContent = label; }, 3000); return false; };
async function openLibrary() {
  closeSheets(); openSheet('libSheet');
  const [songs, use] = await Promise.all([Store.listSongs(), Store.storageUse()]);
  $('libStore').textContent = `${songs.length} song${songs.length === 1 ? '' : 's'} · ${mb(use.used)} used` + (use.persisted ? ' · kept safe on this phone' : standalone ? '' : ' · add to your Home Screen so Safari keeps them');
  $('libSongs').innerHTML = songs.length ? songs.map(m => { const st = m.stems.filter(Boolean) as Store.StemMeta[], d = Math.max(0, ...st.map(x => x.dur));
    return `<div class="lib-item" data-id="${m.id}"><div class="t">${esc(m.title || 'Untitled')}${m.id === A.song.id ? '<small>OPEN</small>' : ''}</div>
      <div class="s">${st.length} parts · ${fmt(d)} · ${m.bpm} BPM · ${m.source === 'split' ? 'split' : m.source === 'demo' ? 'demo' : 'files'} · ${day(m.played || m.created)}</div>
      <div class="b"><button class="go1" data-act="open">Open</button><button data-act="export">Export</button><button data-act="del">Delete</button></div></div>`; }).join('')
    : '<p class="note">No songs yet. Load tracks or split a song and it will be kept here.</p>';
  $('libSongs').querySelectorAll<HTMLElement>('[data-act]').forEach(b => b.addEventListener('click', async () => {
    const id = b.closest<HTMLElement>('.lib-item')!.dataset.id!, m = songs.find(x => x.id === id)!;
    if (b.dataset.act === 'open') { closeSheets(); await openSong(m); return; }
    if (b.dataset.act === 'export') { b.textContent = '…'; try { const z = await Store.exportSong(id === A.song.id ? songMeta() : m); await shareBlob(z, `${fileSafe(m.title)}.dubstudio.zip`); } catch (e) { toast('Could not export: ' + (e as Error).message); } b.textContent = 'Export'; return; }
    if (b.dataset.act === 'del' && confirmTap('song' + id, b, 'Delete')) { if (id === A.song.id) newSong(4, '', ''); await Store.deleteSong(id); redraw(); openLibrary(); }
  }));
  const takes = A.song.id ? await Store.listTakes(A.song.id) : [];
  $('libTakesH').textContent = A.song.id ? `Takes of ${A.song.title || 'this song'}` : 'Takes';
  $('libTakes').innerHTML = takes.length ? takes.map((t, i) => `<div class="lib-item" data-t="${i}"><div class="s">Take ${takes.length - i} · ${mb(t.size)} · ${day(t.when)} ${new Date(t.when).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</div>
      <div class="b"><button class="go1" data-tact="play">Play</button><button data-tact="share">Share</button><button data-tact="del">Delete</button></div></div>`).join('')
    : '<p class="note">Press Rec on the mixer to record a take of this song.</p>';
  $('libTakes').querySelectorAll<HTMLElement>('[data-tact]').forEach(b => b.addEventListener('click', async () => {
    const box = b.closest<HTMLElement>('.lib-item')!, t = takes[+box.dataset.t!], f = await Store.takeFile(t); if (!f) return;
    if (b.dataset.tact === 'play') { box.querySelector('audio')?.remove(); const a = document.createElement('audio'); a.controls = true; a.setAttribute('playsinline', ''); a.src = URL.createObjectURL(f); box.appendChild(a); a.play().catch(() => {}); }
    if (b.dataset.tact === 'share') shareBlob(f, `${fileSafe(A.song.title)}-take-${takes.length - +box.dataset.t!}.${t.name.split('.').pop()}`);
    if (b.dataset.tact === 'del' && confirmTap('take' + t.name, b, 'Delete')) { await Store.deleteTake(t); openLibrary(); }
  }));
}
$('libBtn').addEventListener('click', openLibrary);
$('libImport').addEventListener('click', () => ($('importFile') as HTMLInputElement).click());
$('importFile').addEventListener('change', async e => { const i = e.target as HTMLInputElement, f = i.files?.[0]; i.value = ''; if (!f) return;
  toast('Importing…', 60000); try { const m = await Store.importSong(f); toast(`Imported ${m.title}`); openLibrary(); } catch (err) { toast('Could not import: ' + (err as Error).message, 5000); } });

// ---------- cues: hold Loop to drop one at the playhead; taps on the line snap to them ----------
function drawCues() {
  const d = A.dur() || 1, pr = $('prog'); pr.querySelectorAll('.cue').forEach(x => x.remove());
  for (const c of A.song.cues) { const i = document.createElement('i'); i.className = 'cue'; i.style.left = c / d * 100 + '%'; pr.appendChild(i); }
  const W = 160, pk = Array.from({ length: W }, (_, x) => Math.max(0, ...A.song.stems.slice(0, A.song.count).map(s => s.meta ? s.meta.peaks[Math.floor(x * s.meta.peaks.length / W)] * (s.meta.dur / d) : 0)));
  $('progWave').innerHTML = A.dur() ? wave(pk, 14) : '';
}
draws.push(drawCues);

// ---------- sheets ----------
function openSheet(id: string) { $(id).hidden = false; }
function closeSheets() { document.querySelectorAll<HTMLElement>('.sheetbg').forEach(s => { s.hidden = true; }); }
document.querySelectorAll<HTMLElement>('.sheetbg').forEach(s => s.addEventListener('click', e => { if (e.target === s || (e.target as Element).closest('[data-x]')) s.hidden = true; }));
control($('helpBtn'), { undoable: false, up: () => openSheet('helpSheet') });

// ---------- start screen ----------
// Continue: the song on the desk (back to it as it is), or the last one played (opened from storage)
let contSong: Store.SongMeta | null = null;
async function refreshContinue() {
  const b = $('goLast'), cur = A.song.id && A.song.stems.some(st => st.meta);
  if (cur) { contSong = null; b.hidden = false; b.querySelector('span')!.textContent = A.song.title || 'Untitled'; }
  else { let last = ''; try { last = localStorage.getItem('dub-studio-last') || ''; } catch { /* */ }
    contSong = last ? await Store.loadMeta(last) : null; b.hidden = !contSong; if (contSong) b.querySelector('span')!.textContent = contSong.title || 'Untitled'; }
  $('goDemo').classList.toggle('alt', !$('goLast').hidden);   // with a song to go back to, Continue is the main button
  Store.listSongs().then(l => { $('goLib').hidden = !l.length; });
}
$('goLast').addEventListener('click', async () => { A.ensure(); go(); if (contSong) { const m = contSong; contSong = null; await openSong(m); playToggle(); } });
refreshContinue();
// the logo: back to the main menu (the song keeps playing until you choose something else)
function showMenu() { closeSheets(); pages.forEach(x => { $(x).hidden = true; }); if (tour.on) tour.close(); refreshContinue(); $('start').hidden = false; }
document.querySelectorAll<HTMLElement>('.brand').forEach(b => { b.setAttribute('role', 'button'); b.setAttribute('aria-label', 'Main menu'); control(b, { undoable: false, up: () => { tick(); showMenu(); } }); });
const standalone = matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone;
if (/iPhone|iPad|iPod/.test(navigator.userAgent) && !standalone) $('install').hidden = false;
const go = () => { $('start').hidden = true; requestAnimationFrame(redraw); firstTour(); };
$('goDemo').addEventListener('click', async () => { A.ensure(); go(); await loadDemo(); playToggle(); });
$('goLoad').addEventListener('click', () => { A.ensure(); ($('startFiles') as HTMLInputElement).click(); });
$('goSplit').addEventListener('click', () => { A.ensure(); go(); openSplit(); });
$('goLib').addEventListener('click', () => { A.ensure(); go(); openLibrary(); });
$('startFiles').addEventListener('change', e => { const i = e.target as HTMLInputElement; const fs = [...(i.files || [])]; i.value = ''; if (fs.length) { go(); loadMany(fs); } });
if (navigator.storage?.persist) navigator.storage.persisted().then(p => { if (!p && standalone) navigator.storage.persist(); }).catch(() => {});

function fit() { const big = innerWidth >= 700 && innerHeight >= 700, z = big ? Math.max(1, Math.min(1.6, innerHeight / 820, innerWidth / 480)) : 1; document.documentElement.style.setProperty('--z', z.toFixed(3)); requestAnimationFrame(redraw); }
fit(); addEventListener('resize', fit);
redraw(); icon(); drawLoop(); save();
(window as unknown as { __dub: unknown }).__dub = { meters: A.meters, pan: A.panOf };   // read by the end-to-end tests
// offline: the service worker caches the app as it loads (production builds only)
if (import.meta.env.PROD && 'serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
