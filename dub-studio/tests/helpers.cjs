// shared steps: open the demo from the Library, load separate part files (hidden test-only input)
async function openDemo(p) {
  if (await p.isVisible('#goLib')) await p.tap('#goLib'); else { await p.tap('#songBtn'); if (await p.isVisible('#libBtn')) await p.click('#libBtn'); }
  const b = p.locator('#libSongs [data-id="demo-echo"] [data-act="open"]'); await b.waitFor({ timeout: 10000 }); await b.click();
}
async function loadParts(p, files) { await p.setInputFiles('#partsFiles', files); }
module.exports = { openDemo, loadParts };
