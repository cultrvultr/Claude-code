// Emits /feed.atom — Atom 1.0.
const { buildObject, sortedPosts, escapeXml } = require("./_lib/post.js");

module.exports = class {
  data() {
    return { permalink: "/feed.atom", eleventyExcludeFromCollections: true };
  }
  render(data) {
    const site = data.site;
    const posts = sortedPosts(data.collections).map((p) => buildObject(p, site));
    const updated = posts.length ? posts[0].updated_at : site.buildTime;
    const entries = posts
      .map(
        (o) => `  <entry>
    <title>${escapeXml(o.title)}</title>
    <link href="${escapeXml(o.url)}"/>
    <id>${escapeXml(o.url)}</id>
    <updated>${escapeXml(o.updated_at)}</updated>
    <published>${escapeXml(o.published_at)}</published>
    <summary>${escapeXml(o.summary)}</summary>
    ${(o.topics || []).map((t) => `<category term="${escapeXml(t)}"/>`).join("")}
  </entry>`
      )
      .join("\n");

    return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escapeXml(site.name)}</title>
  <subtitle>${escapeXml(site.tagline)}</subtitle>
  <link href="${escapeXml(site.url + "/feed.atom")}" rel="self"/>
  <link href="${escapeXml(site.url)}"/>
  <id>${escapeXml(site.url + "/")}</id>
  <updated>${escapeXml(updated)}</updated>
${entries}
</feed>
`;
  }
};
