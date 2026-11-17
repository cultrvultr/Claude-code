// Long file names: the part name drops the shared song name and is never cut off in the strip.
const { chromium, devices } = require('playwright');
const URL = process.env.URL || 'http://localhost:4173/';
const fail = m => { console.error('FAIL', m); process.exitCode = 1; };
function wav(s) { const sr = 22050, n = sr * s, b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40); for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.sin(i / 7) * 5000), 44 + i * 2); return b; }
(async () => {
  const b = await chromium.launch(), p = await (await b.newContext({ ...devices['iPhone 15'] })).newPage();
  await p.addInitScript(() => localStorage.setItem('dub-studio-toured', '1')); await p.goto(URL);
  const names = ['Kingston Session 1977 - Rhythm Guitar Upstroke.wav', 'Kingston Session 1977 - Melodica.wav', 'Kingston Session 1977 - Clavinet.wav', 'Kingston Session 1977 - Nyabinghi.wav'];
  await p.setInputFiles('#startFiles', names.map(name => ({ name, mimeType: 'audio/wav', buffer: wav(2) })));
  await p.waitForFunction(() => /Loaded/.test(document.getElementById('toast').textContent), null, { timeout: 30000 }); await p.waitForTimeout(300);
  const r = await p.$$eval('.st:not([hidden]) .slot', e => e.map(x => ({ t: x.textContent, d: [x.scrollWidth, x.clientWidth, x.scrollHeight, x.clientHeight].join('/'), cut: x.scrollWidth > x.clientWidth + 1 || x.scrollHeight > x.clientHeight + 2 })));
  console.log('  ', r.map(x => x.t + (x.cut ? ' (CUT)' : '')).join(' | '), '· title:', await p.textContent('#songBtn'));
  if (r.some(x => x.cut)) fail('a name is cut off');
  if (r.some(x => x.t.startsWith('Kingston'))) fail('the shared song name was not dropped');
  await b.close(); if (!process.exitCode) console.log('PASS names');
})();
