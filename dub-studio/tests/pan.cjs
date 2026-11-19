// Stereo spread places the demo's parts by name; Pan sliders move them; the switch puts them back in the middle.
// The logo opens the main menu; Continue goes back to the same song without reloading it.
const { chromium, devices } = require('playwright');
const URL = process.env.URL || 'http://localhost:4173/';
const fail = m => { console.error('FAIL', m); process.exitCode = 1; };
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await (await b.newContext({ ...devices['iPhone 15'] })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(() => localStorage.setItem('dub-studio-toured', '1'));
  await p.goto(URL); await p.tap('#goDemo');
  await p.waitForFunction(() => /BPM/.test(document.getElementById('toast').textContent), null, { timeout: 60000 }); await p.waitForTimeout(400);
  const pans = () => p.evaluate(() => [0, 1, 2, 3, 4, 5].map(i => Math.round(window.__dub.pan(i) * 100)));
  const got = await pans(); console.log('  demo pans (Drums Bass Other Vocals Guitar Keys):', got.join(' '));
  if (got.join(',') !== '0,0,-10,0,-35,35') fail('auto spread positions ' + got.join(','));
  await p.tap('#songBtn');
  if (!(await p.isChecked('#fSpread'))) fail('Stereo spread is not on');
  const labels = await p.$$eval('[data-panv]', e => e.map(x => x.textContent)); if (labels.join(',') !== 'C,C,L10,C,L35,R35') fail('pan labels ' + labels.join(','));
  await p.$eval('input[data-pan="1"]', el => { el.value = '-60'; el.dispatchEvent(new Event('input')); el.dispatchEvent(new Event('change')); });
  await p.waitForTimeout(150); if ((await pans())[1] !== -60) fail('the Bass slider did not pan it');
  await p.click('#fSpread'); await p.waitForTimeout(150);
  if ((await pans()).some(v => v !== 0)) fail('turning spread off did not centre everything');
  await p.click('#fSpread'); await p.waitForTimeout(150); if ((await pans())[4] !== -35) fail('turning spread on again did not place the parts');
  await p.click('#songSheet [data-x]');
  // the logo: main menu, Continue back to the same song (still playing, not reloaded)
  const t0 = await p.textContent('#time');
  await p.locator('#app .brand').tap(); await p.waitForTimeout(300);
  if (await p.isHidden('#start')) fail('the logo did not open the main menu');
  if (!(await p.textContent('#goLast')).includes('Let the Echo')) fail('Continue does not name the song: ' + await p.textContent('#goLast'));
  await p.tap('#goLast'); await p.waitForTimeout(500);
  if (!(await p.isHidden('#start'))) fail('Continue did not go back to the mixer');
  if ((await p.getAttribute('#play', 'aria-label')) !== 'Pause') fail('the song stopped');
  if ((await pans())[4] !== -35) fail('Continue reloaded the song and lost its pans');
  console.log('  time before menu', t0, 'after continue', await p.textContent('#time'));
  if (errs.length) fail('console errors: ' + errs.join(' | '));
  await b.close(); if (!process.exitCode) console.log('PASS pan');
})();
