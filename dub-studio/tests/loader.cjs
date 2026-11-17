// Track loader: 3 files (drum clicks at 92 BPM, a mono bass saved as stereo, true-stereo keys), 25 s each.
// Checks tempo detection, mono detection, waveforms, playing across a piece boundary, the end, loop wrap, cues,
// and opening the song again from storage after a reload.
const { chromium, devices } = require('playwright');
const URL = process.env.URL || 'http://localhost:4173/';
const fail = m => { console.error('FAIL', m); process.exitCode = 1; };
function wav(seconds, ch, fn) {
  const sr = 44100, n = Math.floor(seconds * sr), b = Buffer.alloc(44 + n * 2 * ch);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2 * ch, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(ch, 22);
  b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2 * ch, 28); b.writeUInt16LE(2 * ch, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2 * ch, 40);
  let o = 44; for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, fn(i / sr, c))) * 20000), o); o += 2; }
  return b;
}
const beat = 60 / 92;
const files = [
  { name: 'Track drums.wav', buffer: wav(25, 1, t => { const ph = t % beat; return ph < 0.03 ? (Math.random() * 2 - 1) * (1 - ph / 0.03) : 0; }) },
  { name: 'Track bass.wav', buffer: wav(25, 2, t => 0.5 * Math.sin(2 * Math.PI * 55 * t)) },
  { name: 'Track keys.wav', buffer: wav(25, 2, (t, c) => 0.3 * Math.sin(2 * Math.PI * (c ? 450 : 300) * t)) },
];
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ ...devices['iPhone 15'] }), p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(() => localStorage.setItem('dub-studio-toured', '1'));
  await p.goto(URL);
  await p.setInputFiles('#startFiles', files.map(f => ({ ...f, mimeType: 'audio/wav' })));
  await p.waitForFunction(() => /BPM/.test(document.getElementById('toast').textContent), null, { timeout: 30000 });
  const bpm = +(await p.textContent('#bpm'));
  if (Math.abs(bpm - 92) > 1.5) fail('tempo found ' + bpm + ', expected 92');
  await p.tap('#songBtn');
  const rows = await p.$$eval('.slotrow > span', e => e.map(x => x.textContent));   // drums, bass, keys (fills slot 3), empty
  if (!rows[0].includes('mono') || !rows[1].includes('mono') || rows[2].includes('mono') || !rows[2].startsWith('0:25')) fail('rows ' + rows.join(' | '));
  if ((await p.$$('.slotrow .wave')).length !== 3) fail('expected 3 waveforms');
  await p.click('#songSheet [data-x]');
  const peak = () => p.evaluate(async () => { let x = 0; for (let i = 0; i < 10; i++) { await new Promise(r => setTimeout(r, 50)); x = Math.max(x, window.__dub.meters().master); } return x; });
  // play from 18 s across the 20 s piece boundary
  const pb = await p.locator('#prog').boundingBox();
  await p.mouse.click(pb.x + pb.width * 18 / 25, pb.y + 10);
  await p.tap('#play'); await p.waitForTimeout(2600);
  const t1 = await p.textContent('#time'); if (!/^0:2[01]/.test(t1)) fail('time after crossing 20 s is ' + t1);
  if (await peak() < 0.05) fail('silent after the piece boundary');
  // the end: stops by itself
  await p.waitForTimeout(4500); if ((await p.getAttribute('#play', 'aria-label')) !== 'Play') fail('did not stop at the end');
  // loop: 4 bars at 92 BPM = 10.4 s from bar 0; it wraps back
  await p.tap('#play'); await p.waitForTimeout(500); await p.tap('#loopBtn'); await p.waitForTimeout(11500);
  const t2 = await p.textContent('#time'); if (!/^0:0[0-2]/.test(t2)) fail('loop did not wrap, time ' + t2);
  if (await peak() < 0.05) fail('silent after the loop wrap');
  // cue: hold Loop
  const lb = await p.locator('#loopBtn').boundingBox(); await p.mouse.move(lb.x + 10, lb.y + 10); await p.mouse.down(); await p.waitForTimeout(700); await p.mouse.up();
  if ((await p.$$('#prog .cue')).length !== 1) fail('cue not dropped');
  await p.tap('#play');
  // reload: Continue opens the same song from storage
  await p.waitForTimeout(600); await p.reload(); await p.waitForTimeout(800);
  if (await p.isHidden('#goLast')) fail('no Continue after reload');
  else {
    await p.tap('#goLast'); await p.waitForTimeout(2500);
    if (!(await p.textContent('#time')).endsWith('0:25')) fail('continued song has the wrong length');
    if (await peak() < 0.02) fail('continued song is silent');
    if ((await p.$$('#prog .cue')).length !== 1) fail('cue not kept');
  }
  if (errs.length) fail('console errors: ' + errs.join(' | '));
  await b.close(); if (!process.exitCode) console.log('PASS loader');
})();
