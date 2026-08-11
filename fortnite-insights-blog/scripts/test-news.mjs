#!/usr/bin/env node
// Self-test for the news pipeline (feed parsing, relevance filter, news scaffold).
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { parseFeed, filterRelevant } from "./lib/feeds.mjs";
import { renderNewsPost } from "./lib/render-news.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const feedXml = fs.readFileSync(path.join(__dirname, "fixtures", "sample-feed.xml"), "utf8");
const keywords = JSON.parse(
  fs.readFileSync(path.join(__dirname, "config", "sources.json"), "utf8")
).keywords;

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log(`  ✓ ${name}`);
}

console.log("news pipeline self-test:");

test("parseFeed extracts all RSS items with title+link", () => {
  const items = parseFeed(feedXml);
  assert.strictEqual(items.length, 3);
  assert.ok(items[0].title.includes("v41.30"));
  assert.strictEqual(items[0].link, "https://example.com/uefn-4130");
  assert.ok(items[0].published, "has a published date");
});

test("filterRelevant drops off-topic items", () => {
  const items = filterRelevant(parseFeed(feedXml), keywords);
  assert.strictEqual(items.length, 2, "cooking post is filtered out");
  assert.ok(!items.some((i) => /cooking/i.test(i.title)));
});

test("renderNewsPost produces a schema-valid, attributed news post", () => {
  const it = filterRelevant(parseFeed(feedXml), keywords)[0];
  const { markdown } = renderNewsPost({
    title: it.title,
    url: it.link,
    source: "Epic Developer Community",
    summary: it.summary,
    tier: "official",
    publishedAt: "2026-08-11T18:00:00Z",
  });
  const { data, content } = matter(markdown);
  assert.strictEqual(data.type, "news");
  assert.ok(data.id && data.title && data.summary);
  assert.ok(Array.isArray(data.topics) && data.topics.length);
  assert.ok((data.sources || []).some((s) => /^https?:\/\//.test(s.url)), "has http source");
  assert.strictEqual(data.sources[0].type, "primary", "official tier → primary source");
  assert.ok(content.trim().length > 40, "body present");
});

test("renderNewsPost requires title/url/source", () => {
  assert.throws(() => renderNewsPost({ title: "x" }), /requires title, url, and source/);
});

console.log(`\n${passed} tests passed.`);
