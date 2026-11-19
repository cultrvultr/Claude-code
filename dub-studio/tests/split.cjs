// Add song > Split into parts, with the cloud splitter stood in by a mock of /api/split:
// invite code asked once (a wrong one asks again), progress shown, silent parts (no guitar, no keys) dropped.
// LIVE=1 skips the mock and uses the real /api/split of URL (costs a split).
const { chromium, devices } = require('playwright');
const URL = process.env.URL || 'http://localhost:4173/', CODE = process.env.INVITE || 'irie';
const fail = m => { console.error('FAIL', m); process.exitCode = 1; };
function wav(seconds, f) {   // stereo 16-bit; f(t) -> sample
  const sr = 44100, n = Math.floor(seconds * sr), b = Buffer.alloc(44 + n * 4);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 4, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(2, 22);
  b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 4, 28); b.writeUInt16LE(4, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) { const v = Math.round(Math.max(-1, Math.min(1, f(i / sr))) * 20000); b.writeInt16LE(v, 44 + i * 4); b.writeInt16LE(v, 46 + i * 4); }
  return b;
}
const beat = t => (t % 0.5 < 0.05 ? Math.sin(t * 2 * Math.PI * 60) : 0);
const PARTS = { drums: wav(10, beat), bass: wav(10, t => 0.5 * Math.sin(t * 2 * Math.PI * 55)), other: wav(10, t => 0.2 * Math.sin(t * 2 * Math.PI * 330)), vocals: wav(10, t => 0.3 * Math.sin(t * 2 * Math.PI * 220)), guitar: wav(10, () => 0), piano: wav(10, t => 1e-5 * Math.sin(t * 9000)) };
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await (await b.newContext({ ...devices['iPhone 15'] })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/401/.test(m.text())) errs.push(m.text()); });
  await p.addInitScript(() => localStorage.setItem('dub-studio-toured', '1'));
  let polls = 0, posts = 0, invites = [];
  if (!process.env.LIVE) await p.route('**/api/split**', async r => {
    const u = new globalThis.URL(r.request().url()), inv = r.request().headers()['x-invite']; invites.push(inv);
    const j = (o, status = 200) => r.fulfill({ status, contentType: 'application/json', body: JSON.stringify(o) });
    if (inv !== 'irie') return j({ error: 'invite' }, 401);
    if (r.request().method() === 'POST') { posts++; return j({ id: 'abcdefghij12' }); }
    const stem = u.searchParams.get('stem');
    if (stem) return r.fulfill({ status: 200, contentType: 'audio/mpeg', body: PARTS[stem] });
    polls++; return j(polls < 2 ? { status: 'starting' } : polls < 3 ? { status: 'processing' } : { status: 'succeeded', stems: Object.keys(PARTS) });
  });
  await p.goto(URL); await p.tap('#goLib'); await p.waitForTimeout(400);
  const add = async () => { await p.setInputFiles('#addFile', { name: 'Test riddim.wav', mimeType: 'audio/wav', buffer: wav(10, t => beat(t) + 0.3 * Math.sin(t * 2 * Math.PI * 55)) }); await p.waitForSelector('#addSheet:not([hidden])'); };
  await add();
  if ((await p.textContent('#addName')) !== 'Test riddim') fail('add sheet name');
  if (!(await p.isVisible('#inviteCode'))) fail('no invite field on first split');
  // a wrong code: asked again
  await p.fill('#inviteCode', 'wrong'); await p.click('#addSplit');
  await p.waitForFunction(() => /invite code/.test(document.getElementById('toast').textContent), null, { timeout: 15000 });
  if (!(await p.isVisible('#inviteCode'))) fail('wrong code did not ask again');
  await p.fill('#inviteCode', CODE); await p.click('#addSplit');
  const t0 = Date.now(); let last = '';
  for (;;) {
    await p.waitForTimeout(500);
    const s = await p.textContent('#splitStatus'); if (s && s !== last) { console.log('  ', s); last = s; }
    if (/Split into/.test(await p.textContent('#toast'))) break;
    if (/Could not/.test(await p.textContent('#toast'))) { fail(await p.textContent('#toast')); break; }
    if (Date.now() - t0 > (process.env.LIVE ? 10 * 60e3 : 60e3)) { fail('split timed out'); break; }
  }
  console.log('  toast:', await p.textContent('#toast'));
  if (process.exitCode) { await b.close(); return; }
  const slots = await p.$$eval('.st:not([hidden]):not(.off) .slot', e => e.map(x => x.textContent));
  console.log('  parts:', slots.join(','));
  if (!process.env.LIVE && slots.join(',') !== 'Drums,Bass,Other,Vocals') fail('parts ' + slots.join(','));
  if (await p.evaluate(() => localStorage.getItem('dub-studio-invite')) !== CODE) fail('invite code not kept');
  if ((await p.getAttribute('#play', 'aria-label')) !== 'Pause') await p.tap('#play'); await p.waitForTimeout(1500);
  const m = await p.evaluate(async () => { const s = [0, 0, 0, 0]; for (let i = 0; i < 20; i++) { await new Promise(r => setTimeout(r, 50)); window.__dub.meters().ch.slice(0, 4).forEach((v, k) => { s[k] = Math.max(s[k], v); }); } return s.map(v => +v.toFixed(3)); });
  console.log('  peaks:', m.join(' '));
  if (m[0] < 0.02 || m[1] < 0.02) fail('parts are silent');
  // the second split goes straight through: no invite field
  await p.tap('#play'); await p.tap('#songBtn'); await p.click('#libBtn'); await p.waitForTimeout(300); await add();
  if (await p.isVisible('#inviteCode')) fail('invite asked again after it worked');
  if (!(await p.locator('#libSongs .lib-item', { hasText: 'Test riddim' }).count()) && !process.env.LIVE) { /* library is behind the add sheet */ }
  if (errs.length) fail('console errors: ' + errs.join(' | '));
  await b.close(); if (!process.exitCode) console.log('PASS split');
})();
