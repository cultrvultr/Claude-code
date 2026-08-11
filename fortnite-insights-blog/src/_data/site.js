// Site-wide metadata. The public base URL is decided at deploy time via SITE_URL.
// Default is a placeholder; the hosting subpath is an open decision in specs/plan.md.
const url = (process.env.SITE_URL || "https://blog.example.invalid").replace(/\/+$/, "");

module.exports = {
  name: "Fortnite Insights",
  tagline:
    "Automated, machine-first insights on Fortnite, Fortnite Creative and UEFN. Data primarily from Chartis (https://chartis.gg).",
  url,
  language: "en",
  license: "CC-BY-4.0",
  licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  // Primary data attribution — surfaced on every insight post and feed.
  dataSource: {
    name: "Chartis",
    url: "https://chartis.gg",
  },
  // Machine-consumption surfaces advertised in <head>, llms.txt and robots.txt.
  feeds: {
    rss: "/feed.rss",
    atom: "/feed.atom",
    json: "/feed.json",
  },
  buildTime: new Date().toISOString(),
};
