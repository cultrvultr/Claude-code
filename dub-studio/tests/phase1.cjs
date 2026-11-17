// Snapshots, tour, offline reload.
const { chromium, devices } = require('playwright');
const URL = process.env.URL || 'http://localhost:4173/';
const fail = m => { console.error('FAIL', m); process.exitCode = 1; };
const hold = async (p, loc, ms) => { const b = await loc.boundingBox(); await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await p.mouse.down(); await p.waitForTimeout(ms); await p.mouse.up(); };
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ ...devices['iPhone 15'] }), p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(URL); await p.tap('#goDemo'); await p.waitForTimeout(1500);
  if (!(await p.isVisible('#tour .tip'))) fail('tour did not open on first visit');
  for (let i = 0; i < 16; i++) { const t = await p.textContent('#tour h3'); if (i === 5 && t !== 'Fader') fail('step 6 is ' + t); await p.click('#tour .next'); }
  if (await p.isVisible('#tour .tip')) fail('tour did not close on Done');
  // store A with the fader full, pull the fader down, recall A
  await hold(p, p.locator('#snaps i').nth(0), 700);
  if (!(await p.getAttribute('#snaps i >> nth=0', 'class')).includes('set')) fail('A not stored');
  const fd = await p.locator('.st .fd').first().boundingBox();
  await p.mouse.move(fd.x + fd.width / 2, fd.y + 14); await p.mouse.down(); await p.mouse.move(fd.x + fd.width / 2, fd.y + fd.height - 10, { steps: 5 }); await p.mouse.up();
  const capY = () => p.$eval('.st .cap', e => e.style.transform);
  const low = await capY(); await p.locator('#snaps i').nth(0).tap(); await p.waitForTimeout(100);
  if ((await capY()) === low) fail('recall A did not move the fader back');
  // offline: once the service worker has the app, a reload with no network still shows it
  await p.evaluate(() => navigator.serviceWorker.ready); await p.reload(); await p.waitForTimeout(800);
  await ctx.setOffline(true); await p.reload(); await p.waitForTimeout(800);
  if (!(await p.isVisible('#goDemo'))) fail('app did not load offline');
  await ctx.setOffline(false);
  if (errs.filter(e => !/Failed to load resource|ERR_INTERNET_DISCONNECTED/.test(e)).length) fail('console errors: ' + errs.join(' | '));
  await b.close(); if (!process.exitCode) console.log('PASS phase1');
})();
