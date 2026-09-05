# Phase 0 — Data Source Evaluation

**Date:** 2026-09-05
**Status:** Complete. Key-based verification done 2026-09-05 (§7). User decisions recorded in §8.

## 1. Constraints this evaluation was run against

- **Population:** any player eligible for the **senior** Argentina national team (decision 2026-09-05). Not "born in Argentina", and not youth-capped only.
- **Priority coverage:** Europe's top five leagues, Brazil Série A, Argentina Liga Profesional.
- **Argentine league:** must not flood the product; keep only a "focus set" of players worth watching.
- **Cost:** free data, free access, forever if possible. Product capability scales to what free data supports.
- **Public product:** whatever we display must be legally displayable.

Everything below was probed live on 2026-09-05 from a residential Mac. Blocked/unblocked status may differ from a cloud IP (this matters — see the Transfermarkt dataset note).

## 2. Verdict in one table

| Source | Cost | Key? | Covers | Player-match stats | Legally displayable | Verdict |
|---|---|---|---|---|---|---|
| **Wikidata** | Free | No | Global | No | Yes (CC0) | **Adopt** — identity, eligibility, ID crosswalk, career history |
| **ESPN undocumented API** | Free | No | All 7 leagues | Yes (minutes derivable, 14 stats) | No terms; unofficial — risk accepted by user 2026-09-05 | **Adopt** — squad/citizenship feed and secondary stats source |
| **Highlightly** | Free tier, 100 req/day | Yes | All 7 — LPF, BSA, EPL verified with key | Yes — verified: minutes for every player, 37 stat fields incl. xG/xA, rating | Yes — terms allow storage & distribution | **Adopt as primary stats source** |
| **Fantasy Premier League API** | Free | No | EPL only | Yes (per-GW minutes, starts, xG, xA) | Public official endpoints | **Adopt** as EPL ground truth |
| **transfermarkt-datasets** | Free | No | All 7 + 58 more | Yes, historical | Yes (CC0) | **Adopt for history**, frozen at June/July 2026 |
| **football-data.org** | Free tier, 10 req/min | Yes | Top 5 + BSA + UCL (Argentina is paid) | No per-match stats (paid add-on); **squads with nationality/DOB and top scorers are free** (verified) | Non-commercial + attribution | **Adopt** for fixtures/results/standings/squads |
| API-Football | Free tier, 100 req/day | Yes | All 7 | Yes | **No** — grants no publication licence | Reject |
| FBref / Sports Reference | Free | No | All 7 | Yes | Grey | **Reject** — Cloudflare CAPTCHA since Aug 2026 |
| Sportmonks free | Free | Yes | Denmark, Scotland only | — | — | Reject |
| Sofascore / FotMob | Free | No | All 7 | Yes | No (ToS forbid) | Reject; Highlightly exposes similar data with permissive terms |
| Understat | Free | No | Top 5 only | xG only | Grey | Defer |
| TheSportsDB | Free | Test key | Global | No | — | Optional cross-check |
| ClubElo | Free | No | Europe | — | — | Revisit for "club level"; API returned 502 during test |
| Cartola FC (Brazil fantasy) | Free | No | BSA | Scouts, no minutes | Unofficial | Reject |

## 3. Source-by-source findings

### 3.1 Wikidata — identity, eligibility, crosswalk, career

SPARQL endpoint, no key, CC0. Queried for footballers with Argentine citizenship (P27) **or** membership of any Argentina national team (senior, U23, U20, etc.).

| Measure (players born ≥ 1990) | Count |
|---|---|
| Eligible footballers | 3,531 |
| …with Transfermarkt ID (P2446) | 2,570 (73%) |
| …with Soccerway ID (P2369) | 2,784 (79%) |
| …with FBref ID (P5750) | 1,836 (52%) |
| …with ESPN FC ID (P3681) | 209 (6%) |
| …with any "current club" statement | 2,576 |

