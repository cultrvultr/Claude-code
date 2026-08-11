#!/usr/bin/env node
// Limited, polite news scraper. Fetches ONLY allowlisted sources (scripts/config/
// sources.json), parses RSS/Atom, filters for Fortnite relevance, dedupes against
// already-published posts, and prints candidate items as JSON. The Routine feeds a
// chosen candidate to the news post scaffolder.
//
// Politeness: descriptive User-Agent, per-request timeout, sequential fetches with
// a small delay, and a minimal robots.txt Disallow check per origin.
//
// Usage:
//   node scripts/scrape-news.mjs [--limit 20] [--out candidates.json]
//   node scripts/scrape-news.mjs --input some-feed.xml --source "Name"   # offline parse
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { parseFeed, filterRelevant } from "./lib/feeds.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UA =
  "FortniteInsightsBot/0.1 (+https://github.com/cultrvultr; machine-first Fortnite Creative blog)";

function parseArgs(argv) {
  const a = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t.startsWith("--")) a[t.slice(2)] = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
    else a._.push(t);
  }
  return a;
}

async function fetchText(url, timeoutMs = 12000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": UA, Accept: "application/rss+xml, application/atom+xml, text/xml, */*" },
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

// Minimal robots.txt check: deny only if a matching User-agent group Disallows the path.
async function robotsAllows(url) {
  try {
    const u = new URL(url);
    const txt = await fetchText(`${u.origin}/robots.txt`, 6000);
    const lines = txt.split(/\r?\n/).map((l) => l.replace(/#.*/, "").trim());
    let applies = false;
    const disallows = [];
    for (const line of lines) {
      const [rawK, ...rest] = line.split(":");
      if (!rawK || !rest.length) continue;
      const k = rawK.trim().toLowerCase();
      const v = rest.join(":").trim();
      if (k === "user-agent") applies = v === "*" || UA.toLowerCase().includes(v.toLowerCase());
      else if (k === "disallow" && applies && v) disallows.push(v);
    }
    return !disallows.some((d) => u.pathname.startsWith(d));
  } catch (e) {
    return true; // no robots.txt / unreachable → allowed
  }
}

function publishedKeys() {
  const dir = path.join(__dirname, "..", "content", "posts");
  const urls = new Set();
  const titles = new Set();
  if (!fs.existsSync(dir)) return { urls, titles };
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".md"))) {
    try {
      const { data } = matter(fs.readFileSync(path.join(dir, f), "utf8"));
      (data.sources || []).forEach((s) => s && s.url && urls.add(s.url));
      if (data.title) titles.add(String(data.title).toLowerCase().trim());
    } catch (e) {}
  }
  return { urls, titles };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cfg = JSON.parse(
    fs.readFileSync(path.join(__dirname, "config", "sources.json"), "utf8")
  );
  const limit = Number(args.limit || 20);
  const seen = publishedKeys();
  const seenLinks = new Set();
  let candidates = [];

  // Offline mode: parse a single local feed file.
  if (args.input) {
    const xml = fs.readFileSync(args.input, "utf8");
    const items = filterRelevant(parseFeed(xml), cfg.keywords).map((it) => ({
      ...it,
      source: args.source || "local",
      tier: "test",
    }));
    candidates = items;
  } else {
    for (const src of cfg.sources) {
      if (!src.enabled || src.type !== "rss") continue;
      try {
        if (!(await robotsAllows(src.url))) {
          console.error(`robots.txt disallows ${src.url} — skipping`);
          continue;
        }
        const xml = await fetchText(src.url);
        const items = filterRelevant(parseFeed(xml), cfg.keywords);
        for (const it of items) {
          candidates.push({ ...it, source: src.name, tier: src.tier });
        }
        console.error(`ok ${src.name}: ${items.length} items`);
      } catch (e) {
        console.error(`skip ${src.name}: ${e.message}`);
      }
      await sleep(1000); // be gentle
    }
  }

  // Dedupe: within run + against published posts.
  const fresh = [];
  for (const c of candidates) {
    const link = (c.link || "").trim();
    const titleKey = (c.title || "").toLowerCase().trim();
    if (!link || seenLinks.has(link)) continue;
    if (seen.urls.has(link) || seen.titles.has(titleKey)) continue;
    seenLinks.add(link);
    fresh.push(c);
  }

  const out = {
    generated_at: new Date().toISOString(),
    count: Math.min(fresh.length, limit),
    total_found: candidates.length,
    candidates: fresh.slice(0, limit),
  };
  const json = JSON.stringify(out, null, 2);
  if (args.out) {
    fs.writeFileSync(args.out, json);
    console.error(`Wrote ${out.count} candidate(s) to ${args.out}`);
  } else {
    process.stdout.write(json + "\n");
  }
}

main().catch((e) => {
  console.error(e.stack || String(e));
  process.exit(1);
});
