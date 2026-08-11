# Fortnite Insights — Automated, Machine-First Blog

**Status:** DRAFT PLAN — awaiting sign-off before infrastructure build
**Branch:** `claude/fortnite-insights-blog-plan-ky58og`
**Author:** Claude Code
**Last updated:** 2026-08-05

---

## 1. Goal

An automated blog covering **exclusively** Fortnite, Fortnite Creative, and UEFN:

- Automated **insight posts** from Fortnite Creative data (CCU, rising maps, retention, brand
  activations) — the bulk of output.
- **1–2 news-style posts/day** on Fortnite updates, creators, and UEFN maps.
- Target cadence: **~1 post every 4 hours** (~6/day), randomly mixed.

**Primary data source:** [Chartis](https://chartis.gg) via the **Chartis MCP server**, always
attributed. Limited webscraping is a secondary/supplementary source only.

**Overriding design principle:** the blog is optimized for **machines first** — LLM agents,
webscrapers, and AI crawlers must be able to discover and consume it trivially. Human readability
is explicitly a lower priority.

---

## 2. Key decisions (my recommended defaults — override any of these)

These are the questions I would have asked. I've picked a default for each so we can move; tell me
where to change course.

| # | Decision | Recommended default | Alternatives |
|---|----------|---------------------|--------------|
| D1 | **Automation runtime** | **Hybrid**: Claude Code *Routines* (scheduled Claude sessions) generate Chartis-sourced posts because only a Claude session can reach the Chartis MCP OAuth connector; a GitHub Actions cron handles scraped news + site rebuild/deploy. | (a) Routines-only; (b) GitHub Actions + Claude API only (cannot reach Chartis MCP) |
| D2 | **Blog stack** | **Markdown + JSON-first static site built with Eleventy (11ty)** — plain content files, tiny dependency footprint, full control over emitted machine formats. | Astro; extend existing Vite/React SPA (bad for scrapers); pure flat-file/no framework |
| D3 | **Machine formats** | **All of:** RSS + Atom + JSON Feed; `llms.txt` + per-post `.md` and `.json`; Schema.org JSON-LD (`BlogPosting` + `Dataset`); `sitemap.xml` + AI-friendly `robots.txt`. | Subset |
| D4 | **Scrape sources** | **Chartis-priority + minimal scraping**: official Epic/Fortnite (patch notes, news, UEFN release notes) + a light community aggregator pass. Attribute every source. | Add social/creator signal scraping (higher noise) |
| D5 | **Hosting** | **GitHub Pages** (already wired in `.github/workflows/deploy.yml`). | Cloudflare Pages / Netlify / Vercel |
| D6 | **Content engine** | Claude generates each post from a strict template; every numeric claim must carry a Chartis attribution + `retrieved_at` timestamp. No un-sourced stats. | — |

> ⚠️ **Blocker to confirm:** the **Chartis MCP server (`Chartis_Desk_V1`) is not yet authorized**
> in this environment. Until it's connected via your claude.ai connector settings, no live Chartis
> data can be pulled. The plan is built to degrade gracefully (news posts + cached data) until it's
> authorized, but Chartis is the whole point — please connect it.

---

## 3. Architecture

```
                    ┌─────────────────────────────────────────────┐
                    │             CONTENT SOURCES                  │
                    │  1. Chartis MCP  (PRIMARY, authed connector) │
                    │  2. Epic/Fortnite official  (scrape, light)  │
                    │  3. Community aggregators   (scrape, light)  │
                    └───────────────┬─────────────────────────────┘
                                    │
              ┌─────────────────────┴──────────────────────┐
              │                                             │
   ┌──────────▼───────────┐                    ┌────────────▼───────────┐
   │  INSIGHT PIPELINE     │                    │   NEWS PIPELINE         │
   │  (Claude Routine,     │                    │   (Claude Routine +     │
   │   every 4h, Chartis)  │                    │    scrape, 1–2×/day)    │
   │  → pick a Chartis-     │                    │  → dedupe vs published  │
   │    driven angle        │                    │  → draft + attribute    │
   │  → draft post          │                    │                         │
   └──────────┬───────────┘                    └────────────┬───────────┘
              │        writes content/posts/*.md + *.json    │
              └─────────────────────┬──────────────────────┘
                                    │  git commit + push
                    ┌───────────────▼─────────────────┐
                    │   BUILD (Eleventy, GH Actions)   │
                    │   emits: HTML, RSS/Atom/JSON     │
                    │   Feed, llms.txt, per-post .md/   │
                    │   .json, JSON-LD, sitemap,        │
                    │   robots.txt, /api index          │
                    └───────────────┬─────────────────┘
                                    │
                    ┌───────────────▼─────────────────┐
                    │      GitHub Pages (public)       │
                    │   machine-first blog + feeds     │
                    └──────────────────────────────────┘
```

### Why a Routine, not just Actions cron
The Chartis connector is an **OAuth MCP server bound to your Claude account**. A GitHub Actions
runner has no way to complete that OAuth handshake, so it cannot call Chartis tools. A scheduled
**Claude Code Routine** runs as an authenticated Claude session and *can*. Actions cron is still
used for the deterministic parts: scraping public pages, rebuilding the site, deploying.

---

## 4. Repository layout (proposed)

```
fortnite-insights-blog/
├── specs/
│   └── plan.md                      # this file
├── content/
│   ├── posts/
│   │   └── YYYY-MM-DD-slug.md        # source of truth: frontmatter + body
│   └── data/
│       └── chartis-cache/            # raw Chartis pulls, timestamped, for provenance
├── src/
│   ├── _data/                        # site metadata, feed config
│   ├── _includes/                    # minimal templates (HTML shell, JSON-LD partial)
│   ├── generators/
│   │   ├── insight-post.md           # prompt/template for Chartis insight posts
│   │   └── news-post.md              # prompt/template for news posts
│   ├── llms.txt.njk                  # llms.txt manifest generator
│   ├── feed.rss.njk / feed.atom.njk / feed.json.njk
│   ├── sitemap.xml.njk
│   └── posts.11ty.js                 # emits per-post .html + .md + .json
├── scripts/
│   ├── fetch-chartis.mjs             # (Routine-invoked) structured Chartis pulls
│   ├── scrape-news.mjs               # limited, polite scraper w/ allowlist + robots respect
│   └── validate-post.mjs             # schema + attribution linter (CI gate)
├── .eleventy.js
├── package.json
└── robots.txt
```

The existing top-level `.github/workflows/deploy.yml` is currently hard-wired to the calculator app;
we'll add a separate workflow (or generalize it) so both can deploy.

---

## 5. Post format (the core machine contract)

Every post is authored once as markdown-with-frontmatter and the build emits parallel `.json` and
`.md` endpoints plus JSON-LD. Frontmatter schema:

```yaml
---
id: "2026-08-05-rising-uefn-map-redacted"        # stable, unique
type: "insight" | "news"
title: "..."
slug: "..."
published_at: "2026-08-05T16:00:00Z"             # ISO 8601 UTC
updated_at: "2026-08-05T16:00:00Z"
topics: ["fortnite-creative", "uefn", "ccu", "brand-activation"]
entities:                                         # structured, machine-parsable
  maps: [{ name: "...", island_code: "1234-5678-9012" }]
  creators: [{ name: "...", epic_id: "..." }]
  brands: ["..."]
metrics:                                          # every stat is structured + attributed
  - name: "peak_ccu_24h"
    value: 41230
    unit: "players"
    source: "chartis"
    source_url: "https://chartis.gg/..."
    retrieved_at: "2026-08-05T15:58:00Z"
sources:                                           # full provenance list
  - name: "Chartis"
    url: "https://chartis.gg/..."
    type: "primary"
  - name: "Fortnite.com patch notes"
    url: "https://..."
    type: "secondary-scrape"
summary: "One-sentence machine summary (used in feeds + llms.txt)."
license: "CC-BY-4.0"                               # explicit reuse terms for agents
canonical_url: "https://<site>/posts/<slug>/"
---
Body in clean, heading-structured markdown. Data tables as real markdown tables.
```

**Attribution rule (hard CI gate):** any post of `type: insight`, and any `metric` with
`source: chartis`, MUST include a resolvable Chartis `source_url` and `retrieved_at`. `validate-post.mjs`
fails the build otherwise. Chartis is credited in-body and in the `sources` block on every insight post.

---

## 6. Machine-discovery surfaces (emitted every build)

| Surface | Path | Purpose |
|---------|------|---------|
| Human HTML | `/posts/<slug>/` | Minimal, semantic, fast |
| Post JSON | `/posts/<slug>.json` | Full structured post + metrics |
| Post Markdown | `/posts/<slug>.md` | Raw markdown for LLM ingestion |
| JSON index | `/api/posts.json` | Paginated list of all posts w/ metadata |
| llms.txt | `/llms.txt` | Manifest: site purpose + links to all posts (LLM convention) |
| llms-full.txt | `/llms-full.txt` | Full concatenated corpus for one-shot ingestion |
| RSS / Atom | `/feed.rss`, `/feed.atom` | Classic syndication |
| JSON Feed | `/feed.json` | Agent-friendly syndication |
| JSON-LD | inline in each HTML page | `BlogPosting` + `Dataset` for the metrics |
| sitemap | `/sitemap.xml` | Full crawl map |
| robots.txt | `/robots.txt` | **Explicitly allows** ClaudeBot, GPTBot, PerplexityBot, etc. |

---

## 7. Scheduling & cadence

- **Target:** ~6 posts/day, one roughly every 4h, randomly mixed insight/news.
- **Mechanism:** a Claude Routine fires every 4h. Each firing:
  1. Decides post type by a daily quota (reserve 1–2 news slots/day; rest are insight).
  2. For insight: pull a fresh Chartis angle not covered in the last N posts; draft; attribute.
  3. For news: run the limited scraper, dedupe against published posts, draft; attribute.
  4. Run `validate-post.mjs`; if it passes, commit + push (triggers build/deploy).
- Randomness/variety: firing selects among a rotating set of insight "lenses" (fastest-rising map,
  biggest CCU swing, notable brand activation, retention standout, new UEFN release) seeded by the
  firing timestamp to avoid repetition.
- **De-dup + freshness:** a lightweight `published-index.json` prevents repeating the same map/story.

> Note: minimum Routine interval is hourly; every-4h is fine. A one-post-per-4h target means ~6
> firings/day that produce a post; we can also run hourly firings that *conditionally* post to better
> hit variety and breaking-news timeliness.

---

## 8. Scraping policy (limited, polite, defensible)

- **Allowlist only** — official Epic/Fortnite surfaces + a small set of community aggregators.
- Respect `robots.txt`, set a descriptive User-Agent, rate-limit, cache aggressively.
- Store only facts + link back; **attribute every scraped source** in the `sources` block.
- Never present scraped numbers as Chartis data; Chartis remains the labeled primary.
- No paywalled/ToS-restricted content; no scraping behind auth.

---

## 9. Build phases

- **Phase 0 — Confirm plan** (this doc) + authorize Chartis MCP connector.
- **Phase 1 — Static skeleton:** Eleventy site, post schema, one hand-written sample post, all
  machine surfaces (feeds/llms.txt/JSON-LD/sitemap/robots), `validate-post.mjs`, CI build + Pages deploy.
- **Phase 2 — Chartis integration:** `fetch-chartis.mjs` + insight-post generator wired to real
  Chartis MCP tools; generate a first real insight post end-to-end.
- **Phase 3 — News pipeline:** limited scraper + news-post generator + dedupe.
- **Phase 4 — Automation:** Claude Routine (every 4h) with quota/variety logic; Actions cron for
  scrape+build+deploy. Monitor, tune cadence.

---

## 10. Open items for your sign-off

1. **Approve D1–D6** above (or redline).
2. **Authorize the Chartis MCP connector** (`Chartis_Desk_V1`) in your claude.ai connector settings —
   nothing Chartis-sourced works until this is done.
3. Confirm **hosting = GitHub Pages** and the public **domain/subpath** for the blog.
4. Confirm the **content license** to advertise for agent reuse (default proposed: CC-BY-4.0).
5. Confirm the **scrape allowlist** (which official + community sources are in-bounds).

Once you approve, I'll start at **Phase 1**.

---

## 11. Build log & findings

- **Phase 1 ✅** Eleventy skeleton + post schema + all machine surfaces (per-post `.md`/`.json`,
  `/api/posts.json`, JSON Feed/RSS/Atom, `llms.txt`/`llms-full.txt`, `sitemap.xml`, AI-friendly
  `robots.txt`, JSON-LD) + attribution validator + Blog CI. Green.
- **Phase 2 ✅** Deterministic Chartis insight generator (`scripts/lib/chartis.mjs`,
  `render-post.mjs`, `generate-insight-post.mjs`) with lens auto-selection; refuses when no data.
  Self-test in CI. Generated real posts from live Chartis data.
- **Phase 3 ✅** Limited news scraper (allowlist + RSS/Atom parser + polite fetch + dedupe) and a
  `type: news` scaffolder; one real attributed news post shipped.
- **Phase 4 ⏳** Hosting repo + deploy + every-4h Routine — pending decisions below.

### Key findings that shaped the build
- **Chartis Desk is internal.** Only the public game-analytics tools (`get_game_analytics`,
  `lookup_games`, `search_epic_ip`) are used; Desk data (deals/cashflow/contractors/contacts) is
  never published. `list_games` is workspace-gated (403) — expected.
- **Most islands return empty analytics** (`hasCachedAnalytics: false`). The generator hard-refuses
  these, so the blog needs a curated candidate list of islands that actually have data.
- **Network egress is locked down here.** The proxy blocks non-allowlisted domains (403), so the RSS
  scraper cannot fetch live sites from inside a Claude Routine in this environment. News discovery in
  the Routine uses the allowed `WebSearch` tool; the RSS scraper path is for GitHub Actions (open egress).
- **Chartis-in-cron is uncertain.** Interactively-authorized connectors may be absent in headless
  scheduled runs. The Routine must detect Chartis availability and degrade gracefully.

### Phase 4 — open decisions
1. **New repo name** (hosting = dedicated GitHub Pages repo). A user/org page repo named
   `<owner>.github.io` gives clean root URLs; any other name serves under `/<repo>/`.
2. **Enable Pages** on the new repo (Settings → Pages → Source: GitHub Actions) — a manual one-time step.
3. **Arm the every-4h Routine now, or prepare it?** It commits ~6 posts/day continuously; the
   Chartis-in-cron caveat applies. `deploy/pages.yml` is the ready-to-copy deploy workflow.
