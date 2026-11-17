// Swipe across the strips to switch banks; a swipe that starts on a fader or knob does not move it.
const { chromium, devices } = require('playwright');
const URL = process.env.URL || 'http://localhost:4173/';
const fail = m => { console.error('FAIL', m); process.exitCode = 1; };
function wav(s) { const sr = 22050, n = sr * s, b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40); for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.sin(i / 9) * 5000), 44 + i * 2); return b; }
(async () => {
  const b = await chromium.launch(), p = await (await b.newContext({ ...devices['iPhone 15'] })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(() => localStorage.setItem('dub-studio-toured', '1')); await p.goto(URL);
  await p.setInputFiles('#startFiles', ['drums', 'bass', 'other', 'vocals', 'guitar', 'keys'].map(n => ({ name: `Song ${n}.wav`, mimeType: 'audio/wav', buffer: wav(2) })));
  await p.waitForFunction(() => /Loaded/.test(document.getElementById('toast').textContent), null, { timeout: 30000 }); await p.waitForTimeout(300);
  const vis = () => p.$$eval('.st:not([hidden]):not(.off) .slot', e => e.map(x => x.textContent).join(','));
  const swipe = async (sel, dx, ms = 160) => { const r = await p.locator(sel).first().boundingBox(), x = r.x + r.width / 2, y = r.y + r.height / 2;
    await p.mouse.move(x, y); await p.mouse.down(); for (let i = 1; i <= 8; i++) { await p.mouse.move(x + dx * i / 8, y + 3 * Math.sin(i)); await p.waitForTimeout(ms / 8); } await p.mouse.up(); await p.waitForTimeout(300); };
  const cap = () => p.$eval('.st:not(.off):not([hidden]) .cap', e => e.style.transform);
  // swipe left starting on the second strip's fader
  const c0 = await cap(); await swipe('.st:not(.off):not([hidden]) >> nth=1 >> .fd', -180);
  if ((await vis()) !== 'Guitar,Keys') fail('swipe left did not show 5-8: ' + await vis());
  if (!(await p.getAttribute('#banks i >> nth=1', 'class')).includes('on')) fail('bank switch not lit for 5-8');
  // swipe right starting on a knob: back to 1-4, the knob unchanged
  const kv = () => p.getAttribute('.st:not(.off):not([hidden]) .kn[data-p="echo"]', 'aria-valuenow');
  const k0 = await kv(); await swipe('.st:not(.off):not([hidden]) .kn[data-p="echo"]', 200);
  if ((await vis()) !== 'Drums,Bass,Other,Vocals') fail('swipe right did not show 1-4: ' + await vis());
  if ((await cap()) !== c0) fail('the swipe moved the fader it started on');
  // a moderate, unhurried sideways drag does not switch either: it takes a firm stroke
  await swipe('.st:not(.off):not([hidden]) >> nth=3 >> .slot', -100, 700);
  if ((await vis()) !== 'Drums,Bass,Other,Vocals') fail('a moderate drag switched banks');
  // a short slow drag sideways does not switch
  await swipe('.st:not(.off):not([hidden]) >> nth=2 >> .slot', -40, 800);
  if ((await vis()) !== 'Drums,Bass,Other,Vocals') fail('a short drag switched banks');
  // faders still work normally (vertical drag)
  const fd = await p.locator('.st:not(.off):not([hidden]) .fd').first().boundingBox();
  await p.mouse.move(fd.x + fd.width / 2, fd.y + 14); await p.mouse.down(); await p.mouse.move(fd.x + fd.width / 2, fd.y + fd.height - 10, { steps: 6 }); await p.mouse.up();
  if ((await cap()) === c0) fail('a vertical fader drag no longer works');
  if (errs.length) fail('console errors: ' + errs.join(' | '));
  await b.close(); if (!process.exitCode) console.log('PASS swipe');
})();
