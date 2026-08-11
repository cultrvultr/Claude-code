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

## News firing (Phase 3 — not yet built)

- Run the allowlisted scraper, dedupe headlines against published posts, draft a `type: news` post
  (news posts don't require a Chartis metric, but must still list their sources), then gate + publish.

## Hard data-safety rules

- **Only** use the public game-analytics tools: `get_game_analytics`, `lookup_games`, `search_epic_ip`.
- **Never** publish internal Chartis Desk data: deals, cashflow, contractors, contacts, contracts,
  reporting-task internals, or anything from `get_deal*`, `list_contracts`, `get_cashflow_state`, etc.
- Every published number must trace to a Chartis source with a `retrieved_at` timestamp.

## Scheduling

Create the Routine (or cron trigger) to fire this runbook every 4 hours. Each firing is a fresh
session that: reads this runbook, does one insight (or news) post, and pushes. Keep the prompt
pointed at this file so the procedure stays versioned with the code.
