// Emits /api/posts.json — a single paginated index of all posts with full metadata.
const { buildObject, sortedPosts } = require("./_lib/post.js");

module.exports = class {
  data() {
    return { permalink: "/api/posts.json", eleventyExcludeFromCollections: true };
  }
  render(data) {
    const site = data.site;
    const items = sortedPosts(data.collections).map((p) => buildObject(p, site));
    return JSON.stringify(
      {
        name: site.name,
        description: site.tagline,
        home_page_url: site.url,
        feed_urls: {
          rss: site.url + site.feeds.rss,
          atom: site.url + site.feeds.atom,
          json: site.url + site.feeds.json,
        },
        data_source: site.dataSource,
        license: site.license,
        generated_at: site.buildTime,
        count: items.length,
        posts: items,
      },
      null,
      2
    );
  }
};
