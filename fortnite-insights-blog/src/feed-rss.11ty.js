// Emits /feed.rss — RSS 2.0.
const { buildObject, sortedPosts, escapeXml } = require("./_lib/post.js");

module.exports = class {
  data() {
    return { permalink: "/feed.rss", eleventyExcludeFromCollections: true };
  }
  render(data) {
    const site = data.site;
    const items = sortedPosts(data.collections)
      .map((p) => buildObject(p, site))
      .map(
        (o) => `    <item>
      <title>${escapeXml(o.title)}</title>
      <link>${escapeXml(o.url)}</link>
      <guid isPermaLink="true">${escapeXml(o.url)}</guid>
      <pubDate>${new Date(o.published_at).toUTCString()}</pubDate>
      <description>${escapeXml(o.summary)}</description>
      ${(o.topics || []).map((t) => `<category>${escapeXml(t)}</category>`).join("")}
    </item>`
      )
      .join("\n");

    return `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(site.name)}</title>
    <link>${escapeXml(site.url)}</link>
    <atom:link href="${escapeXml(site.url + "/feed.rss")}" rel="self" type="application/rss+xml"/>
    <description>${escapeXml(site.tagline)}</description>
    <language>${escapeXml(site.language)}</language>
    <lastBuildDate>${new Date(site.buildTime).toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`;
  }
};
