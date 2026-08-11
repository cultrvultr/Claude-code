// Emits /sitemap.xml covering the home page and every post (HTML, .md, .json).
const { buildObject, sortedPosts, escapeXml } = require("./_lib/post.js");

module.exports = class {
  data() {
    return { permalink: "/sitemap.xml", eleventyExcludeFromCollections: true };
  }
  render(data) {
    const site = data.site;
    const urls = [`  <url><loc>${escapeXml(site.url + "/")}</loc></url>`];
    for (const p of sortedPosts(data.collections)) {
      const o = buildObject(p, site);
      urls.push(
        `  <url><loc>${escapeXml(o.url)}</loc><lastmod>${escapeXml(
          o.updated_at
        )}</lastmod></url>`,
        `  <url><loc>${escapeXml(o.formats.markdown)}</loc></url>`,
        `  <url><loc>${escapeXml(o.formats.json)}</loc></url>`
      );
    }
    return `<?xml version="1.0" encoding="utf-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`;
  }
};
