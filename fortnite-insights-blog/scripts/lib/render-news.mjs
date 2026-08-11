// Renders a schema-valid `type: news` post. News posts don't require a Chartis
// metric, but MUST attribute at least one source. The prose body is supplied by
// the Routine (Claude) at runtime; if omitted, a minimal summary+link body is used.

function kebab(s) {
  return (
    String(s)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "update"
  );
}
function y(v) {
  return JSON.stringify(String(v));
}

export function renderNewsPost({ title, url, source, summary, body, topics, publishedAt, tier }) {
  if (!title || !url || !source) {
    throw new Error("renderNewsPost requires title, url, and source");
  }
  const published = publishedAt || new Date().toISOString();
  const dateOnly = published.slice(0, 10);
  const slug = kebab(title);
  const id = `${dateOnly}-${slug}`;
  const tp = topics && topics.length ? topics : ["fortnite", "news", "uefn"];
  const sum = summary || `${title} — via ${source}.`;
  const sourceType = tier === "official" ? "primary" : "secondary-scrape";

  const fm = [];
  fm.push("---");
  fm.push(`id: ${y(id)}`);
  fm.push(`type: "news"`);
  fm.push(`title: ${y(title)}`);
  fm.push(`slug: ${y(slug)}`);
  fm.push(`published_at: ${y(published)}`);
  fm.push(`updated_at: ${y(published)}`);
  fm.push(`topics: [${tp.map(y).join(", ")}]`);
  fm.push(`summary: ${y(sum)}`);
  fm.push(`license: "CC-BY-4.0"`);
  fm.push(`generator: "news-scaffolder"`);
  fm.push(`sources:`);
  fm.push(`  - name: ${y(source)}`);
  fm.push(`    url: ${y(url)}`);
  fm.push(`    type: ${y(sourceType)}`);
  fm.push("---");

  const defaultBody = [
    "",
    "## What happened",
    "",
    sum,
    "",
    "## Details",
    "",
    `See the source for full details: [${source}](${url}).`,
    "",
  ].join("\n");

  const md = fm.join("\n") + "\n" + (body ? "\n" + body.trim() + "\n" : defaultBody);
  return { id, slug, filename: `${dateOnly}-${slug}.md`, markdown: md };
}
