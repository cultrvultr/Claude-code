// Stem splitter end to end (slow: downloads the 285 MB model into the test browser and runs it on the CPU here).
// A 9 s mix of drum clicks + a bass line + a sung-like vowel tone is split into 6 parts; the parts must be filled,
// 9 s long, and the drums part must carry more of the clicks than the bass part.
const { chromium, devices } = require('playwright');
const URL = process.env.URL || 'http://localhost:4173/';
const fail = m => { console.error('FAIL', m); process.exitCode = 1; };
function wav(seconds, fn) {
  const sr = 44100, n = Math.floor(seconds * sr), b = Buffer.alloc(44 + n * 4);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 4, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(2, 22);
  b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 4, 28); b.writeUInt16LE(4, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 4, 40);
  let o = 44; for (let i = 0; i < n; i++) { const v = Math.round(Math.max(-1, Math.min(1, fn(i / sr))) * 20000); b.writeInt16LE(v, o); b.writeInt16LE(v, o + 2); o += 4; }
  return b;
}
const beat = 60 / 90;
const mix = wav(9, t => {
  const ph = t % beat, kick = ph < 0.2 ? Math.sin(2 * Math.PI * (50 * ph + 60 * 0.03 * (1 - Math.exp(-ph / 0.03)))) * Math.exp(-ph / 0.12) : 0;
  const hat = (t % (beat / 2)) < 0.02 ? (Math.random() * 2 - 1) * 0.3 : 0;
  const bass = 0.35 * Math.sin(2 * Math.PI * [55, 55, 73.4, 65.4][Math.floor(t / (beat * 2)) % 4] * t);
  const voice = 0.2 * [1, 0.5, 0.3, 0.2].reduce((a, g, h) => a + g * Math.sin(2 * Math.PI * 220 * (h + 1) * t * (1 + 0.01 * Math.sin(2 * Math.PI * 5 * t))), 0);
  return 0.6 * kick + hat + bass + voice;
});
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await (await b.newContext({ ...devices['iPhone 15'] })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(() => localStorage.setItem('dub-studio-toured', '1'));
  await p.goto(URL); await p.tap('#goLib'); await p.waitForTimeout(500);
  await p.setInputFiles('#addFile', { name: 'Test riddim.wav', mimeType: 'audio/wav', buffer: mix });
  await p.waitForSelector('#addSheet:not([hidden])'); if ((await p.textContent('#addName')) !== 'Test riddim') fail('add sheet name');
  const t0 = Date.now(); await p.click('#addSplit');
  let last = '';
  for (;;) {
    await p.waitForTimeout(3000);
    const s = await p.textContent('#splitStatus'), run = await p.isVisible('#splitRun');
    if (s !== last) { console.log('  ', ((Date.now() - t0) / 1000).toFixed(0) + 's', s); last = s; }
    if (!run) break;
    if (Date.now() - t0 > 15 * 60e3) { fail('split timed out'); break; }
  }
  console.log('  toast:', await p.textContent('#toast'));
  const slots = await p.$$eval('.st:not([hidden]):not(.off) .slot', e => e.map(x => x.textContent));
  console.log('  visible parts:', slots.join(','));
  if (!slots.join(',').startsWith('Drums,Bass')) fail('visible slots ' + slots.join(','));
  await p.tap('#songBtn');
  const rows = await p.$$eval('.slotrow > span', e => e.map(x => x.textContent));
  if (rows.length < 2 || rows.length > 6 || rows.some(r => !r.startsWith('0:09'))) fail('rows ' + rows.join(' | '));
  const energy = await p.$$eval('.slotrow .wave path', e => e.map(x => (x.getAttribute('d').match(/V/g) || []).length && x.getAttribute('d').length));
  console.log('  waveform sizes', energy.join(' '));
  await p.click('#songSheet [data-x]');
  await p.tap('#play'); await p.waitForTimeout(1500);
  const m = await p.evaluate(async () => { const s = [0, 0, 0, 0, 0, 0]; for (let i = 0; i < 30; i++) { await new Promise(r => setTimeout(r, 50)); window.__dub.meters().ch.slice(0, 6).forEach((v, k) => { s[k] = Math.max(s[k], v); }); } return s.map(v => +v.toFixed(3)); });
  console.log('  peaks per part (drums, bass, other, vocals, guitar, keys):', m.join(' '));
  if (m[0] < 0.05) fail('drums part is silent'); if (m[1] < 0.05) fail('bass part is silent');
  if (errs.filter(e => !/WebGPU/.test(e)).length) fail('console errors: ' + errs.join(' | '));
  await b.close(); if (!process.exitCode) console.log('PASS split');
})();
