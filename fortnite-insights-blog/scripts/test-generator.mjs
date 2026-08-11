#!/usr/bin/env node
// Self-test for the Chartis insight generator. Runs against committed fixtures so
// CI catches regressions without needing a live Chartis connection.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { normalizeAnalytics, pickLens } from "./lib/chartis.mjs";
import { renderInsightPost } from "./lib/render-post.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fx = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", f), "utf8"));

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log(`  ✓ ${name}`);
}

// Mirror the hard attribution invariant the validator enforces.
function assertAttributed(md) {
  const { data, content } = matter(md);
  assert.ok(data.id && data.title && data.summary, "must have id/title/summary");
  assert.strictEqual(data.type, "insight");
  assert.ok(Array.isArray(data.topics) && data.topics.length, "topics non-empty");
  assert.ok(content.trim().length > 40, "body present");
  const metrics = data.metrics || [];
  const chartisMetric = metrics.find(
    (m) => m.source === "chartis" && /chartis\.gg/.test(m.source_url) && m.retrieved_at
  );
  assert.ok(chartisMetric, "must carry an attributed Chartis metric with retrieved_at");
  assert.ok(
    (data.sources || []).some((s) => /chartis\.gg/.test(s.url) && s.type === "primary"),
    "must list Chartis as primary source"
  );
}

console.log("generator self-test:");

test("retention fixture → retention lens + attributed post", () => {
  const n = normalizeAnalytics(fx("zombie-escape-tag.json"), { retrievedAt: "2026-08-11T15:58:00Z" });
  assert.ok(n.hasData);
  assert.strictEqual(pickLens(n), "retention");
  const { markdown } = renderInsightPost({ normalized: n, lens: "retention", publishedAt: "2026-08-11T18:00:00Z" });
  assertAttributed(markdown);
  assert.ok(markdown.includes("retention_pct"), "retention metric present");
});

test("live-only fixture → momentum lens + attributed post", () => {
  const n = normalizeAnalytics(fx("lucky-block-bedwars.json"), { retrievedAt: "2026-08-11T15:58:00Z" });
  assert.ok(n.hasData);
  assert.strictEqual(pickLens(n), "momentum");
  const { markdown } = renderInsightPost({ normalized: n, lens: "momentum", publishedAt: "2026-08-11T20:00:00Z" });
  assertAttributed(markdown);
});

test("empty-cache fixture → refuses (hasData=false, no metrics)", () => {
  const n = normalizeAnalytics(fx("no-data.json"), { retrievedAt: "2026-08-11T15:58:00Z" });
  assert.strictEqual(n.hasData, false);
  assert.strictEqual(n.metrics ? n.metrics.length : 0, 0);
});

test("zero values are dropped, never rendered as fake data", () => {
  const n = normalizeAnalytics(fx("no-data.json"), { retrievedAt: "2026-08-11T15:58:00Z" });
  assert.ok(!(n.metrics || []).some((m) => m.value === 0), "no zero-valued metrics survive");
});

test("slug + filename are deterministic and island-suffixed", () => {
  const n = normalizeAnalytics(fx("zombie-escape-tag.json"), { retrievedAt: "2026-08-11T15:58:00Z" });
  const a = renderInsightPost({ normalized: n, lens: "retention", publishedAt: "2026-08-11T18:00:00Z" });
  const b = renderInsightPost({ normalized: n, lens: "retention", publishedAt: "2026-08-11T18:00:00Z" });
  assert.strictEqual(a.filename, b.filename);
  assert.strictEqual(a.filename, "2026-08-11-zombie-escape-tag-526392.md");
});

console.log(`\n${passed} tests passed.`);
