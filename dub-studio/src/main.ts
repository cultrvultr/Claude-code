import '@fontsource/shrikhand/latin-400.css';
import '@fontsource/courier-prime/latin-400.css';
import '@fontsource/courier-prime/latin-700.css';
import './styles.css';
import { S, DIVS, VLC, VHC, save, popUndo, canUndo, resetMix, watchUndo, gestureStart, gestureEnd, storeSnap, recallSnap, hasSnap, lastSnap } from './state';
import { makeTour, MIXER_TOUR } from './ui/tour';
import * as A from './audio/engine';
import { SPECS } from './audio/irs';
import { renderDemo } from './audio/demo';
import * as Store from './loader/store';
import * as Split from './split/split';
import { control, guardPage, clamp, xFrac } from './ui/control';
import { knob, fader, bar, seg } from './ui/widgets';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
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
const muteDraws: (() => void)[] = [], faderDraws: (() => void)[] = [];
document.querySelectorAll<HTMLElement>('.st').forEach(st => {
  const c = +st.dataset.c!, q = S.ch[c];
  const [kc, ke, kv] = [...st.querySelectorAll<SVGSVGElement>('.kn')];
  draws.push(knob(kc, { get: () => (q.cut + 10) / 20, set: v => { q.cut = Math.round(v * 20) - 10; A.applyChan(c, 'cut'); }, home: 0.5, bi: true, steps: 20, label: v => cutLab(Math.round(v * 20) - 10), sens: 160 }));
  draws.push(knob(ke, { get: () => q.echo, set: v => { q.echo = v; A.applyChan(c, 'echo'); }, home: 0 }));
  draws.push(knob(kv, { get: () => q.verb, set: v => { q.verb = v; A.applyChan(c, 'verb'); }, home: 0 }));
  const fd = st.querySelector<HTMLElement>('.fd')!;
  const df = fader(fd, () => q.fader, v => { q.fader = v; A.applyChan(c, 'fader'); }); draws.push(df); faderDraws.push(df); addEventListener('resize', df);
  meterEls.push(st.querySelector<HTMLElement>('.mt i')!);
  const th = st.querySelector<HTMLElement>('.throw')!;
  control(th, { undoable: false, down: async () => { await A.ensure(); A.setThrow(c, true); th.classList.add('on'); }, up: () => { A.setThrow(c, false); th.classList.remove('on'); } });
  // Mute: tap toggles mute; a long press toggles solo (green)
  const mu = st.querySelector<HTMLElement>('.mute')!;
  const dm = () => { mu.classList.toggle('on', q.mute && !q.solo); mu.classList.toggle('solo', q.solo); mu.textContent = q.solo ? 'Solo' : 'Mute'; };
  draws.push(dm); muteDraws.push(dm);
  control(mu, { long: () => { q.solo = !q.solo; A.applySolo(); muteDraws.forEach(f => f()); }, longMs: 400,
    up: s => { if (s.long) return; if (q.solo) { q.solo = false; A.applySolo(); } else { q.mute = !q.mute; A.applyChan(c, 'mute'); } muteDraws.forEach(f => f()); } });
  const slot = st.querySelector<HTMLElement>('.slot')!;
  draws.push(() => { const s = A.song.stems[c]; slot.textContent = s.status ? '…' : s.name; slot.classList.toggle('empty', !s.meta); st.hidden = c >= A.song.count; });
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
  requestAnimationFrame(() => faderDraws.forEach(f => f()));
}
$('banks').querySelectorAll<HTMLElement>('i').forEach((b, i) => control(b, { undoable: false, down: () => { bank = i; drawBank(); requestAnimationFrame(redraw); } }));
draws.push(drawBank); addEventListener('resize', drawBank);

// ---------- Siren and Synare pads ----------
const strike = (u: number) => Math.pow(0.31 + 0.69 * u, 2);
const pSir = $('pSir'), pSyn = $('pSyn');
const onKnob = (e: PointerEvent) => !!(e.target as Element).closest?.('.lvk');
function sirenUI() { const on = A.sirenOn(); pSir.classList.toggle('on', on); $('sTrig').classList.toggle('on', on); }
control(pSir, { undoable: false,
  down: async (s, e) => { if (onKnob(e)) { s.skip = true; return; } await A.ensure(); A.siren(S.m.sir.momentary ? true : !A.sirenOn()); sirenUI(); },
  up: s => { if (!s.skip && S.m.sir.momentary) { A.siren(false); sirenUI(); } } });
control(pSyn, { undoable: false, down: async (s, e) => {
  if (onKnob(e)) return; await A.ensure();
  const u = clamp(1 - (e.clientY - s.r.top) / s.r.height, 0, 1); A.hit(strike(0.55 + 0.45 * u));
  pSyn.classList.add('on'); setTimeout(() => pSyn.classList.remove('on'), 160); } });
document.querySelectorAll<SVGSVGElement>('.lvk').forEach(k => {
  k.addEventListener('pointerdown', e => e.stopPropagation());
  const sir = k.dataset.l === 'sir';
  draws.push(knob(k, { get: () => sir ? S.m.sir.vol : S.m.syn.level, set: v => { if (sir) S.m.sir.vol = v; else S.m.syn.level = v; A.applyEcho(); }, home: sir ? 0.7 : 0.5, sens: 160 }));
});

// ---------- the echo card ----------
const echoChange = () => { A.applyEcho(); drawEcho(); drawFx(); };
function drawEcho() {
  $('rDly').textContent = S.m.sync ? DIVS[S.m.div][0] : Math.round(A.dlyMs()) + 'ms';
  $('rRep').textContent = S.m.rep.toFixed(1); $('rRet').textContent = String(Math.round(S.m.ret * 100));
  $('bRep').classList.toggle('hot', S.m.rep > 9); $('bpm').textContent = A.song.bpm.toFixed(0);
  dDly(); dRep(); dRet();
}
const dDly = bar($('bDly'), { get: () => S.m.sync ? S.m.div / 8 : S.m.dly, set: v => { if (S.m.sync) S.m.div = Math.round(v * 8); else S.m.dly = v; echoChange(); } });
const dRep = bar($('bRep'), { relative: true, get: () => S.m.rep / 10, set: v => { S.m.rep = v * 10; echoChange(); } });   // relative: a tap never throws it into the runaway
const dRet = bar($('bRet'), { get: () => S.m.ret / 1.5, set: v => { S.m.ret = v * 1.5; echoChange(); }, snap: 1 / 1.5 });
draws.push(drawEcho);

// tap tempo: the average of the last taps, reset after 2 s
let taps: number[] = [];
control($('tapBtn'), { undoable: false, down: () => {
  const n = performance.now(); if (taps.length && n - taps[taps.length - 1] > 2000) taps = []; taps.push(n); taps = taps.slice(-6);
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
  xyDot.style.left = (S.m.syn.x * 100) + '%'; xyDot.style.top = (100 - Math.sqrt((S.m.syn.dec - 0.02) / 1.98) * 100) + '%';
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
control($('play'), { undoable: false, down: playToggle });
control($('prog'), { undoable: false, down: (s, e) => { scrub = xFrac(s, e) * A.dur(); }, move: (s, e) => { scrub = xFrac(s, e) * A.dur(); },
  up: () => { if (scrub !== null) { const d = A.dur(), near = A.song.cues.find(c => Math.abs(c - scrub!) < d * 0.04); A.seek(near ?? scrub); } scrub = null; } });
addEventListener('keydown', e => { if (e.code !== 'Space' || !$('start').hidden || (e.target as Element).closest?.('input, select, textarea, button')) return; e.preventDefault(); if (!e.repeat) playToggle(); });

// loop: 4 bars from the bar you are in
function drawLoop() { const b = $('band'), d = A.dur() || 1; b.hidden = !A.loop.on; b.style.left = A.loop.a / d * 100 + '%'; b.style.width = (A.loop.b - A.loop.a) / d * 100 + '%'; $('loopBtn').classList.toggle('on', A.loop.on); $('loopBtn').setAttribute('aria-pressed', String(A.loop.on)); }
control($('loopBtn'), { undoable: false, longMs: 450,
  long: () => { if (!A.dur()) return; const t = Math.round(A.now() * 100) / 100; A.song.cues = [...A.song.cues.filter(c => Math.abs(c - t) > 0.5), t].sort((a, b) => a - b).slice(-12); drawCues(); saveSong(); toast(`Cue at ${fmt(t)}. Tap near it on the line to jump there.`); },
  up: s => { if (s.long) return;
  if (!A.dur()) return;
  if (A.loop.on) A.loop.on = false;
  else { const barS = 240 / A.song.bpm, t = A.now(); A.loop.a = Math.floor(t / barS) * barS; A.loop.b = Math.min(A.dur(), A.loop.a + 4 * barS); A.loop.on = true; }
  A.relooped(); drawLoop(); } });

// undo and reset
const drawUndo = () => { ($('undoBtn') as HTMLButtonElement).disabled = !canUndo(); };
watchUndo(drawUndo); drawUndo();
const applyAll = () => { A.applySolo(); for (let c = 0; c < A.N; c++) for (const p of ['cut', 'fader', 'mute', 'echo', 'verb'] as const) A.applyChan(c, p); A.applyEcho(); A.applyVerb(); A.setVerbIR(); redraw(); };
control($('undoBtn'), { undoable: false, down: () => { if (popUndo()) applyAll(); } });
control($('resetBtn'), { undoable: false, long: () => { resetMix(); applyAll(); toast('Mix reset'); }, longMs: 500, up: s => { if (!s.long) toast('Hold Reset to clear the channels'); } });

// record
let recUrl = '', recBlob: Blob | null = null;
control($('recBtn'), { undoable: false, down: async () => {
  await A.ensure();
  if (A.recording()) {
    const b = await A.recStop(); $('recBtn').classList.remove('on');
    if (b) { recBlob = b; if (recUrl) URL.revokeObjectURL(recUrl); recUrl = URL.createObjectURL(b); ($('recAudio') as HTMLAudioElement).src = recUrl; openSheet('recSheet'); }
  } else if (A.recStart()) { $('recBtn').classList.add('on'); if (!A.playing) playToggle(); toast('Recording'); }
  else toast('Recording is not supported in this browser'); } });
control($('recShare'), { undoable: false, up: async () => {
  if (!recBlob) return; const ext = recBlob.type.includes('mp4') ? 'm4a' : 'webm';
  const f = new File([recBlob], `${(A.song.title || 'dub').replace(/[^\w-]+/g, '-')}-dub.${ext}`, { type: recBlob.type });
  if (navigator.canShare?.({ files: [f] })) { try { await navigator.share({ files: [f], title: 'My dub' }); } catch { /* cancelled */ } }
  else { const a = document.createElement('a'); a.href = recUrl; a.download = f.name; a.click(); } } });

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
let peakHold = 0;
function frame() {
  requestAnimationFrame(frame);
  if (A.ended()) { A.stop(); A.rewind(); icon(); letSleep(); media(); }
  const d = A.dur(), t = scrub ?? A.now();
  $('time').textContent = fmt(t) + ' / ' + fmt(d); $('pos').style.width = (d ? t / d * 100 : 0) + '%';
  const m = A.meters();
  if (m) { m.ch.forEach((p, i) => { const db = 20 * Math.log10(p + 1e-6), h = clamp((db + 48) / 48, 0, 1); meterEls[i].style.height = h * 100 + '%'; meterEls[i].classList.toggle('clip', p > 0.98); });
    peakHold = Math.max(m.master, peakHold * 0.95); document.querySelector('.brand')!.classList.toggle('clip', peakHold > 0.99); }
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
    stems: A.song.stems.slice(0, A.song.count).map(st => st.meta ? { ...st.meta, name: st.name } : null), created: created, played: Date.now() };
}
let created = Date.now();
function saveSong() { if (!A.song.id) return; clearTimeout(metaT); metaT = window.setTimeout(() => { Store.saveMeta(songMeta()); try { localStorage.setItem('dub-studio-last', A.song.id); } catch { /* */ } }, 300); }

// file names to slots: each role has its home channel (see DEFAULT_NAMES)
const ROLE: [RegExp, number][] = [[/drum|perc|beat|kit/i, 0], [/bass/i, 1], [/other|inst|music|backing/i, 2], [/vox|vocal|voice|sing|acap/i, 3],
  [/guit|gtr/i, 4], [/key|piano|organ|synth|pad/i, 5], [/horn|brass|sax|trump|tromb|flute|melod/i, 6], [/fx|sfx|effect|noise/i, 7]];
const roleOf = (f: File) => ROLE.find(([r]) => r.test(f.name))?.[1] ?? -1;
const base = (f: File) => f.name.replace(/\.[^.]+$/, '');
const status = (c: number, t?: string) => { A.song.stems[c].status = t; slotsDraw(); redraw(); };
const onsetsBy = new Map<number, { on: Float32Array; hop: number }>();

// one stem: decode, hand to the worker (pieces, peaks, loudness, onsets), keep its metadata
async function stemFrom(c: number, name: string, channels: () => Promise<Float32Array[]>, file?: string) {
  status(c, 'Decoding…');
  const data = await channels();
  status(c, 'Saving…');
  const r = await Store.pieceStem(A.song.id, c, A.song.sr, data);
  A.song.stems[c].meta = { name, n: r.n, ch: r.ch, dur: r.dur, peaks: r.peaks, ms: r.ms, offset: 0, file };
  A.song.stems[c].name = name; onsetsBy.set(c, { on: r.onsets, hop: r.hop });
  status(c, undefined);
}
const fromFile = (f: File) => async () => { const b = await A.decodeFile(f); const out: Float32Array[] = []; for (let k = 0; k < Math.min(2, b.numberOfChannels); k++) out.push(new Float32Array(b.getChannelData(k))); return out; };
function finishSong() {
  // tempo: from the drums if there are any, else the first part
  if (A.song.bpmAuto) { const src = onsetsBy.get(0) || onsetsBy.values().next().value; const bpm = src ? Store.detectBpm(src.on, A.song.sr, src.hop) : null; if (bpm) { A.song.bpm = bpm; echoChange(); } }
  A.setSongGain(Store.songGain(A.song.stems.slice(0, A.song.count).map(s => s.meta?.ms || 0)));
  onsetsBy.clear(); saveSong(); redraw(); slotsDraw(); drawLoop(); drawCues(); media();
}
function newSong(count: number, title: string, id = Store.newSongId()) {
  if (A.playing) { A.stop(); icon(); letSleep(); }
  A.loop.on = false; A.songChanged(); A.seek(0);
  Object.assign(A.song, { id, title, count, bpmAuto: true, cues: [], gain: 1, sr: A.ctx ? A.ctx.sampleRate : 48000 }); created = Date.now();
  A.song.stems.forEach((s, i) => { s.meta = null; s.status = undefined; s.name = A.DEFAULT_NAMES[i]; });
  S.ch.forEach(c => { c.solo = false; c.mute = false; }); A.applySolo(); for (let c = 0; c < A.N; c++) A.applyChan(c, 'mute');
}
async function loadInto(c: number, f: File) {
  await A.ensure();
  if (!A.song.id) newSong(Math.max(4, c + 1), base(f));
  const wasPlaying = A.playing, t = A.now(); if (wasPlaying) A.stop();
  const r = roleOf(f), name = r >= 0 ? A.DEFAULT_NAMES[r] : base(f).slice(0, 10);
  try { await stemFrom(c, name, fromFile(f), f.name); A.songChanged(); }
  catch { status(c, undefined); toast(`Could not read ${f.name}. Protected (Apple Music) or unsupported file.`, 4500); }
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
    const r = roleOf(f);
    try { await stemFrom(i, r >= 0 ? A.DEFAULT_NAMES[r] : base(f).slice(0, 10), fromFile(f), f.name); ok++; }
    catch { status(i, undefined); toast(`Could not read ${f.name}. Protected (Apple Music) or unsupported file.`, 4500); } }
  finishSong(); toast(`Loaded ${ok} track${ok === 1 ? '' : 's'}${A.song.bpmAuto ? ` · ${A.song.bpm} BPM` : ''}`);
}
function commonName(fs: File[]) { const n = fs.map(base); let p = n[0] || ''; for (const x of n) while (!x.startsWith(p)) p = p.slice(0, -1); p = p.replace(/[\s_\-.(]+$/, ''); return p.length > 2 ? p : 'My song'; }
async function openSong(m: Store.SongMeta) {
  await A.ensure();
  newSong(Math.max(4, m.stems.length), m.title, m.id);
  Object.assign(A.song, { bpm: m.bpm, bpmAuto: m.bpmAuto ?? false, sr: m.sr, cues: m.cues || [] }); created = m.created;
  m.stems.forEach((st, i) => { if (st) { A.song.stems[i].meta = st; A.song.stems[i].name = st.name; } });
  A.setSongGain(m.gain); echoChange(); saveSong(); redraw(); slotsDraw(); drawLoop(); drawCues(); media();
}
async function loadDemo() {
  await A.ensure();
  const old = await Store.loadMeta('demo');
  if (old && old.sr === A.ctx!.sampleRate && (!Store.inMemory('demo') ? await Store.readPiece('demo', 0, 0) : true)) { await openSong(old); return; }   // made before: open it
  toast('Mixing the demo riddim…'); await new Promise(r => setTimeout(r, 30));
  await Store.deleteSong('demo');
  const d = renderDemo(A.ctx!.sampleRate);
  newSong(4, d.title, 'demo'); A.song.bpm = d.bpm; A.song.bpmAuto = false;
  for (let i = 0; i < 4; i++) await stemFrom(i, d.names[i], async () => [d.data[i]]);
  finishSong();
}

let pickSlot = 0;
function pickOne(c: number) { pickSlot = c; ($('oneFile') as HTMLInputElement).click(); }
$('oneFile').addEventListener('change', e => { const i = e.target as HTMLInputElement; const f = i.files?.[0]; if (f) loadInto(pickSlot, f); i.value = ''; });
$('allFiles').addEventListener('change', e => { const i = e.target as HTMLInputElement; loadMany([...(i.files || [])]); i.value = ''; });
control($('loadAll'), { undoable: false, up: () => ($('allFiles') as HTMLInputElement).click() });
control($('loadDemo'), { undoable: false, up: () => { closeSheets(); loadDemo(); } });

const wave = (peaks: number[], h = 22) => { const W = peaks.length; return `<svg class="wave" viewBox="0 0 ${W} ${h}" preserveAspectRatio="none"><path d="${peaks.map((p, x) => `M${x} ${(h / 2 - p * h / 2).toFixed(1)}V${(h / 2 + p * h / 2).toFixed(1)}`).join('')}"/></svg>`; };
const esc = (t: string) => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
function slotsDraw() {
  ($('fTitle') as HTMLInputElement).value = A.song.title; ($('fBpm') as HTMLInputElement).value = String(A.song.bpm);
  $('bpmNote').textContent = A.song.bpmAuto && A.song.id ? 'Found from the drums. Tap Tap on the mixer, or type, to change it.' : '';
  $('slots').innerHTML = A.song.stems.slice(0, A.song.count).map((s, i) => `<div class="slotrow">
      <input data-i="${i}" value="${esc(s.name)}" maxlength="12" aria-label="Track ${i + 1} name">
      <span>${s.status || (s.meta ? fmt(s.meta.dur) + (s.meta.ch === 1 ? ' mono' : '') : 'empty')}</span><button data-load="${i}">Load</button>
      ${s.meta ? `<div class="wv">${wave(s.meta.peaks)}<label>Nudge <input type="number" data-off="${i}" value="${s.meta.offset}" step="5" min="-2000" max="2000" inputmode="numeric"> ms</label></div>` : ''}</div>`).join('')
    + `<div class="slotadd">${A.song.count < A.N ? '<button id="addTrack">+ Add track</button>' : ''}${A.song.count > 4 ? '<button id="delTrack">− Remove last</button>' : ''}${A.song.cues.length ? '<button id="clearCues">Clear cues</button>' : ''}</div>`;
  $('slots').querySelectorAll<HTMLInputElement>('input[data-i]').forEach(inp => inp.addEventListener('input', () => { A.song.stems[+inp.dataset.i!].name = inp.value || '—'; redraw(); saveSong(); }));
  $('slots').querySelectorAll<HTMLInputElement>('input[data-off]').forEach(inp => inp.addEventListener('change', () => { const m = A.song.stems[+inp.dataset.off!].meta; if (!m) return;
    m.offset = clamp(Math.round(+inp.value || 0), -2000, 2000); inp.value = String(m.offset); A.songChanged(); if (A.playing) A.play(A.now()); saveSong(); }));
  $('slots').querySelectorAll<HTMLElement>('[data-load]').forEach(b => b.addEventListener('click', () => pickOne(+b.dataset.load!)));
  document.getElementById('addTrack')?.addEventListener('click', () => { A.song.count++; bank = Math.floor((A.song.count - 1) / 4); slotsDraw(); redraw(); saveSong(); });
  document.getElementById('delTrack')?.addEventListener('click', () => { const i = --A.song.count; const st = A.song.stems[i]; st.meta = null; st.name = A.DEFAULT_NAMES[i];
    S.ch[i].solo = false; A.applySolo(); if (A.playing) A.play(A.now()); slotsDraw(); redraw(); saveSong(); });
  document.getElementById('clearCues')?.addEventListener('click', () => { A.song.cues = []; drawCues(); slotsDraw(); saveSong(); });
}
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
      if (p.stage === 'decode') { fill.style.width = '2%'; st.textContent = 'Reading the song…'; }
      if (p.stage === 'model') { fill.style.width = (p.done / p.total * 100).toFixed(1) + '%'; st.textContent = `Downloading the model: ${Math.round(p.done / 1e6)} of ${Math.round(p.total / 1e6)} MB`; }
      if (p.stage === 'load') { fill.style.width = '100%'; st.textContent = 'Starting the splitter…'; }
      if (p.stage === 'split') { fill.style.width = (p.done / p.total * 100).toFixed(1) + '%'; st.textContent = `Splitting: ${Math.round(p.done / p.total * 100)}%` + (p.eta !== undefined ? ` · about ${mmss(p.eta)} left` : '') + (p.ep === 'wasm' ? ' (no GPU: slower)' : ''); }
    });
    if (A.song.id !== id) return;
    A.song.sr = 44100; A.song.title = base(f);
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
{ let last = ''; try { last = localStorage.getItem('dub-studio-last') || ''; } catch { /* */ }
  if (last) Store.loadMeta(last).then(m => { if (!m) return; const b = $('goLast'); b.hidden = false; b.querySelector('span')!.textContent = m.title || 'Untitled';
    b.addEventListener('click', async () => { A.ensure(); go(); await openSong(m); playToggle(); }); }); }
const standalone = matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone;
if (/iPhone|iPad|iPod/.test(navigator.userAgent) && !standalone) $('install').hidden = false;
const go = () => { $('start').hidden = true; requestAnimationFrame(redraw); firstTour(); };
$('goDemo').addEventListener('click', async () => { A.ensure(); go(); await loadDemo(); playToggle(); });
$('goLoad').addEventListener('click', () => { A.ensure(); ($('startFiles') as HTMLInputElement).click(); });
$('goSplit').addEventListener('click', () => { A.ensure(); go(); openSplit(); });
$('startFiles').addEventListener('change', e => { const i = e.target as HTMLInputElement; const fs = [...(i.files || [])]; i.value = ''; if (fs.length) { go(); loadMany(fs); } });
if (navigator.storage?.persist) navigator.storage.persisted().then(p => { if (!p && standalone) navigator.storage.persist(); }).catch(() => {});

function fit() { const big = innerWidth >= 700 && innerHeight >= 700, z = big ? Math.max(1, Math.min(1.6, innerHeight / 820, innerWidth / 480)) : 1; document.documentElement.style.setProperty('--z', z.toFixed(3)); requestAnimationFrame(redraw); }
fit(); addEventListener('resize', fit);
redraw(); icon(); drawLoop(); save();
(window as unknown as { __dub: unknown }).__dub = { meters: A.meters };   // read by the end-to-end tests
// offline: the service worker caches the app as it loads (production builds only)
if (import.meta.env.PROD && 'serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
