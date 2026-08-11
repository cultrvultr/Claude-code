// Shared builders used by every machine surface (JSON/MD endpoints, feeds,
// llms.txt, sitemap, JSON-LD). One place defines the canonical post shape so all
// surfaces stay in lock-step.

function stripTrailingSlash(s) {
  return String(s || "").replace(/\/+$/, "");
}

function absUrl(site, path) {
  const base = stripTrailingSlash(site.url);
  if (!path) return base;
  if (/^https?:\/\//.test(path)) return path;
  return base + (path.startsWith("/") ? path : "/" + path);
}

function toISO(value) {
  if (!value) return null;
  try {
    if (value instanceof Date) return value.toISOString();
    const d = new Date(value);
    return isNaN(d.getTime()) ? String(value) : d.toISOString();
  } catch (e) {
    return String(value);
  }
}

function slugOf(item) {
  return (item.data && item.data.slug) || item.fileSlug;
}

function pathOf(item) {
  return `/posts/${slugOf(item)}/`;
}

// Canonical post object emitted at /posts/<slug>.json and embedded in feeds/api.
// `item` is an Eleventy collection item (has .data, .fileSlug, .templateContent).
function buildObject(item, site) {
  const d = item.data || {};
  const slug = slugOf(item);
  const path = pathOf(item);
  return {
    id: d.id || slug,
    type: d.type || "insight",
    title: d.title || "",
    slug,
    url: absUrl(site, path),
    canonical_url: d.canonical_url || absUrl(site, path),
    published_at: toISO(d.published_at || d.date),
    updated_at: toISO(d.updated_at || d.published_at || d.date),
    topics: d.topics || [],
    entities: d.entities || {},
    metrics: d.metrics || [],
    sources: d.sources || [],
    summary: d.summary || "",
    license: d.license || site.license,
    formats: {
      html: absUrl(site, path),
      markdown: absUrl(site, `/posts/${slug}.md`),
      json: absUrl(site, `/posts/${slug}.json`),
    },
    body_markdown: (item.rawBody || "").trim(),
    body_html: (item.templateContent || "").toString().trim(),
  };
}

// Schema.org JSON-LD for a post page. `data` is the page's template data.
function schemaOrg(data) {
  const site = data.site;
  const slug = data.slug || (data.page && data.page.fileSlug);
  const url = absUrl(site, `/posts/${slug}/`);
  const graph = [
    {
      "@type": "BlogPosting",
      "@id": url + "#post",
      headline: data.title,
      abstract: data.summary,
      url,
      datePublished: toISO(data.published_at || data.date),
      dateModified: toISO(data.updated_at || data.published_at || data.date),
      inLanguage: site.language,
      keywords: (data.topics || []).join(", "),
      license: site.licenseUrl,
      isAccessibleForFree: true,
      publisher: { "@type": "Organization", name: site.name, url: site.url },
      about: (data.topics || []).map((t) => ({ "@type": "Thing", name: t })),
    },
  ];

  const metrics = (data.metrics || []).filter((m) => m && m.name);
  if (metrics.length) {
    graph.push({
      "@type": "Dataset",
      "@id": url + "#dataset",
      name: `${data.title} — metrics`,
      description: `Structured metrics backing "${data.title}".`,
      url,
      license: site.licenseUrl,
      isBasedOn: metrics
        .map((m) => m.source_url)
        .filter(Boolean),
      creator: { "@type": "Organization", name: "Chartis", url: "https://chartis.gg" },
      variableMeasured: metrics.map((m) => ({
        "@type": "PropertyValue",
        name: m.name,
        value: m.value,
        unitText: m.unit || undefined,
        // provenance travels with each measurement
        measurementTechnique: m.source || undefined,
        url: m.source_url || undefined,
      })),
    });
  }

  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph });
}

function escapeXml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Posts sorted newest-first — used by every listing surface.
function sortedPosts(collections) {
  return [...(collections.posts || [])].sort(
    (a, b) => (b.date || 0) - (a.date || 0)
  );
}

module.exports = {
  absUrl,
  toISO,
  slugOf,
  pathOf,
  buildObject,
  schemaOrg,
  escapeXml,
  escapeHtml,
  sortedPosts,
};
