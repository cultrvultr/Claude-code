// Normalizes a raw Chartis `get_game_analytics` payload into a clean, attributed
// set of metrics + facts, and picks an editorial "lens" for the post.
//
// Design rule: this NEVER invents data. If the payload has no usable metrics it
// returns { hasData: false } and the generator refuses to write a post. That is
// what keeps the blog free of hollow, un-sourced "insights".

export const CHARTIS_URL = "https://chartis.gg";

const BASIS = {
  live: "Chartis · ReadyUp live (trailing 30 days)",
  cache: "Chartis · Creator Portal / analytics cache",
  reporting: "Chartis · reporting metrics (campaign windows)",
};

function num(v) {
  return typeof v === "number" && isFinite(v) ? v : null;
}
function pos(v) {
  const n = num(v);
  return n && n > 0 ? n : null;
}

// Build one metric record. Returns null when the value is absent/zero so callers
// can simply filter out empties.
function metric(name, value, unit, as_of, basis) {
  const v = num(value);
  if (v === null) return null;
  // Treat 0 as "no signal" for count-style metrics (empty cache reads report 0).
  if (v === 0 && unit !== "ratio") return null;
  return {
    name,
    value: v,
    unit,
    source: "chartis",
    source_url: CHARTIS_URL,
    as_of: as_of || null,
    basis: basis || BASIS.live,
  };
}

export function normalizeAnalytics(raw, opts = {}) {
  const retrievedAt = opts.retrievedAt || new Date().toISOString();
  if (!raw || raw.found === false || !raw.game) {
    return { hasData: false, reason: "game not found", retrievedAt };
  }

  const g = raw.game;
  const plays = raw.plays || {};
  const uniq = raw.uniquePlayers || {};
  const nr = raw.newReturning || null;
  const ret = raw.retention || null;
  const live = raw.readyupLive || null;
  const liveVals = (live && live.latestDayValues) || {};
  const liveDate = (live && live.latestDate) || null;
  const cacheDate = plays.latestDate || uniq.latestDate || (raw.dateRange && raw.dateRange.to) || null;

  const metrics = [
    metric("avg_ccu", liveVals.AVG_CCU, "players", liveDate, BASIS.live),
    metric("peak_ccu", liveVals.PEAK_CCU, "players", liveDate, BASIS.live),
    metric("daily_plays", liveVals.DAILY_PLAYS, "plays", liveDate, BASIS.live),
    metric("unique_players_daily", liveVals.UNIQUE_PLAYERS, "players", liveDate, BASIS.live),
    metric("avg_play_time_minutes", liveVals.AVG_PLAY_TIME, "minutes", liveDate, BASIS.live),
    metric("favorites_daily", liveVals.FAVORITES, "favorites", liveDate, BASIS.live),
    metric("plays_30d", live ? live.totalPlays : null, "plays", liveDate, BASIS.live),
    metric("plays_total", plays.total, "plays", cacheDate, BASIS.cache),
    metric("unique_players_peak", uniq.peak, "players", cacheDate, BASIS.cache),
    metric("new_players_all_time", nr && nr.totalNewAllTime, "players", cacheDate, BASIS.cache),
    ret && ret.averagePct != null
      ? {
          name: "retention_pct",
          value: Math.round(ret.averagePct * 1000) / 1000,
          unit: "ratio",
          source: "chartis",
          source_url: CHARTIS_URL,
          as_of: cacheDate,
          basis: BASIS.reporting,
        }
      : null,
  ].filter(Boolean);

  const facts = {
    avgCcu: pos(liveVals.AVG_CCU),
    peakCcu: pos(liveVals.PEAK_CCU),
    dailyPlays: pos(liveVals.DAILY_PLAYS),
    uniqueDaily: pos(liveVals.UNIQUE_PLAYERS),
    avgPlayTime: pos(liveVals.AVG_PLAY_TIME),
    plays30d: pos(live && live.totalPlays),
    playsTotal: pos(plays.total),
    uniquePeak: pos(uniq.peak),
    retentionPct: ret && ret.averagePct != null ? ret.averagePct : null,
    newAllTime: pos(nr && nr.totalNewAllTime),
  };

  return {
    hasData: metrics.length > 0,
    reason: metrics.length > 0 ? null : "no usable metrics (empty analytics cache)",
    retrievedAt,
    game: {
      name: g.name,
      islandCode: g.islandCode || null,
      id: g.id || null,
    },
    asOf: liveDate || cacheDate || null,
    metrics,
    facts,
  };
}

// Pick an editorial lens from what the data actually supports. Deterministic so
// the same payload always yields the same angle; the Routine can override.
export function pickLens(normalized) {
  const f = normalized.facts || {};
  if (f.retentionPct != null && f.retentionPct >= 0.2) return "retention";
  if (f.avgCcu && f.avgCcu >= 5000) return "scale";
  if (f.uniquePeak && f.uniquePeak >= 10000) return "reach";
  if (f.avgCcu || f.plays30d) return "momentum";
  return "momentum";
}

export const LENSES = ["scale", "retention", "reach", "momentum"];