Career history exists as `member of sports team` statements with start/end qualifiers. Thiago Almada's record already showed Vélez → Atlanta → Botafogo → Atlético Madrid → River Plate (Aug 2026), plus U20/U23/senior spells.

**Weakness:** current-club data is stale and incomplete. Grouping "current club" by country for players born ≥ 1996 gave Argentina 992 vs Spain 44, Italy 30, USA 32, Brazil 13 — far below reality for abroad and inflated at home (missing end dates). WikiProject discussions confirm P54 quality problems.

**Role:** master player table, eligibility basis, external-ID crosswalk, career/transfer history. **Not** the source for current club or statistics.

### 3.2 ESPN undocumented JSON API — richest free source, unofficial

Host that works from this machine: `site.web.api.espn.com`. The commonly documented host `site.api.espn.com` returned Akamai "Access Denied" with every header combination tried.

Verified endpoints (league codes `arg.1 bra.1 eng.1 esp.1 ger.1 ita.1 fra.1`):

- `/apis/site/v2/sports/soccer/{league}/scoreboard?dates=YYYYMMDD-YYYYMMDD` — fixtures and results.
- `/apis/site/v2/sports/soccer/{league}/summary?event={id}` — two `rosters`, each player with `starter`, `subbedIn`, `subbedOut`, `subbedInFor`, `formationPlace`, `plays` (with sub clock), and 14 stats: appearances, goals, assists, shots, shots on target, offsides, fouls committed/suffered, yellow/red cards, own goals, saves, goals conceded, shots faced, sub-ins. `keyEvents` carries substitution minutes → **minutes played is derivable**, not given directly.
- `/apis/site/v2/sports/soccer/{league}/teams/{id}/roster` — full squad with `citizenship`, `dateOfBirth`, `position`, `injuries`.
- `/apis/common/v3/sports/soccer/{league}/athletes/{id}` — profile with `citizenship`.

End-to-end test (about 116 requests, a few minutes): Argentine-citizenship players found in current squads.

| League | Squad entries | Missing citizenship | Argentines |
|---|---|---|---|
| eng.1 | 567 | 4 | 15 |
| esp.1 | 594 | 22 | 23 |
| ger.1 | 532 | 18 | 4 |
| ita.1 | 609 | 18 | 23 |
| fra.1 | 512 | 26 | 5 |
| bra.1 | 950 | 25 | 48 |

Rosters include youth/reserve players (Brazil averages 47 per club), which is useful for "emerging" detection.

**Risks:** no published terms for the API; ESPN's site terms prohibit automated access; soccerdata's ESPN reader had a short outage in April 2026. Treat as a grey source: fine for a private pipeline and for validating other sources, not for redistributing raw data in a public product.

### 3.3 Highlightly — permissive terms, full box scores, 100 requests/day

Base URL `https://soccer.highlightly.net` (also via RapidAPI). Basic plan: **100 requests/day**, no per-minute limit stated. Paid: $9.49/mo for 7,500/day. Docs state only odds, geo-restrictions, and some highlights are excluded from the free plan.

Per-match player box score (`GET /box-score/{matchId}`), fields verified from their OpenAPI spec (v8.2.6):
`minutesPlayed`, `isSubstitute`, `isCaptain`, `matchRating`, `position`, `shirtNumber`, plus statistics: goals, assists, shots (total/on/off), passes (total/successful/key/accuracy), dribbles, tackles, interceptions, duels (won/lost), fouls, cards (yellow/red/second yellow), penalties, **expectedGoals, expectedAssists, expectedGoalsOnTarget**, goals saved/conceded, xG prevented.

This is almost exactly the "Player match statistics" list in the spec, including the "advanced metrics where reliably available" line.

Other endpoints: `/matches` (filter by `leagueId`, `season`, `date`), `/lineups/{matchId}`, `/standings`, `/players/{id}` (profile, transfers, injuries), `/players/{id}/statistics` (season aggregates per club/competition), `/teams/{id}`.

