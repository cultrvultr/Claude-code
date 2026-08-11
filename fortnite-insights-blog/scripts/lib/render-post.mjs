// Turns normalized Chartis data + a lens into a schema-valid, attributed markdown
// post. Output is guaranteed to satisfy scripts/validate-post.mjs (every metric
// carries source=chartis + source_url + retrieved_at).
import { CHARTIS_URL } from "./chartis.mjs";

function kebab(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "island";
}
function commas(n) {
  return Number(n).toLocaleString("en-US");
}
function compact(n) {
  const a = Math.abs(n);
  if (a >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (a >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (a >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(n);
}
function pct(r) {
  return (r * 100).toFixed(1) + "%";
}
function y(v) {
  // YAML-safe scalar (JSON strings are valid YAML double-quoted scalars).
  return JSON.stringify(String(v));
}

const LABELS = {
  avg_ccu: "Avg CCU",
  peak_ccu: "Peak CCU",
  daily_plays: "Daily plays",
  unique_players_daily: "Unique players (daily)",
  avg_play_time_minutes: "Avg play time (min)",
  favorites_daily: "Favorites (daily)",
  plays_30d: "Plays (30d)",
  plays_total: "Plays (lifetime)",
  unique_players_peak: "Unique players (peak daily)",
  new_players_all_time: "New players (all-time)",
  retention_pct: "Retention (avg)",
};

function metricValueText(m) {
  if (m.unit === "ratio") return pct(m.value);
  if (m.unit === "minutes") return `${m.value} min`;
  return `${commas(m.value)}${m.unit && m.unit !== "players" && m.unit !== "plays" ? " " + m.unit : ""}`;
}

// Per-lens headline + summary + "why it matters" paragraph, using whichever
// facts are present.
function lensCopy(lens, name, f) {
  const bits = [];
  if (f.avgCcu) bits.push(`~${compact(f.avgCcu)} concurrent players`);
  if (f.plays30d) bits.push(`${compact(f.plays30d)} plays in 30 days`);
  if (f.uniquePeak) bits.push(`a peak of ${compact(f.uniquePeak)} daily players`);
  if (f.retentionPct != null) bits.push(`${pct(f.retentionPct)} average retention`);
  const stat = bits.slice(0, 2).join(" and ");

  switch (lens) {
    case "retention":
      return {
        topics: ["fortnite-creative", "uefn", "retention", "ccu"],
        title: `${name} holds ${pct(f.retentionPct)} average retention${
          f.avgCcu ? ` on ~${compact(f.avgCcu)} CCU` : ""
        }`,
        why:
          "Average retention above ~20% across reporting windows is a strong stickiness signal for a " +
          "Fortnite Creative island — players are coming back rather than bouncing after one session. " +
          "Sustained retention is the metric most predictive of a durable UEFN map rather than a spike.",
      };
    case "scale":
      return {
        topics: ["fortnite-creative", "uefn", "ccu", "rising-maps"],
        title: `${name} sustains ${stat || "top-tier concurrency"} on Fortnite Creative`,
        why:
          "Sustained five-figure concurrency puts this island among the larger live Fortnite Creative " +
          "experiences. Pairing high CCU with a healthy average session length indicates real engagement " +
          "depth, not just discovery-driven churn.",
      };
    case "reach":
      return {
        topics: ["fortnite-creative", "uefn", "reach", "unique-players"],
        title: `${name} reached a peak of ${compact(f.uniquePeak)} daily players`,
        why:
          "A high peak of daily unique players signals broad reach across the Fortnite player base rather " +
          "than a small core of repeat sessions — useful for gauging an island's ceiling and brand-activation value.",
      };
    default: // momentum
      return {
        topics: ["fortnite-creative", "uefn", "momentum"],
        title: `${name} logs ${stat || "steady live activity"} on Fortnite Creative`,
        why:
          "Trailing-30-day play volume paired with live concurrency is a clean momentum read for a Fortnite " +
          "Creative island — a signal for creators, brands and other maps tracking what's currently rising in UEFN.",
      };
  }
}

export function renderInsightPost({ normalized, lens, publishedAt }) {
  const name = normalized.game.name;
  const island = normalized.game.islandCode;
  const published = publishedAt || new Date().toISOString();
  const dateOnly = published.slice(0, 10);
  const slug = kebab(name) + (island ? "-" + island.replace(/[^0-9]/g, "").slice(0, 6) : "");
  const id = `${dateOnly}-${slug}`;
  const f = normalized.facts;
  const copy = lensCopy(lens, name, f);

  // Ensure each metric carries retrieved_at (validator requirement).
  const metrics = normalized.metrics.map((m) => ({ ...m, retrieved_at: normalized.retrievedAt }));

  // ---- frontmatter ----
  const fm = [];
  fm.push("---");
  fm.push(`id: ${y(id)}`);
  fm.push(`type: "insight"`);
  fm.push(`title: ${y(copy.title)}`);
  fm.push(`slug: ${y(slug)}`);
  fm.push(`published_at: ${y(published)}`);
  fm.push(`updated_at: ${y(published)}`);
  fm.push(`topics: [${copy.topics.map(y).join(", ")}]`);
  fm.push(`entities:`);
  fm.push(`  maps:`);
  fm.push(`    - name: ${y(name)}`);
  if (island) fm.push(`      island_code: ${y(island)}`);
  const summary = buildSummary(name, island, f);
  fm.push(`summary: ${y(summary)}`);
  fm.push(`license: "CC-BY-4.0"`);
  fm.push(`generator: "chartis-insight-generator"`);
  fm.push(`metrics:`);
  for (const m of metrics) {
    fm.push(`  - name: ${y(m.name)}`);
    fm.push(`    value: ${m.value}`);
    fm.push(`    unit: ${y(m.unit)}`);
    fm.push(`    source: "chartis"`);
    fm.push(`    source_url: ${y(m.source_url || CHARTIS_URL)}`);
    fm.push(`    retrieved_at: ${y(m.retrieved_at)}`);
    if (m.as_of) fm.push(`    as_of: ${y(m.as_of)}`);
    if (m.basis) fm.push(`    basis: ${y(m.basis)}`);
  }
  fm.push(`sources:`);
  fm.push(`  - name: "Chartis"`);
  fm.push(`    url: "${CHARTIS_URL}"`);
  fm.push(`    type: "primary"`);
  fm.push("---");

  // ---- body ----
  const body = [];
  body.push("");
  body.push("## Summary");
  body.push("");
  body.push(summary);
  body.push("");
  body.push("## Why it matters");
  body.push("");
  body.push(copy.why);
  body.push("");
  body.push("## Data");
  body.push("");
  body.push("| Metric | Value | As of | Basis |");
  body.push("| --- | --- | --- | --- |");
  for (const m of metrics) {
    body.push(`| ${LABELS[m.name] || m.name} | ${metricValueText(m)} | ${m.as_of || "—"} | ${m.basis || "Chartis"} |`);
  }
  body.push("");
  body.push(
    `All figures sourced from [Chartis](${CHARTIS_URL})${
      island ? ` for island \`${island}\`` : ""
    }. Live concurrency and session metrics reflect ReadyUp data for the trailing 30-day window; ` +
      "lifetime and unique-player figures come from the Creator Portal analytics cache."
  );
  body.push("");

  return { slug, id, filename: `${dateOnly}-${slug}.md`, markdown: fm.join("\n") + "\n" + body.join("\n") };
}

function buildSummary(name, island, f) {
  const parts = [];
  if (f.avgCcu) parts.push(`an average/peak of ~${commas(f.peakCcu || f.avgCcu)} concurrent players`);
  if (f.dailyPlays) parts.push(`${commas(f.dailyPlays)} daily plays`);
  if (f.uniqueDaily) parts.push(`${commas(f.uniqueDaily)} daily unique players`);
  if (f.retentionPct != null) parts.push(`${pct(f.retentionPct)} average retention`);
  const lead = parts.length
    ? parts.slice(0, 3).join(", ")
    : "measurable live activity on Fortnite Creative";
  const tail = f.plays30d
    ? ` on ${commas(f.plays30d)} plays over the trailing 30 days`
    : f.playsTotal
    ? ` against ${commas(f.playsTotal)} lifetime plays`
    : "";
  return `${name}${island ? ` (island ${island})` : ""} recorded ${lead}${tail}, per Chartis data.`;
}
