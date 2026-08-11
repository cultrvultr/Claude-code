#!/usr/bin/env node
// Scaffolds a schema-valid `type: news` post. The Routine picks a scraped candidate,
// (optionally) drafts a richer body, and calls this to write a consistent file.
//
// Usage:
//   node scripts/new-news-post.mjs \
//     --title "…" --url "https://…" --source "Epic …" \
//     [--summary "…"] [--topics fortnite,uefn] [--body-file body.md] \
//     [--published-at ISO] [--tier official] [--dry-run] [--force]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderNewsPost } from "./lib/render-news.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t.startsWith("--")) {
      const k = t.slice(2);
      if (["dry-run", "force"].includes(k)) a[k] = true;
      else a[k] = argv[++i];
    }
  }
  return a;
}

const args = parseArgs(process.argv.slice(2));
if (!args.title || !args.url || !args.source) {
  console.error("Required: --title, --url, --source");
  process.exit(1);
}

const body = args["body-file"] ? fs.readFileSync(args["body-file"], "utf8") : undefined;
const topics = args.topics ? String(args.topics).split(",").map((s) => s.trim()).filter(Boolean) : undefined;

const { filename, markdown, slug } = renderNewsPost({
  title: args.title,
  url: args.url,
  source: args.source,
  summary: args.summary,
  body,
  topics,
  tier: args.tier,
  publishedAt: args["published-at"] || new Date().toISOString(),
});

if (args["dry-run"]) {
  process.stdout.write(markdown);
  console.error(`\n(dry-run) slug=${slug} file=${filename}`);
  process.exit(0);
}

const outDir = path.join(__dirname, "..", "content", "posts");
const outPath = path.join(outDir, filename);
if (fs.existsSync(outPath) && !args.force) {
  console.error(`SKIP: ${filename} already exists (use --force).`);
  process.exit(2);
}
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outPath, markdown);
console.log(outPath);
console.error(`Wrote ${filename}.`);
