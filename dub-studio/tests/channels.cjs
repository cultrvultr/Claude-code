// 6 named files -> 6 channels in their home slots; bank switch; Mute held = Solo while held.
const { chromium, devices } = require('playwright');
const URL = process.env.URL || 'http://localhost:4173/';
const fail = m => { console.error('FAIL', m); process.exitCode = 1; };
function wav(seconds, hz) {   // mono 16-bit sine
  const sr = 22050, n = Math.floor(seconds * sr), b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.sin(2 * Math.PI * hz * i / sr) * 8000), 44 + i * 2);
  return b;
}
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await (await b.newContext({ ...devices['iPhone 15'] })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(() => localStorage.setItem('dub-studio-toured', '1'));   // the tour has its own test
  await p.goto(URL);
  const names = ['Song - sax.wav', 'Song - drums.wav', 'Song - vocals.wav', 'Song - bass.wav', 'Song - guitar.wav', 'Song - piano.wav'];
  await p.setInputFiles('#startFiles', names.map((name, i) => ({ name, mimeType: 'audio/wav', buffer: wav(3, 200 + 100 * i) })));
  await p.waitForTimeout(2500);
  const slots = await p.$$eval('.st:not([hidden]) .slot', e => e.map(x => x.textContent));
  if (slots.join(',') !== 'Drums,Bass,Horns,Vocals,Guitar,Keys') fail('slots ' + slots.join(','));   // guitar and keys keep their home slots; the sax fills the free slot 3
  if (await p.isHidden('#banks')) fail('bank switch hidden with 6 tracks');
  const vis = () => p.$$eval('.st:not([hidden]):not(.off) .slot', e => e.map(x => x.textContent).join(','));
  if ((await vis()) !== 'Drums,Bass,Horns,Vocals') fail('bank 1 shows ' + await vis());
  await p.locator('#banks i').nth(1).tap(); await p.waitForTimeout(300);
  if ((await vis()) !== 'Guitar,Keys') fail('bank 2 shows ' + await vis());
  await p.locator('#banks i').nth(0).tap(); await p.waitForTimeout(300);   // the strips slide in
  const m = p.locator('.st .mute').first(), bb = await m.boundingBox();
  await p.mouse.move(bb.x + 10, bb.y + 10); await p.mouse.down(); await p.waitForTimeout(500);
  if (!(await m.getAttribute('class')).includes('solo') || (await m.textContent()) !== 'Solo') fail('holding Mute did not solo');
  await p.mouse.up(); if ((await m.getAttribute('class')).includes('solo') || (await m.textContent()) !== 'Mute') fail('letting go did not end the solo');
  await m.tap(); if (!(await m.getAttribute('class')).includes('on')) fail('tap did not mute');
  await p.tap('#helpBtn'); if (!(await p.isVisible('.credit a'))) fail('credit link missing');
  if (errs.length) fail('console errors: ' + errs.join(' | '));
  await b.close(); if (!process.exitCode) console.log('PASS channels');
})();