**Terms (verified):** "Distribution, transfer, and storage of the data provided by the Service are allowed." No attribution requirement. Forbidden: gambling use, and proxying/reselling API access itself.

**Request budget:** ~2,700 matches per season across the 7 leagues → ~13 box scores/day on average, ~40 on peak weekends. A daily backlog queue stays under 100. Backfilling one full prior season costs ~27 days of quota.

**Verified with a free key (2026-09-05):**

- Auth on the direct host requires **both** `x-rapidapi-key` and `x-rapidapi-host: soccer.highlightly.net`; `x-api-key` alone returns 403 "Missing mandatory HTTP Headers".
- Rate-limit headers confirm 100/day: `x-ratelimit-requests-limit: 100`, `x-ratelimit-requests-remaining`. Failed 403 calls did not appear to consume quota.
- League IDs: Liga Profesional Argentina **109712**, Brazil Serie A **61205**, Premier League (England) **33973**. Seasons listed 2021–2026 for all three. `leagueName=Premier League` returns a dozen leagues from different countries — always filter on `country.code`.
- Box scores, all finished matches of 2026-08-30:

| Match | Players | With minutes | Sum of minutes | Rated |
|---|---|---|---|---|
| Independiente v Gimnasia (LPF) | 23 | 23 | 990 | 15 |
| Bahia v Internacional (BSA) | 23 + 23 | 46 | 1002 / 996 | 16 + 16 |
| Manchester United v Ipswich (EPL) | 20 + 20 | 40 | 990 / 998 | 16 + 16 |

- Each player carries 37 statistic fields (passes, key passes, duels, tackles, interceptions, dribbles, shots, xG, xA, xGOT, cards, penalties). `statistics` is an **object**, not an array as the spec suggests. xG is `null` for goalkeepers.
- **Historical depth is available on the free plan:** `season=2025&date=2025-08-30` returned 4 LPF matches and a full box score; `season=2024&date=2024-08-31` returned 5 matches.
- A query for 2025-09-06 returned zero matches because it fell in a FIFA window. The pipeline must treat empty days as normal, not as failures.

**Still unknown:** long-term reliability of a small vendor, and data provenance (the schema resembles Sofascore-derived data). Mitigation: ESPN runs as the secondary source.

### 3.4 Fantasy Premier League API — clean EPL ground truth

`https://fantasy.premierleague.com/api/bootstrap-static/` and `/api/element-summary/{id}/`. No key. 652 players. Per-gameweek history: `minutes`, `starts`, `goals_scored`, `assists`, `expected_goals`, `expected_assists`, `expected_goals_conceded`, `tackles`, `recoveries`, `defensive_contribution`, `clean_sheets`, cards, `kickoff_time`, `opponent_team`. Also `birth_date`, `opta_code` (Opta player ID — a useful crosswalk), `region` (nationality code, mapping not published).

EPL only, but it makes the Premier League the league where every other source's minutes can be audited.

### 3.5 transfermarkt-datasets (dcaribou) — history, frozen

CC0 dataset on GitHub/Kaggle/DuckDB. 65 competitions including **ARG1, BRA1, GB1, ES1, L1, IT1, FR1**, PO1, NL1, MLS1, MEX1, SA1, TR1, Champions/Europa League, Copa América, World Cup. Tables: `players` (citizenship, market value, current club, international caps), `appearances` (`minutes_played`, goals, assists, yellow/red cards per game), `games`, `game_lineups`, `game_events`, `transfers`, `player_valuations`, `clubs`.

**Updates are paused.** Maintainer's statement (discussion #383): pipeline stopped mid-July 2026 because upstream pages "are no longer reliably reachable from GitHub Actions runners"; no ETA. `games` end 2026-07-06, `appearances` 2026-06-28, `player_valuations` 2026-06-12; no 2026/27 squads; summer 2026 transfer window incomplete.

