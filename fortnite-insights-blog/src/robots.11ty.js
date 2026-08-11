// Emits /robots.txt — explicitly welcomes AI/LLM crawlers and points to the sitemap.
module.exports = class {
  data() {
    return { permalink: "/robots.txt", eleventyExcludeFromCollections: true };
  }
  render(data) {
    const site = data.site;
    // Named AI crawlers we explicitly allow (machine discovery is the goal).
    const aiBots = [
      "GPTBot",
      "OAI-SearchBot",
      "ChatGPT-User",
      "ClaudeBot",
      "Claude-Web",
      "anthropic-ai",
      "PerplexityBot",
      "Perplexity-User",
      "Google-Extended",
      "Applebot-Extended",
      "CCBot",
      "Bytespider",
      "Amazonbot",
      "cohere-ai",
    ];
    const blocks = aiBots
      .map((ua) => `User-agent: ${ua}\nAllow: /`)
      .join("\n\n");
    return `# Fortnite Insights welcomes AI crawlers, scrapers and LLM agents.
${blocks}

User-agent: *
Allow: /

Sitemap: ${site.url}/sitemap.xml
`;
  }
};
