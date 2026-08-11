// Emits /posts/<slug>.md — self-describing raw markdown for LLM ingestion.
const { buildObject, slugOf } = require("./_lib/post.js");

module.exports = class {
  data() {
    return {
      pagination: { data: "collections.posts", size: 1, alias: "post" },
      permalink: (data) => `/posts/${slugOf(data.post)}.md`,
      eleventyExcludeFromCollections: true,
    };
  }
  render(data) {
    const o = buildObject(data.post, data.site);
    const fm = [
      "---",
      `id: ${o.id}`,
      `type: ${o.type}`,
      `title: ${JSON.stringify(o.title)}`,
      `published_at: ${o.published_at}`,
      `updated_at: ${o.updated_at}`,
      `canonical_url: ${o.canonical_url}`,
      `topics: [${(o.topics || []).map((t) => JSON.stringify(t)).join(", ")}]`,
      `license: ${o.license}`,
      `data_source: Chartis (https://chartis.gg)`,
      "---",
      "",
    ].join("\n");
    return fm + o.body_markdown + "\n";
  }
};
