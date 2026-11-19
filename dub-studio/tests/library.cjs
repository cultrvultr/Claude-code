// Library: songs are kept, each with its own mix; takes are saved; a part exports as WAV; a song exports to a zip,
const { openDemo, loadParts } = require('./helpers.cjs');
// is deleted, and comes back by importing the zip.
const { chromium, devices } = require('playwright');
const fs = require('fs'), os = require('os'), path = require('path');
const URL = process.env.URL || 'http://localhost:4173/';
const fail = m => { console.error('FAIL', m); process.exitCode = 1; };
function wav(seconds, hz) {
  const sr = 44100, n = Math.floor(seconds * sr), b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.sin(2 * Math.PI * hz * i / sr) * 9000), 44 + i * 2);
  return b;
}
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ ...devices['iPhone 15'], acceptDownloads: true }), p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(() => localStorage.setItem('dub-studio-toured', '1'));
  await p.goto(URL);
  await loadParts(p, [{ name: 'Lib song drums.wav', mimeType: 'audio/wav', buffer: wav(12, 220) }, { name: 'Lib song bass.wav', mimeType: 'audio/wav', buffer: wav(12, 55) }]);
  await p.waitForFunction(() => /Loaded/.test(document.getElementById('toast').textContent), null, { timeout: 30000 });
  // this song's mix: pull fader 1 down
  const fd = await p.locator('.st .fd').first().boundingBox();
  await p.mouse.move(fd.x + fd.width / 2, fd.y + 14); await p.mouse.down(); await p.mouse.move(fd.x + fd.width / 2, fd.y + fd.height - 10, { steps: 5 }); await p.mouse.up();
  const capLow = await p.$eval('.st .cap', e => e.style.transform);
  // a take
  await p.tap('#recBtn'); await p.waitForTimeout(2000); await p.tap('#recBtn'); await p.waitForTimeout(800);
  if (await p.isHidden('#recSheet')) fail('no take sheet'); await p.click('#recSheet [data-x]'); await p.tap('#play');
  // WAV of part 1
  await p.tap('#songBtn');
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-wav="0"]')]);
  const wf = path.join(os.tmpdir(), 'part.wav'); await dl.saveAs(wf); const wb = fs.readFileSync(wf);
  if (wb.toString('ascii', 0, 4) !== 'RIFF' || Math.abs(wb.length - (44 + 12 * 44100 * 2)) > 4) fail('WAV export wrong: ' + wb.length + ' bytes');
  // library lists the song and the take
  await p.click('#libBtn'); await p.waitForTimeout(500);
  const items = await p.$$eval('#libSongs .lib-item .t', e => e.map(x => x.textContent));
  if (!items.some(t => t.startsWith('Lib song'))) fail('song not in library: ' + items.join(','));
  if ((await p.$$('#libTakes .lib-item')).length !== 1) fail('take not in library');
  // open the demo (another song), then back: the mix comes back with the song
  await p.locator('#libSongs [data-id="demo-echo"] [data-act="open"]').click(); await p.waitForTimeout(1500);   // switch away while the demo is still being made
  if ((await p.$eval('.st .cap', e => e.style.transform)) === capLow) fail('demo opened with the other song\'s mix');
  await p.tap('#songBtn'); await p.click('#libBtn'); await p.waitForTimeout(500);
  const lib = p.locator('#libSongs .lib-item', { hasText: 'Lib song' });
  await lib.locator('[data-act="open"]').click(); await p.waitForTimeout(1200);
  if ((await p.$eval('.st .cap', e => e.style.transform)) !== capLow) fail('song did not bring its own mix back');
  // export, delete, import
  await p.tap('#songBtn'); await p.click('#libBtn'); await p.waitForTimeout(500);
  await lib.locator('[data-act="more"]').click();
  const [zd] = await Promise.all([p.waitForEvent('download'), lib.locator('[data-act="export"]').click()]);
  const zf = path.join(os.tmpdir(), 'song.zip'); await zd.saveAs(zf);
  await lib.locator('[data-act="del"]').click(); await lib.locator('[data-act="del"]').click(); await p.waitForTimeout(800);
  if (await p.locator('#libSongs .lib-item', { hasText: 'Lib song' }).count()) fail('song not deleted');
  await p.setInputFiles('#importFile', zf); await p.waitForFunction(() => /Imported/.test(document.getElementById('toast').textContent), null, { timeout: 30000 });
  await p.waitForTimeout(500);
  const back = p.locator('#libSongs .lib-item', { hasText: 'Lib song' });
  if (!(await back.count())) fail('import did not bring the song back');
  else { await back.locator('[data-act="open"]').click(); await p.waitForTimeout(1200); if ((await p.getAttribute('#play', 'aria-label')) !== 'Pause') await p.tap('#play'); await p.waitForTimeout(1500);
    const pk = await p.evaluate(async () => { let x = 0; for (let i = 0; i < 10; i++) { await new Promise(r => setTimeout(r, 50)); x = Math.max(x, window.__dub.meters().ch[1]); } return x; });
    if (pk < 0.02) fail('imported song is silent');
    if ((await p.$eval('.st .cap', e => e.style.transform)) !== capLow) fail('imported song lost its mix'); }
  if (errs.length) fail('console errors: ' + errs.join(' | '));
  await b.close(); if (!process.exitCode) console.log('PASS library');
})();
