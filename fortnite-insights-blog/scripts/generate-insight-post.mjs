#!/usr/bin/env node
// Generates a Chartis-sourced insight post from a `get_game_analytics` payload.
//
// The Chartis MCP tools can only be called by a Claude session, so this CLI takes
// the tool's JSON output as input (file, --input, or stdin) and deterministically
// renders a schema-valid, attributed post. It REFUSES (exit 2) when the payload
// has no usable metrics — no data, no post.
//
// Usage:
//   node scripts/generate-insight-post.mjs --input payload.json [options]
//   cat payload.json | node scripts/generate-insight-post.mjs
//
// Options:
//   --input <file>        Raw get_game_analytics JSON (default: stdin)
//   --lens <name>         Force lens: scale|retention|reach|momentum (default: auto)
//   --published-at <iso>  Post timestamp (default: now)
//   --retrieved-at <iso>  Data retrieval timestamp (default: now)
//   --out-dir <dir>       Output dir (default: content/posts)
//   --dry-run             Print markdown to stdout, write nothing
//   --force               Overwrite if the target file already exists
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeAnalytics, pickLens, LENSES } from "./lib/chartis.mjs";
import { renderInsightPost } from "./lib/render-post.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const a = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t.startsWith("--")) {
      const key = t.slice(2);
      if (["dry-run", "force"].includes(key)) a[key] = true;
      else a[key] = argv[++i];
    } else a._.push(t);
  }
  return a;
}

async function readStdin() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return Buffer.concat(chunks).toString("utf8");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputFile = args.input || args._[0];
  let rawText;
  try {
    rawText = inputFile ? fs.readFileSync(inputFile, "utf8") : await readStdin();
  } catch (e) {
    console.error(`Cannot read input: ${e.message}`);
    process.exit(1);
  }
  if (!rawText || !rawText.trim()) {
    console.error("No input payload provided.");
    process.exit(1);
  }

  let raw;
  try {
    raw = JSON.parse(rawText);
  } catch (e) {
    console.error(`Input is not valid JSON: ${e.message}`);
    process.exit(1);
  }

  const retrievedAt = args["retrieved-at"] || new Date().toISOString();
  const normalized = normalizeAnalytics(raw, { retrievedAt });

  if (!normalized.hasData) {
    // Not an error — a deliberate skip. Exit 2 so a Routine can treat it as
    // "pick another game" rather than a failure.
    console.error(
      `SKIP: ${normalized.game ? normalized.game.name : "game"} — ${normalized.reason}. No post written.`
    );
    process.exit(2);
  }

  let lens = args.lens || pickLens(normalized);
  if (!LENSES.includes(lens)) {
    console.error(`Unknown lens "${lens}". Valid: ${LENSES.join(", ")}`);
    process.exit(1);
  }

  const publishedAt = args["published-at"] || new Date().toISOString();
  const { filename, markdown, slug } = renderInsightPost({ normalized, lens, publishedAt });

  if (args["dry-run"]) {
    process.stdout.write(markdown);
    console.error(`\n(dry-run) lens=${lens} slug=${slug} file=${filename}`);
    return;
  }

  const outDir = args["out-dir"] || path.join(__dirname, "..", "content", "posts");
  const outPath = path.join(outDir, filename);
  if (fs.existsSync(outPath) && !args.force) {
    console.error(`SKIP: ${filename} already exists (use --force to overwrite).`);
    process.exit(2);
  }
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outPath, markdown);
  console.log(outPath);
  console.error(`Wrote ${filename} (lens=${lens}, ${normalized.metrics.length} metrics).`);
}

main().catch((e) => {
  console.error(e.stack || String(e));
  process.exit(1);
});
