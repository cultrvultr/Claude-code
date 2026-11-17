// End-to-end smoke test on an emulated iPhone: start the demo, move controls, check sound reaches the master.
// Run: npm run build && npm run preview (in another shell), then: npm run test:e2e
const { chromium, devices } = require('playwright');
const URL = process.env.URL || 'http://localhost:4173/';
const fail = m => { console.error('FAIL', m); process.exitCode = 1; };
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await (await b.newContext({ ...devices['iPhone 15'] })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const peak = () => p.evaluate(async () => { let x = 0; for (let i = 0; i < 10; i++) { await new Promise(r => setTimeout(r, 50)); x = Math.max(x, window.__dub.meters().master); } return x; });
  await p.addInitScript(() => localStorage.setItem('dub-studio-toured', '1'));   // the tour has its own test
  await p.goto(URL); await p.tap('#goDemo');
  await p.waitForFunction(() => { const m = /^0:(\d\d)/.exec(document.getElementById('time').textContent); return m && +m[1] >= 8; }, null, { timeout: 30000 });   // past bar 2, where kick and bass come in
  if ((await p.getAttribute('#play', 'aria-label')) !== 'Pause') fail('demo did not start');
  if (await peak() < 0.05) fail('no sound from the demo');
  await p.tap('#play'); await p.waitForTimeout(2500);
  await p.tap('#pSyn'); if (await peak() < 0.02) fail('Synare silent');
  // the siren plays while held (momentary by default)
  await p.waitForTimeout(3000); const sb = await p.locator('#pSir').boundingBox(); await p.mouse.move(sb.x + 30, sb.y + sb.height / 2); await p.mouse.down();
  if (await peak() < 0.02) fail('Siren silent while held'); await p.mouse.up(); await p.waitForTimeout(4000);
  if (await p.evaluate(() => document.getElementById('pSir').classList.contains('on'))) fail('Siren still on after letting go');
  const k = await p.locator('.st').nth(0).locator('.kn').first().boundingBox();
  await p.mouse.move(k.x + 20, k.y + 20); await p.mouse.down(); await p.mouse.move(k.x + 20, k.y - 30, { steps: 4 }); await p.mouse.up();
  if (!(await p.textContent('.st .kv')).startsWith('HP')) fail('Cut knob did not step to high pass');
  if (await p.isDisabled('#undoBtn')) fail('undo not armed'); await p.tap('#undoBtn');
  if ((await p.textContent('.st .kv')) !== 'Cut') fail('undo did not restore Cut');
  for (const pg of ['fx', 'syn', 'sir']) { await p.locator(`#app [data-open="${pg}"]`).tap(); if (await p.isHidden('#' + pg)) fail(pg + ' page did not open'); await p.locator(`#${pg} [data-close]`).tap(); }
  if (errs.length) fail('console errors: ' + errs.join(' | '));
  await b.close(); if (!process.exitCode) console.log('PASS smoke');
})();
