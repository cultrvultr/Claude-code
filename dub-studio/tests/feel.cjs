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
  await p.goto(URL); await p.tap('#goDemo');
  await p.waitForFunction(() => /BPM/.test(document.getElementById('toast').textContent), null, { timeout: 60000 });   // the demo is made
  await p.waitForFunction(() => { const m = /^0:(\d\d)/.exec(document.getElementById('time').textContent); return m && +m[1] >= 15; }, null, { timeout: 60000 });   // past the intro: the kick is in
  const cdp = await ctx.newCDPSession(p); await cdp.send('Performance.enable');
  const layouts = async () => (await cdp.send('Performance.getMetrics')).metrics.find(m => m.name === 'LayoutCount').value;
  const l0 = await layouts(); await p.waitForTimeout(2000); const idle = await layouts() - l0;
  console.log('  layouts in 2 s of untouched playback:', idle);
  if (idle > 8) fail('the idle mixer lays out ' + idle + ' times in 2 s');
  // playback across piece boundaries never stalls the page (pieces are read and converted in a worker)
  const gaps = await p.evaluate(() => new Promise(res => { const f = []; let last = performance.now(); const t0 = last;
    const tick = t => { f.push(t - last); last = t; if (t - t0 < 12000) requestAnimationFrame(tick); else res(f.filter(x => x > 40).length); }; requestAnimationFrame(tick); }));
  console.log('  frames over 40 ms in 12 s of playback:', gaps);
  if (gaps > 1) fail('playback stalls the page ' + gaps + ' times in 12 s');
  // Mute: a tap mutes; holding solos only while held, without muting the part first
  const mu = await p.locator('.st .mute').first().boundingBox(), cls = () => p.getAttribute('.st .mute >> nth=0', 'class');
  const lv = () => p.evaluate(async () => { const s = [0, 0, 0, 0]; for (let i = 0; i < 16; i++) { await new Promise(r => setTimeout(r, 50)); window.__dub.meters().ch.slice(0, 4).forEach((v, k) => { s[k] = Math.max(s[k], v); }); } return s; });
  await p.mouse.move(mu.x + 10, mu.y + 10); await p.mouse.down(); await p.waitForTimeout(150);
  if ((await cls()).includes(' on')) fail('holding Mute muted the part before it soloed');
  await p.waitForTimeout(300); if (!(await cls()).includes('solo')) fail('holding Mute did not solo');
  await p.waitForTimeout(200); const held = await lv();
  console.log('  levels while Drums is held soloed:', held.map(v => v.toFixed(3)).join(' '));
  if (held[0] < 0.005 || Math.max(held[1], held[2], held[3]) > 0.001) fail('solo did not leave only the held part playing');
  await p.mouse.up(); await p.waitForTimeout(100);
  if ((await cls()).includes('solo') || (await cls()).includes(' on')) fail('letting go did not put the part back');
  const after = await lv(); if (Math.max(after[1], after[2], after[3]) < 0.001) fail('the other parts did not come back after letting go');
  await p.locator('.st .mute').first().tap(); if (!(await cls()).includes(' on')) fail('a tap did not mute');
  // a muted part held: it plays solo while held, and is muted again after
  await p.mouse.move(mu.x + 10, mu.y + 10); await p.mouse.down(); await p.waitForTimeout(450);
  if (!(await cls()).includes('solo')) fail('a muted part did not solo when held'); await p.mouse.up(); await p.waitForTimeout(100);
  if (!(await cls()).includes(' on')) fail('the muted part was not muted again after the hold');
  await p.locator('.st .mute').first().tap();
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
  await p.mouse.move(x2, y2); await p.mouse.down(); for (let i = 1; i <= 40; i++) { await p.mouse.move(x2, y2 - i); await p.waitForTimeout(45); } await p.mouse.up();
  const slow = Number(await k2.getAttribute('aria-valuenow'));
  console.log(`  echo after a quick 40 px drag: ${fast}, after a creeping 40 px drag: ${slow}`);
  if (fast < 60) fail('knobs are still stiff: a quick 40 px drag only reached ' + fast);
  if (!(slow > 0 && slow < fast * 0.6)) fail('slow drags are not finer');
  if (errs.length) fail('console errors: ' + errs.join(' | '));
  await b.close(); if (!process.exitCode) console.log('PASS feel');
})();