**Role:** multi-season historical backfill for all seven leagues, transfer history, market values, and a second nationality opinion — all as a frozen snapshot. Do not build anything that assumes it resumes.

### 3.6 football-data.org — clean fixtures, no free player data

Free tier verified via the unauthenticated `/v4/competitions` endpoint: TIER_ONE = PL, ELC, BL1, SA, FL1, PD, DED, PPL, CL, EC, WC, **BSA**. **Argentina Liga Profesional is TIER_TWO (paid, €49/mo).** Free = fixtures, results, standings at 10 requests/minute. Lineups, substitutions and bookings are in the €29/mo "deep data" add-on. **Squads and top scorers turned out to be free** (verified below, contrary to what the pricing page implies). Non-commercial use only; attribution "Data provided by football-data.org" required.

**Verified with a free key (2026-09-05):**

- `/v4/teams/{id}` for Fluminense returned a 47-player `squad` with `position`, `dateOfBirth`, `nationality`, plus `coach` and `staff`. Four Argentines found (Freytes, Acosta, Cano, Castillo), matching the ESPN roster scan exactly.
- `/v4/matches/{id}` for a finished Premier League match: **no** `goals`, `bookings`, `substitutions`, `lineup`, `bench`, or `statistics` on the free plan. Score, status, referees, venue, matchday only.
- `/v4/competitions/PL/scorers` is free and returns goals, assists, and `playedMatches` per player.
- `/v4/competitions/ASL/matches` (Argentina) → 403 "restricted… check your subscription".

**Role:** authoritative fixture/result/standings feed for the five European leagues, Brazil, and the Champions League, plus a **clean, licensed squad list with nationality** for those competitions. Argentina squads come from ESPN and Highlightly instead.

### 3.7 Rejected sources — evidence

- **API-Football:** 100 req/day, all endpoints, "recent seasons" only (exact window not verifiable — the site blocks non-browser clients). Terms: the service "does not provide a license for the use and publication of the data" and users must obtain rights from "the competent authorities." Disqualifying for a public product.
- **FBref:** every page, including the bot-policy page, returned a Cloudflare managed challenge (HTTP 403 "Just a moment…"). soccerdata issue #967 (2026-08-05, open): "CAPTCHA Error fBref". Stated policy is ≤10 requests/minute with 1-hour blocks even when reachable.
- **Sportmonks free plan:** Danish Superliga and Scottish Premiership only.
- **Sofascore / FotMob:** unofficial APIs, terms forbid scraping; soccerdata scrapers work intermittently. Highlightly offers equivalent data with terms that allow storage and redistribution.

## 4. Recommended free-data architecture

```
Wikidata ─────────────► players (identity, eligibility, IDs, career)
                              │
ESPN rosters ──────────► squads_current (club, citizenship, DOB, injuries)  — all 7 leagues
football-data.org ─────► squads_current (nationality, DOB)                  — top 5 + BSA
                              ▼
football-data.org ─────► matches (top5 + BSA + UCL)
Highlightly /matches ──► matches (Argentina)
                              │
Highlightly /box-score ► player_match_stats  (primary, public)
ESPN /summary ─────────► player_match_stats  (secondary; fills gaps, cross-checks)
FPL element-summary ───► player_match_stats  (EPL ground truth)
                              │
transfermarkt-datasets ► history: appearances, transfers, valuations (≤ June 2026)
```

Layer rules:

