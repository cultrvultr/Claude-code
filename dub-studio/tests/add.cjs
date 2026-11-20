// Library > Add song > Keep as one track: one stereo channel named Mix, playing, kept in the Library.
const { chromium, devices } = require('playwright');
const URL = process.env.URL || 'http://localhost:4173/';
const fail = m => { console.error('FAIL', m); process.exitCode = 1; };
function wav(seconds) {   // stereo 16-bit
  const sr = 22050, n = Math.floor(seconds * sr), b = Buffer.alloc(44 + n * 4);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 4, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(2, 22);
  b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 4, 28); b.writeUInt16LE(4, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) { b.writeInt16LE(Math.round(Math.sin(i / 9) * 8000), 44 + i * 4); b.writeInt16LE(Math.round(Math.sin(i / 13) * 8000), 46 + i * 4); }
  return b;
}
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await (await b.newContext({ ...devices['iPhone 15'] })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(() => localStorage.setItem('dub-studio-toured', '1'));
  await p.goto(URL); await p.tap('#goLib'); await p.waitForTimeout(300);
  if (!(await p.locator('#libSongs [data-id="demo-echo"]').count())) fail('demo not listed in the Library');
  await p.setInputFiles('#addFile', { name: 'My tune.wav', mimeType: 'audio/wav', buffer: wav(8) });
  await p.waitForSelector('#addSheet:not([hidden])');
  if ((await p.textContent('#addName')) !== 'My tune') fail('name ' + await p.textContent('#addName'));
  await p.click('#addKeep');
  await p.waitForFunction(() => /Added/.test(document.getElementById('toast').textContent), null, { timeout: 30000 });
  const slots = await p.$$eval('.st:not([hidden]):not(.off) .slot', e => e.map(x => x.textContent));
  if (slots.join(',') !== 'Mix') fail('strips ' + slots.join(','));
  if ((await p.textContent('#songBtn')) !== 'My tune') fail('title');
  await p.tap('#play'); await p.waitForTimeout(1200);
  const lvl = await p.evaluate(() => window.__dub.meters().ch[0]);
  if (!(lvl > 0.01)) fail('no sound from the one track: ' + lvl);
  await p.tap('#play');
  await p.tap('#songBtn'); await p.click('#libBtn'); await p.waitForTimeout(400);
  const it = p.locator('#libSongs .lib-item', { hasText: 'My tune' });
  if (!(await it.count())) fail('not in the Library');
  else if (!/one track/.test(await it.textContent())) fail('library line: ' + await it.textContent());
  // a second part loaded by hand on the Song sheet; the first keeps playing from its own pieces
  await p.click('#libSheet [data-x]'); await p.tap('#songBtn'); await p.click('#addTrack');
  const fc = p.waitForEvent('filechooser'); await p.click('[data-load="1"]'); await (await fc).setFiles({ name: 'Dub bass.wav', mimeType: 'audio/wav', buffer: wav(8) });
  await p.waitForFunction(() => document.querySelectorAll('.slotrow .wave').length === 2, null, { timeout: 20000 });
  await p.click('#songSheet [data-x]');
  const two = await p.$$eval('.st:not([hidden]):not(.off) .slot', e => e.map(x => x.textContent));
  if (two.join(',') !== 'Mix,Bass') fail('after Load: ' + two.join(','));
  if ((await p.getAttribute('#play', 'aria-label')) !== 'Pause') await p.tap('#play'); await p.waitForTimeout(1200);
  const lv = await p.evaluate(async () => { const s = [0, 0]; for (let i = 0; i < 10; i++) { await new Promise(r => setTimeout(r, 50)); window.__dub.meters().ch.slice(0, 2).forEach((v, k) => { s[k] = Math.max(s[k], v); }); } return s; });
  if (!(lv[0] > 0.01 && lv[1] > 0.01)) fail('levels after Load ' + lv.join(' '));
  if (errs.length) fail('console errors: ' + errs.join(' | '));
  await b.close(); if (!process.exitCode) console.log('PASS add');
})();
