// Emits /feed.json — JSON Feed 1.1 (https://www.jsonfeed.org/version/1.1/).
const { buildObject, sortedPosts } = require("./_lib/post.js");

module.exports = class {
  data() {
    return { permalink: "/feed.json", eleventyExcludeFromCollections: true };
  }
  render(data) {
    const site = data.site;
    const items = sortedPosts(data.collections).map((p) => {
      const o = buildObject(p, site);
      return {
        id: o.url,
        url: o.url,
        title: o.title,
        summary: o.summary,
        content_text: o.body_markdown,
        content_html: o.body_html,
        date_published: o.published_at,
        date_modified: o.updated_at,
        tags: o.topics,
        _machine: { markdown: o.formats.markdown, json: o.formats.json, metrics: o.metrics },
      };
    });
    return JSON.stringify(
      {
        version: "https://jsonfeed.org/version/1.1",
        title: site.name,
        home_page_url: site.url,
        feed_url: site.url + "/feed.json",
        description: site.tagline,
        language: site.language,
        authors: [{ name: site.name }],
        items,
      },
      null,
      2
    );
  }
};