1. **Identity is Wikidata-first, and eligibility means the senior team.** A player is `eligible` when they hold Argentine citizenship (P27) or have an Argentina senior cap, **and** have no competitive senior cap for another nation. Argentina youth caps do not confer eligibility on their own but count as evidence of citizenship. Wikidata cannot tell friendlies from competitive senior matches, so any other-nation senior team membership sets `eligibility = review` for manual confirmation. Every row carries `eligibility_basis` ∈ {citizenship, senior_cap, manual}. A manual override table wins over everything.
2. **Current club comes from squad feeds, never Wikidata.** Match ESPN/Highlightly players to Wikidata by (normalized name, date of birth), then persist the provider IDs in the crosswalk.
3. **Highlightly is primary, ESPN secondary, both ingested.** Compare minutes, goals and assists per player-match between them, with FPL as the referee for EPL. Disagreements become data-quality tickets rather than silent picks.
4. **All six sources may feed the public product** (user decision 2026-09-05, ESPN risk accepted). Every row keeps its `source` so ESPN-derived facts can be hidden later with one filter if that decision changes. football-data.org attribution must appear in the footer.
5. **History is a frozen import**, loaded once, with `source_snapshot_date` on every row.

## 5. Population and the Argentine-league "focus set"

Everyone eligible who is in a squad in the six foreign leagues is **in** by default (roughly 120 senior/youth players today per the ESPN test, more once Wikidata-eligible dual nationals are matched).

For Argentina Liga Profesional (roughly 1,000 eligible players), a player enters the focus set if **any** of:

- U23 by tournament eligibility year (born on/after the cutoff for the next Olympic/U23 cycle), **and** ≥ 1 start in the current tournament;
- any Argentina youth or senior cap (Wikidata);
- top N by minutes at their position in the current tournament (N configurable, start at 5);
- ≥ 3 consecutive starts in the last 5 rounds (rising role);
- on a user watchlist;
- moved club in the last 90 days.

Each membership row stores its reason(s) so the UI can say *why* a player is being watched. Everyone else is still ingested (cheap) but hidden by default.

## 6. What this changes in the spec

- **§5 Player match statistics** is fully satisfiable from day one via Highlightly, including xG/xA. Phase 7 "advanced football data" shrinks to event-level/positional work.
- **§17** is complete.
- **§13/§14:** ingestion volume is tiny (≤ 100 Highlightly calls/day, ~150 ESPN calls/day, ~20 football-data.org calls/day). One scheduled container or Lambda is enough. No ECS cluster needed initially.
- **Add a "legal display" flag per source** to the ingestion metadata list in §15.
- **Historical depth:** multi-season history for Argentina, Brazil and the top five exists **only** via the frozen Transfermarkt snapshot. Anything after June 2026 has to be collected live, so start collecting now — every week not ingested is history lost.

## 7. Verification results (2026-09-05, with free keys)

| Check | Result |
|---|---|
| Highlightly: LPF box score has `minutesPlayed` | Yes — 23/23 players, 990 minutes total |
| Highlightly: Brazil Série A box score | Yes — 23/23 per side |
| Highlightly: EPL box score | Yes — 20/20 per side |
| Highlightly: historical seasons on free plan | Yes — 2025 and 2024 LPF matches and box scores returned |
| Highlightly: daily quota | 100, confirmed by response headers; 13 calls used for all checks |
| football-data.org: squads on free plan | Yes — with nationality, DOB, position |
| football-data.org: lineups/goals/bookings on free plan | No |
| football-data.org: top scorers on free plan | Yes |
| football-data.org: Argentina Liga Profesional | 403, paid tier |
| API-Football | Not tested; rejected on licence grounds regardless |

Keys are stored in the project's gitignored `.env` (`HIGHLIGHTLY_API_KEY`, `FOOTBALL_DATA_API_KEY`); `.env.example` lists the names.

## 8. Decisions recorded (2026-09-05)

1. **Eligibility = senior national team.** See §4 rule 1 for the operational definition.
2. **ESPN is approved as a full source**, including for the public product. Rows stay source-tagged so this can be reversed cheaply.
3. **Free only**, confirmed. The verified stack needs zero paid plans.
4. **Focus-set thresholds in §5** stand as the starting point until real data suggests otherwise.

