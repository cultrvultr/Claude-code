#!/usr/bin/env node
// Attribution + schema linter. Fails (non-zero exit) if any post is malformed or
// if an insight post lacks a resolvable Chartis attribution. Runs in CI before build.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const POSTS_DIR = path.join(__dirname, "..", "content", "posts");

const REQUIRED = ["id", "type", "title", "published_at", "summary", "license", "topics", "sources"];
const TYPES = new Set(["insight", "news"]);
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

function isHttpUrl(s) {
  return typeof s === "string" && /^https?:\/\//.test(s);
}
function isChartis(url) {
  if (typeof url !== "string") return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "chartis.gg" || host.endsWith(".chartis.gg");
  } catch (e) {
    return false;
  }
}

let errorCount = 0;
const errors = [];
function fail(file, msg) {
  errors.push(`  ✗ ${path.basename(file)}: ${msg}`);
  errorCount++;
}

if (!fs.existsSync(POSTS_DIR)) {
  console.error(`No posts directory at ${POSTS_DIR}`);
  process.exit(1);
}

const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"));
if (files.length === 0) {
  console.error("No posts found to validate.");
  process.exit(1);
}

const seenIds = new Set();

for (const f of files) {
  const full = path.join(POSTS_DIR, f);
  const { data, content } = matter(fs.readFileSync(full, "utf8"));

  for (const key of REQUIRED) {
    if (data[key] === undefined || data[key] === null || data[key] === "") {
      fail(full, `missing required field "${key}"`);
    }
  }

  if (data.type && !TYPES.has(data.type)) {
    fail(full, `type "${data.type}" must be one of: ${[...TYPES].join(", ")}`);
  }

  if (data.id) {
    if (seenIds.has(data.id)) fail(full, `duplicate id "${data.id}"`);
    seenIds.add(data.id);
  }

  if (data.published_at && !ISO.test(String(data.published_at))) {
    fail(full, `published_at "${data.published_at}" is not ISO 8601 UTC`);
  }

  if (data.topics && !Array.isArray(data.topics)) fail(full, `topics must be an array`);
  if (data.topics && Array.isArray(data.topics) && data.topics.length === 0) {
    fail(full, `topics must not be empty`);
  }
  if (data.sources && !Array.isArray(data.sources)) fail(full, `sources must be an array`);

  if (!content || content.trim().length < 40) {
    fail(full, `body is empty or too short`);
  }

  // Validate metrics structure.
  const metrics = Array.isArray(data.metrics) ? data.metrics : [];
  for (const m of metrics) {
    if (!m || !m.name) fail(full, `a metric is missing "name"`);
    if (m && m.value === undefined) fail(full, `metric "${m && m.name}" is missing "value"`);
    if (m && m.source === "chartis") {
      if (!isHttpUrl(m.source_url) || !isChartis(m.source_url)) {
        fail(full, `chartis metric "${m.name}" needs a resolvable chartis.gg source_url`);
      }
      if (!m.retrieved_at || !ISO.test(String(m.retrieved_at))) {
        fail(full, `chartis metric "${m.name}" needs an ISO 8601 retrieved_at`);
      }
    }
  }

  // Hard attribution gate for insight posts: must be backed by Chartis.
  if (data.type === "insight") {
    const hasChartisMetric = metrics.some(
      (m) => m && m.source === "chartis" && isChartis(m.source_url) && m.retrieved_at
    );
    const hasChartisSource =
      Array.isArray(data.sources) &&
      data.sources.some((s) => s && isChartis(s.url) && s.type === "primary");
    if (!hasChartisMetric) {
      fail(full, `insight post must include at least one attributed Chartis metric`);
    }
    if (!hasChartisSource) {
      fail(full, `insight post must list Chartis as a primary source`);
    }
  }
}

if (errorCount > 0) {
  console.error(`\nPost validation FAILED (${errorCount} problem${errorCount === 1 ? "" : "s"}):`);
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`✓ Validated ${files.length} post${files.length === 1 ? "" : "s"} — all attributions present.`);
