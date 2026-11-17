// Feel: buttons act on touch-down, knobs show a value bubble and go fine when dragged slowly,
// and the mixer does almost no layout while it plays untouched (meters and playhead move by transform).
const { chromium, devices } = require('playwright');
const URL = process.env.URL || 'http://localhost:4173/';
const fail = m => { console.error('FAIL', m); process.exitCode = 1; };
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ ...devices['iPhone 15'] }), p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(() => localStorage.setItem('dub-studio-toured', '1'));
  await p.goto(URL); await p.tap('#goDemo'); await p.waitForTimeout(4000);
  const cdp = await ctx.newCDPSession(p); await cdp.send('Performance.enable');
  const layouts = async () => (await cdp.send('Performance.getMetrics')).metrics.find(m => m.name === 'LayoutCount').value;
  const l0 = await layouts(); await p.waitForTimeout(2000); const idle = await layouts() - l0;
  console.log('  layouts in 2 s of untouched playback:', idle);
  if (idle > 8) fail('the idle mixer lays out ' + idle + ' times in 2 s');
  // Mute acts on touch-down
  const mu = await p.locator('.st .mute').first().boundingBox();
  await p.mouse.move(mu.x + 10, mu.y + 10); await p.mouse.down(); await p.waitForTimeout(60);
  if (!(await p.getAttribute('.st .mute >> nth=0', 'class')).includes('on')) fail('mute waited for the finger to lift');
  await p.mouse.up(); await p.locator('.st .mute').first().tap();
  // Loop acts on touch-down
  const lb = await p.locator('#loopBtn').boundingBox();
  await p.mouse.move(lb.x + 10, lb.y + 10); await p.mouse.down(); await p.waitForTimeout(60);
  if (!(await p.getAttribute('#loopBtn', 'class')).includes('on')) fail('loop waited for the finger to lift');
  await p.mouse.up();
  // knob: bubble while dragging; a slow drag moves less than a fast one over the same distance
  const kn = p.locator('.st .kn[data-p="echo"]').first(), kb = await kn.boundingBox(), x = kb.x + 20, y = kb.y + 20;
  const val = () => kn.getAttribute('aria-valuenow').then(Number);
  await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(x, y - 40, { steps: 4 });
  if (!(await p.isVisible('.bubble')) || !/^Echo \d+$/.test(await p.textContent('.bubble'))) fail('no value bubble: ' + await p.textContent('.bubble').catch(() => '-'));
  await p.mouse.up(); const fast = await val();
  if (await p.isVisible('.bubble')) fail('bubble stayed after release');
  await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.up(); await p.waitForTimeout(350);   // not a double tap
  const k2 = p.locator('.st .kn[data-p="echo"]').nth(1), kb2 = await k2.boundingBox(), x2 = kb2.x + 20, y2 = kb2.y + 20;
  await p.mouse.move(x2, y2); await p.mouse.down(); for (let i = 1; i <= 20; i++) { await p.mouse.move(x2, y2 - 2 * i); await p.waitForTimeout(40); } await p.mouse.up();
  const slow = Number(await k2.getAttribute('aria-valuenow'));
  console.log(`  echo after a fast 40 px drag: ${fast}, after a slow 40 px drag: ${slow}`);
  if (!(slow > 0 && slow < fast * 0.6)) fail('slow drags are not finer');
  if (errs.length) fail('console errors: ' + errs.join(' | '));
  await b.close(); if (!process.exitCode) console.log('PASS feel');
})();
