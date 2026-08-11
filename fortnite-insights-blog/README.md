# Fortnite Insights — machine-first blog

Automated blog covering **Fortnite, Fortnite Creative and UEFN**. Data is sourced primarily from
[Chartis](https://chartis.gg) (attributed on every insight post), with limited webscraping as a
secondary source. Optimized for **machine discovery and consumption** — LLM agents, scrapers, and
AI crawlers first; human readability second.

See [`specs/plan.md`](specs/plan.md) for the full plan, decisions, and roadmap.

## Build

```bash
npm install
npm run validate   # attribution + schema gate (fails build on un-sourced insight posts)
npm run build      # generates _site/
npm run serve      # local preview
```

Set the public base URL at build time:

```bash
SITE_URL=https://your-host.example npm run build
```

## Layout

```
content/posts/*.md         # source of truth: frontmatter + markdown body
content/posts/posts.11tydata.js   # per-post defaults + computed JSON-LD
src/_data/site.js          # site metadata + base URL (SITE_URL env)
src/_lib/post.js           # shared builders for every machine surface
src/_includes/*.njk        # minimal human HTML (base + post layouts)
src/*.11ty.js              # machine surfaces (feeds, llms.txt, sitemap, robots, per-post .md/.json)
scripts/validate-post.mjs  # CI attribution gate
```

## Machine surfaces (generated every build)

| Path | What |
| --- | --- |
| `/posts/<slug>/` | Human HTML with inline Schema.org JSON-LD (`BlogPosting` + `Dataset`) |
| `/posts/<slug>.json` | Canonical structured post + metrics + provenance |
| `/posts/<slug>.md` | Self-describing raw markdown for LLM ingestion |
| `/api/posts.json` | Full index of all posts with metadata |
| `/llms.txt`, `/llms-full.txt` | LLM manifest + full concatenated corpus |
| `/feed.json`, `/feed.rss`, `/feed.atom` | JSON Feed / RSS / Atom |
| `/sitemap.xml` | Every HTML, `.md`, and `.json` URL |
| `/robots.txt` | Explicitly allows ClaudeBot, GPTBot, PerplexityBot, etc. |

## Post schema (frontmatter)

Every post declares `id`, `type` (`insight` \| `news`), `title`, `slug`, `published_at`,
`topics`, `summary`, `license`, `sources`, and (for insights) `metrics`. Each Chartis metric
carries `source: chartis`, a resolvable `source_url`, and `retrieved_at`. `npm run validate`
fails the build if an insight post is not backed by an attributed Chartis metric.

## Data sourcing

Chartis data comes from the **public game-analytics surface only** (`get_game_analytics`,
`lookup_games`, `search_epic_ip`). Internal Chartis Desk endpoints (deals, cashflow, contractors,
contacts, contracts) are **never** published. See the plan for the automation design (Phase 2+).