## Appendix A — Reproducible probes

Wikidata eligibility count (born ≥ 1990):

```sparql
SELECT (COUNT(DISTINCT ?p) AS ?n) WHERE {
  ?p wdt:P106 wd:Q937857 ; wdt:P569 ?dob .
  FILTER(?dob >= "1990-01-01T00:00:00Z"^^xsd:dateTime)
  { ?p wdt:P27 wd:Q414 . }
  UNION
  { ?p wdt:P54 ?nt . ?nt wdt:P17 wd:Q414 ; wdt:P31/wdt:P279* wd:Q6979593 . }
}
```

Wikidata career history with club start/end and positions:

```sparql
SELECT ?p ?pLabel ?dob ?clubLabel ?start ?end ?posLabel WHERE {
  ?p wdt:P106 wd:Q937857 ; wdt:P27 wd:Q414 ; wdt:P569 ?dob .
  ?p p:P54 ?ms . ?ms ps:P54 ?club .
  OPTIONAL { ?ms pq:P580 ?start } OPTIONAL { ?ms pq:P582 ?end }
  OPTIONAL { ?p wdt:P413 ?pos }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,es". }
} LIMIT 100
```

ESPN (use a browser User-Agent):

```bash
H=https://site.web.api.espn.com/apis/site/v2/sports/soccer
curl -s "$H/arg.1/scoreboard?dates=20260830-20260904"
curl -s "$H/arg.1/summary?event=401841526"          # rosters[].roster[].{starter,subbedIn,subbedOut,stats,plays}
curl -s "$H/arg.1/teams"                             # team ids
curl -s "$H/arg.1/teams/{teamId}/roster"             # athletes[].{citizenship,dateOfBirth,position,injuries}
```

Fantasy Premier League:

```bash
curl -s https://fantasy.premierleague.com/api/bootstrap-static/      # elements[] (players), events[] (gameweeks)
curl -s https://fantasy.premierleague.com/api/element-summary/1/      # history[] per gameweek incl. minutes, starts, xG, xA
```

football-data.org free competition list (no key needed):

```bash
curl -s https://api.football-data.org/v4/competitions | jq -r '.competitions[] | select(.plan=="TIER_ONE") | .code'
```

Highlightly (key from `.env`; both headers are mandatory):

```bash
H=https://soccer.highlightly.net
A=(-H "x-rapidapi-key: $HIGHLIGHTLY_API_KEY" -H "x-rapidapi-host: soccer.highlightly.net")
curl -s "${A[@]}" "$H/leagues?countryCode=AR"                       # LPF = 109712
curl -s "${A[@]}" "$H/matches?leagueId=109712&date=2026-08-30"      # finished matches that day
curl -s "${A[@]}" "$H/box-score/1270628884"                          # per-player minutes + 37 stats
curl -s "${A[@]}" "$H/matches?leagueId=109712&season=2025&date=2025-08-30"   # historical
```

The OpenAPI spec is embedded in the HTML of `https://highlightly.net/documentation/football/` as an inline JSON object; the `/box-score/{matchId}` response schema is `FootballPlayerMatchStatisticsResponse` (note: `statistics` arrives as an object in practice).

football-data.org (key from `.env`):

```bash
curl -s -H "X-Auth-Token: $FOOTBALL_DATA_API_KEY" https://api.football-data.org/v4/competitions/BSA/teams
curl -s -H "X-Auth-Token: $FOOTBALL_DATA_API_KEY" https://api.football-data.org/v4/teams/1765     # squad[] with nationality, dateOfBirth
curl -s -H "X-Auth-Token: $FOOTBALL_DATA_API_KEY" "https://api.football-data.org/v4/competitions/PL/scorers?limit=20"
```

transfermarkt-datasets: `https://github.com/dcaribou/transfermarkt-datasets` (README lists DuckDB/CSV/Kaggle downloads; status in discussion #383).
