# Routine runbook — automated posting

How the scheduled Claude session ("the Routine") produces a post each firing. The Chartis MCP tools
can only be called by a Claude session, so the Routine is the runtime that bridges Chartis → the
deterministic generator in `scripts/`.

## Cadence & quota

- Fire **every 4 hours** (~6 firings/day). Minimum Routine interval is hourly, so 4h is fine.
- **Daily quota:** reserve **1–2 firings/day for news** posts (Phase 3); the rest are **insight** posts.
- Track the quota with a simple rule: if fewer than 2 news posts exist with today's date and it's a
  news slot (e.g. the 2nd and 5th firing of the day), do a news post; otherwise do an insight post.

## Insight firing (Phase 2 — implemented)

1. **Pick a candidate island.** Rotate a lens/genre focus by firing index for variety
   (scale → retention → reach → momentum → brand → new-UEFN). Maintain a shortlist of island names /
   codes known to have analytics (many games return empty — see below). Avoid repeats:
   pull the published index and skip any island posted in the last ~48h.
   ```
   curl -s "$SITE_URL/api/posts.json"   # or read content/posts/*.md filenames
   ```
2. **Pull Chartis analytics** (Claude calls the MCP tool):
   `get_game_analytics(game: "<name or island code>")`.
3. **Save the raw payload** to a temp file, then run the generator:
   ```
   node scripts/generate-insight-post.mjs \
     --input /tmp/payload.json \
     --published-at "$(date -u +%FT%TZ)"
   ```
   - Exit **0** → a post file was written to `content/posts/`.
   - Exit **2** → SKIP (no usable data, or file already exists). **Pick another island and retry.**
   - Exit **1** → error; stop and report.
   - Optional `--lens <scale|retention|reach|momentum>` to force an angle; default is auto.
4. **Gate + build:** `npm test && npm run validate && npm run build`. The attribution gate fails the
   build if anything is un-sourced — never bypass it.
5. **Publish:** `git add content/posts && git commit && git push`. On the configured host this
   triggers a rebuild/deploy.

> Data availability is the main constraint: in practice most islands return
> `hasCachedAnalytics: false` with empty figures. The generator refuses these by design. Keep a
> curated candidate list of islands that have live ReadyUp or cached data, and expand it over time.

## News firing (Phase 3 — implemented)

> **Egress constraint:** this environment's network proxy blocks non-allowlisted domains, so the
> `scrape-news.mjs` HTTP fetcher **cannot reach live news sites from inside a Claude Routine here.**
> Two supported paths:
>
> 1. **In the Claude Routine (this environment):** use the **`WebSearch`** tool (allowed) to discover
>    current Fortnite/UEFN news, then scaffold the post with `new-news-post.mjs`. This is the default.
> 2. **In GitHub Actions (open egress):** run `npm run scrape` to fetch the allowlisted RSS feeds and
>    emit `candidates.json`; a follow-up step (or a Claude step) turns a candidate into a post.

Steps (Routine / WebSearch path):
1. `WebSearch` for the latest Fortnite/UEFN/Creative news; pick 1 item not already published
   (dedupe against `content/posts/*.md` titles + source URLs).
2. Draft a short factual body (2–4 sections) and write it with:
   ```
   node scripts/new-news-post.mjs --title "…" --url "<source>" --source "<name>" \
     --tier official --summary "…" --topics "fortnite,uefn,news" --body-file body.md
   ```
   News posts don't require a Chartis metric, but the validator requires at least one attributed
   source URL.
3. Gate + publish: `npm test && npm run validate && npm run build`, then commit + push.

Steps (GitHub Actions / scraper path):
1. `npm run scrape -- --out candidates.json` (fetches allowlisted RSS, dedupes, respects robots.txt).
2. Convert a chosen candidate into a post via `new-news-post.mjs`, then gate + publish.

## Hard data-safety rules

- **Only** use the public game-analytics tools: `get_game_analytics`, `lookup_games`, `search_epic_ip`.
- **Never** publish internal Chartis Desk data: deals, cashflow, contractors, contacts, contracts,
  reporting-task internals, or anything from `get_deal*`, `list_contracts`, `get_cashflow_state`, etc.
- Every published number must trace to a Chartis source with a `retrieved_at` timestamp.

## Deployment (going live)

Hosting: **served from this repo's GitHub Pages** alongside the calculator app.

- Calculator → Pages root; blog → `…github.io/<repo>/fortnite-insights/`.
- Built + deployed by `.github/workflows/deploy.yml` (combined artifact). The blog's `SITE_URL` /
  `PATH_PREFIX` are derived from the repo; override with a `BLOG_SITE_URL` repo variable (e.g. a
  custom domain).
- **One-time setup:** merge this branch into the default branch, and ensure **Settings → Pages →
  Source = GitHub Actions** is enabled. The deploy job publishes on push to the default branch, on a
  6-hourly `schedule`, and via `workflow_dispatch`.
- **Subpath caveat:** crawlers only read `robots.txt` from the domain root, so the blog's
  `/fortnite-insights/robots.txt` won't be auto-honored. Discovery still works via the page links,
  `llms.txt`, sitemap, and feeds. A custom domain (or an org `*.github.io` repo) removes this caveat.

## Scheduling (arm the Routine — gentle cadence to start)

Cadence chosen: **1–2 posts/day** to watch quality before ramping to every 4h. Arm it only after the
deploy is confirmed live. Create a scheduled trigger firing into a fresh session in this environment:

- **Cron:** `0 */12 * * *` (every 12h → ~2 posts/day). Ramp to `0 */4 * * *` later.
- **Prompt (fresh session):**
  > Read `fortnite-insights-blog/specs/routine-runbook.md` in this repo and execute ONE posting cycle.
  > First check whether the Chartis MCP tools are available (`get_game_analytics`). If yes, do an
  > insight post from a candidate island with real data (skip empties). If Chartis is unavailable, or
  > it's a news slot, do a news post via `WebSearch` + `new-news-post.mjs`. Run `npm test && npm run
  > validate && npm run build`, then commit and push. Only publish Chartis-attributed numbers; never
  > use internal Chartis Desk data.

> **Chartis-in-cron check:** the first armed firing doubles as a test of whether the connector is
> present in a scheduled session. If it isn't, the cycle degrades to a news post and reports it.

To arm later, use a scheduled-trigger tool (e.g. `create_trigger` with `create_new_session_on_fire`,
this repo's environment, the cron and prompt above).
