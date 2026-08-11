// Minimal, dependency-free RSS 2.0 / Atom 1.0 parser. Tolerant by design — feeds
// in the wild are messy. Returns a flat list of { title, link, published, summary }.

function decode(s) {
  if (s == null) return "";
  return String(s)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "") // strip any inline HTML tags
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function firstTag(block, tag) {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return m ? m[1] : null;
}

function atomLink(block) {
  // Prefer rel="alternate"; fall back to the first href.
  const alt = block.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i);
  if (alt) return alt[1];
  const any = block.match(/<link[^>]*href=["']([^"']+)["']/i);
  return any ? any[1] : null;
}

function blocks(xml, tag) {
  const re = new RegExp(`<${tag}[\\s>][\\s\\S]*?</${tag}>`, "gi");
  return xml.match(re) || [];
}

export function parseFeed(xml) {
  if (!xml || typeof xml !== "string") return [];
  const isAtom = /<feed[\s>]/i.test(xml) && /<entry[\s>]/i.test(xml);
  const items = [];

  if (isAtom) {
    for (const b of blocks(xml, "entry")) {
      items.push({
        title: decode(firstTag(b, "title")),
        link: (atomLink(b) || "").trim(),
        published: decode(firstTag(b, "updated") || firstTag(b, "published")),
        summary: decode(firstTag(b, "summary") || firstTag(b, "content")),
      });
    }
  } else {
    for (const b of blocks(xml, "item")) {
      items.push({
        title: decode(firstTag(b, "title")),
        link: decode(firstTag(b, "link")),
        published: decode(firstTag(b, "pubDate") || firstTag(b, "dc:date")),
        summary: decode(firstTag(b, "description") || firstTag(b, "summary")),
      });
    }
  }

  return items.filter((it) => it.title && it.link);
}

// Keep only items that look Fortnite-relevant (defense-in-depth even though
// sources are Fortnite-specific).
export function filterRelevant(items, keywords) {
  const kw = (keywords || []).map((k) => k.toLowerCase());
  if (!kw.length) return items;
  return items.filter((it) => {
    const hay = `${it.title} ${it.summary}`.toLowerCase();
    return kw.some((k) => hay.includes(k));
  });
}
