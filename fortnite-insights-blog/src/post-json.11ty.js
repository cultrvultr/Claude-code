// Emits /posts/<slug>.json for every post — the canonical machine record.
const { buildObject, slugOf } = require("./_lib/post.js");

module.exports = class {
  data() {
    return {
      pagination: { data: "collections.posts", size: 1, alias: "post" },
      permalink: (data) => `/posts/${slugOf(data.post)}.json`,
      eleventyExcludeFromCollections: true,
    };
  }
  render(data) {
    return JSON.stringify(buildObject(data.post, data.site), null, 2);
  }
};
