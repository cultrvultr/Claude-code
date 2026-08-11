// Emits /llms.txt — the LLM-discovery manifest (https://llmstxt.org/).
const { buildObject, sortedPosts } = require("./_lib/post.js");

module.exports = class {
  data() {
    return { permalink: "/llms.txt", eleventyExcludeFromCollections: true };
  }
  render(data) {
    const site = data.site;
    const posts = sortedPosts(data.collections).map((p) => buildObject(p, site));
    const lines = [];
    lines.push(`# ${site.name}`);
    lines.push("");
    lines.push(`> ${site.tagline}`);
    lines.push("");
    lines.push(
      "This site is optimized for machine consumption. Primary data is sourced from Chartis " +
        "(https://chartis.gg) and attributed per post. Every post is available as HTML, Markdown " +
        "(.md) and JSON (.json)."
    );
    lines.push("");
    lines.push("## Machine endpoints");
    lines.push(`- [Post index (JSON)](${site.url}/api/posts.json): all posts with full metadata and metrics`);
    lines.push(`- [JSON Feed](${site.url}/feed.json): syndication for agents`);
    lines.push(`- [RSS](${site.url}/feed.rss), [Atom](${site.url}/feed.atom): classic syndication`);
    lines.push(`- [Full corpus](${site.url}/llms-full.txt): every post concatenated as markdown`);
    lines.push(`- [Sitemap](${site.url}/sitemap.xml)`);
    lines.push("");
    lines.push("## Posts");
    for (const o of posts) {
      lines.push(`- [${o.title}](${o.formats.markdown}) [${o.type}, ${o.published_at}]: ${o.summary}`);
    }
    lines.push("");
    return lines.join("\n");
  }
};
