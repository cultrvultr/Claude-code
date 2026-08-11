// Emits /llms-full.txt — the entire post corpus concatenated for one-shot ingestion.
const { buildObject, sortedPosts } = require("./_lib/post.js");

module.exports = class {
  data() {
    return { permalink: "/llms-full.txt", eleventyExcludeFromCollections: true };
  }
  render(data) {
    const site = data.site;
    const parts = [
      `# ${site.name} — full corpus`,
      "",
      `> ${site.tagline}`,
      "",
      `Primary data source: Chartis (https://chartis.gg). License: ${site.license}. Generated: ${site.buildTime}.`,
      "",
    ];
    for (const p of sortedPosts(data.collections)) {
      const o = buildObject(p, site);
      parts.push("---", "");
      parts.push(`## ${o.title}`);
      parts.push(`- url: ${o.url}`);
      parts.push(`- type: ${o.type}`);
      parts.push(`- published_at: ${o.published_at}`);
      parts.push(`- topics: ${(o.topics || []).join(", ")}`);
      if (o.metrics && o.metrics.length) {
        parts.push(`- metrics:`);
        for (const m of o.metrics) {
          parts.push(
            `  - ${m.name}: ${m.value}${m.unit ? " " + m.unit : ""} (source: ${m.source || "n/a"}${
              m.source_url ? " " + m.source_url : ""
            })`
          );
        }
      }
      parts.push("", o.body_markdown, "");
    }
    return parts.join("\n");
  }
};
