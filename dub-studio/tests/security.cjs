// A hostile song zip (what a stranger could send you) must import harmlessly:
// script in every text and number field, a prototype-pollution mix, and file paths that try to escape the song.
const { chromium, devices } = require('playwright');
const fs = require('fs'), os = require('os'), path = require('path'), zlib = require('zlib');
const URL = process.env.URL || 'http://localhost:4173/';
const fail = m => { console.error('FAIL', m); process.exitCode = 1; };

function zip(entries) {   // store-only zip, like the app's own export
  const crc = b => zlib.crc32 ? zlib.crc32(b) : 0;
  const parts = [], central = []; let off = 0;
  for (const [name, data] of entries) {
    const nm = Buffer.from(name), h = Buffer.alloc(30), c = crc(data);
    h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt32LE(c, 14); h.writeUInt32LE(data.length, 18); h.writeUInt32LE(data.length, 22); h.writeUInt16LE(nm.length, 26);
    parts.push(h, nm, data);
    const d = Buffer.alloc(46); d.writeUInt32LE(0x02014b50, 0); d.writeUInt16LE(20, 4); d.writeUInt16LE(20, 6); d.writeUInt32LE(c, 16); d.writeUInt32LE(data.length, 20); d.writeUInt32LE(data.length, 24); d.writeUInt16LE(nm.length, 28); d.writeUInt32LE(off, 42);
    central.push(d, nm); off += 30 + nm.length + data.length;
  }
  const cd = Buffer.concat(central), e = Buffer.alloc(22); e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(entries.length, 8); e.writeUInt16LE(entries.length, 10); e.writeUInt32LE(cd.length, 12); e.writeUInt32LE(off, 16);
  return Buffer.concat([...parts, cd, e]);
}
const XSS = '"><img src=x onerror="window.__pwned=1">';
const pcm = Buffer.alloc(44100 * 2 * 2); for (let i = 0; i < 44100 * 2; i++) pcm.writeInt16LE(Math.round(Math.sin(i / 7) * 9000), i * 2);
const meta = {
  id: '../../evil', title: 'Hostile' + XSS, bpm: '70<script>window.__pwned=1</script>', sr: 44100, seg: 10, gain: 1e9, cues: ['<b>x</b>'],
  stems: [{ name: 'Drums' + XSS, n: 1, ch: 1, dur: 2, peaks: ['0"/><script>window.__pwned=1</script>', 0.5], ms: 0.01, offset: '0" onfocus="window.__pwned=1' }],
  mix: JSON.stringify({ ch: [{ __proto__: { polluted: 1 }, fader: 'x', cut: 99 }], m: { __proto__: { polluted: 1 }, rep: 1e9 } }).replace('"ch":[{', '"ch":[{"__proto__":{"polluted":1},'),
  snaps: ['{"m":{"rep":"<img src=x onerror=window.__pwned=1>"}}'], source: 'demo', created: 1, spread: true,
};
const file = path.join(os.tmpdir(), 'hostile.dubstudio.zip');
fs.writeFileSync(file, zip([['meta.json', Buffer.from(JSON.stringify(meta))], ['s0/0.pcm', pcm], ['../../escape.pcm', pcm], ['s0/../../meta.json', Buffer.from('{}')], ['s9/0.pcm', pcm]]));
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await (await b.newContext({ ...devices['iPhone 15'] })).newPage();
  await p.addInitScript(() => localStorage.setItem('dub-studio-toured', '1'));
  await p.goto(URL); await p.tap('#goLoad').catch(() => {}); await p.keyboard.press('Escape').catch(() => {});
  await p.evaluate(() => { document.getElementById('start').hidden = true; });
  await p.tap('#songBtn'); await p.click('#libBtn'); await p.waitForTimeout(300);
  await p.setInputFiles('#importFile', file);
  await p.waitForFunction(() => /Imported|Could not import/.test(document.getElementById('toast').textContent), null, { timeout: 20000 });
  console.log('  ', await p.textContent('#toast'));
  await p.waitForTimeout(500);
  const item = p.locator('#libSongs .lib-item', { hasText: 'Hostile' });
  if (!(await item.count())) fail('the song did not import at all');
  else {
    await item.locator('[data-act="open"]').click(); await p.waitForTimeout(800);
    await p.tap('#songBtn'); await p.waitForTimeout(400); await p.click('#libBtn'); await p.waitForTimeout(400);
  }
  const r = await p.evaluate(async () => {
    const root = await navigator.storage.getDirectory(); const top = []; for await (const [n] of root.entries()) top.push(n);
    const songs = []; for await (const [n] of (await root.getDirectoryHandle('songs')).entries()) songs.push(n);
    return { pwned: !!window.__pwned, polluted: ({}).polluted === 1 || Object.prototype.polluted === 1, top, songs,
      imgs: document.querySelectorAll('img[src="x"], script:not([src])').length, bpm: document.getElementById('bpm').textContent, title: document.getElementById('songBtn').textContent };
  });
  console.log('  ', JSON.stringify(r));
  if (r.pwned || r.imgs) fail('injected markup ran or was inserted');
  if (r.polluted) fail('Object.prototype was polluted');
  if (r.top.some(n => n !== 'songs' && n !== 'models' && n !== 'takes')) fail('a file escaped into storage root: ' + r.top.join(','));
  if (r.songs.some(n => !/^[a-z0-9-]+$/i.test(n))) fail('an unsafe song folder name: ' + r.songs.join(','));
  if (!/^\d+$/.test(r.bpm) || +r.bpm < 40 || +r.bpm > 220) fail('tempo not clamped: ' + r.bpm);
  await b.close(); if (!process.exitCode) console.log('PASS security');
})();
