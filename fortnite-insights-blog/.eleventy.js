const fs = require("fs");
const matter = require("gray-matter");

// Machine-first Eleventy config. Input is the blog root; we ignore everything
// that isn't a post or a template surface. Posts live in content/posts/*.md;
// human + machine surfaces are generated from src/.
module.exports = function (eleventyConfig) {
  // Don't let Eleventy try to render the plan, scripts or generated output.
  eleventyConfig.ignores.add("specs/**");
  eleventyConfig.ignores.add("scripts/**");
  eleventyConfig.ignores.add("README.md");

  // Canonical posts collection: newest-first, with the raw markdown body
  // attached so machine surfaces can serve source markdown verbatim.
  eleventyConfig.addCollection("posts", (api) => {
    return api
      .getFilteredByGlob("content/posts/*.md")
      .filter((item) => item.data && item.data.draft !== true)
      .map((item) => {
        try {
          const raw = fs.readFileSync(item.inputPath, "utf8");
          item.rawBody = matter(raw).content.trim();
        } catch (e) {
          item.rawBody = "";
        }
        return item;
      })
      .sort((a, b) => (b.date || 0) - (a.date || 0));
  });

  return {
    dir: {
      input: ".",
      includes: "src/_includes",
      data: "src/_data",
      output: "_site",
    },
    templateFormats: ["njk", "md", "11ty.js"],
    markdownTemplateEngine: false,
    htmlTemplateEngine: "njk",
    pathPrefix: process.env.PATH_PREFIX || "/",
  };
};
