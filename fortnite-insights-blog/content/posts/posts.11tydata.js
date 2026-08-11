// Directory data applied to every post in content/posts/.
const { schemaOrg, absUrl } = require("../../src/_lib/post.js");

module.exports = {
  layout: "post.njk",
  permalink: (data) => `/posts/${data.slug || data.page.fileSlug}/`,
  eleventyComputed: {
    // Eleventy sorts/dates posts by `date`; mirror published_at so ordering is correct.
    date: (data) => data.published_at || data.date,
    canonicalUrl: (data) =>
      data.canonical_url || absUrl(data.site, `/posts/${data.slug || data.page.fileSlug}/`),
    headExtra: () => "", // JSON-LD is injected inside post.njk body
    jsonld: (data) => schemaOrg(data),
  },
};
