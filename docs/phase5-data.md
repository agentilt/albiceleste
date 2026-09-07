# Phase 5 — Data work for the page briefs

**Date:** 2026-09-07
**Deliverable:** the data the page briefs depend on (see `page-briefs.md`, "Data work the briefs depend on"), built in the order
listed there. This note records what was built and the decisions taken on the way.

## 1. Coverage extension

Seven leagues added to ESPN ingestion: MLS (`usa.1`), Primeira Liga (`por.1`), Liga MX (`mex.1`), Saudi Pro League (`ksa.1`),
Süper Lig (`tur.1`), Eredivisie (`ned.1`), Pro League (`bel.1`). Teams, rosters, two seasons of scoreboards, match summaries and
athlete profiles: 4,782 summaries, 4,789 fixtures, 2,959 profiles, about 2.5 hours of requests at ESPN's pace. The competitions
seed carries their tier (`level_rank` 2 for Portugal and the Netherlands, 3 for the rest), football-data codes where the free tier
has them (`PPL`, `DED`), and Transfermarkt ids. Highlightly box scores are not fetched for them: the daily quota is better spent
on the original seven, and the site treats box scores as a bonus. `alb ingest espn backfill` takes `--league` now.

Lessons: zsh does not word-split unquoted variables, so a league list held in a shell variable arrives as one argument; and a
two-hour ingestion must run detached (`nohup`) with a log, not as a tool-managed background task with a ten-minute timeout.

## 2. Fixtures a week ahead

`run daily` fetches the ESPN scoreboard through today + 7 for every league; `marts.player_next_match` gives each tracked player
his club's next scheduled match (opponent, home or away, kickoff).

## 3. Windows, squads, national-team status

Three hand-kept seeds, resolved to player keys in `int_squad_calls` and `int_nt_status` (exact unaccented name match against
eligible players, else surname plus first initial with a unique hit, else a pinned `player_key` in the seed):

- `fifa_windows.csv`: the 2026 World Cup, the combined September–October 2026 window (21 Sep – 6 Oct, up to four matches,
  announcement expected mid-September) and the November window (9–17 Nov). Sources: FIFA's international match calendar, AFA
  and Argentine press as of 6 September 2026.
- `squad_calls.csv`: the 26 called for the 2026 World Cup (announced 28 May 2026), from Canal 26's player-by-player list, which
  agrees with Infobae on the Senesi omission.
- `national_team_status.csv`: retirements. Messi announced his on 31 August 2026; Otamendi's last match was the World Cup final;
  Di María retired after the 2024 Copa América. Retired players are excluded from the ranking and shown with a `retired` state.
- `youth_calendar.csv`: the under-20 and under-23 tournaments with expected dates.

## 4. Ranking score, rank, state, arrow

- `int_score_dates`: every Monday from 5 August 2024, every squad announcement date, and the data horizon (111 dates).
- `int_player_score`: for every eligible player and anchor date, the player's team as of the date (his last match's team, else
  his current club near the horizon), the team's last ten completed matches, and the player's rows in them. Components in [0, 1]:
  minutes share, starts share, production (goals plus 0.7 assists per ninety against a positional reference for midfielders and
  forwards; clean-sheet share and goals conceded for goalkeepers and defenders). Weighted per position (`score_weights.csv`),
  then multiplied by the competition weight (1.0 / 0.8 / 0.6 by tier). The multiplier replaced an additive competition
  component after the first build ranked Argentine-league regulars above Romero and Julián Álvarez.
- `player_rank_history`: rank within position group at every date, plus the score 28 days earlier.
- `player_state`: at the horizon, one row per tracked player: components, rank, arrow since the last announcement date, state
  word, infirmary facts. Precedence: retired, out (injured, suspended, absent), just moved, back, on fire, rising, declining,
  short of minutes, established, steady. "Absent" requires three team matches without minutes *and* a minutes share of at least
  40% at the last anchor before the absence, otherwise every bench player would be in the infirmary (579 of 1,517 were, on the
  first build).
- Every number is in `score_thresholds.csv`, one row per threshold with a description, so About the data can print them.
- **Spell-aware window.** The 2026 summer moved Romero, Molina, Medina, Emiliano Martínez, Rulli and Enzo Fernández to new
  clubs; scored on their new team's last ten matches they ranked in the hundreds. The window now starts at the player's first
  match of his current spell at the club, and a player with fewer than three team matches since has no score, only the
  *Recién llegado* state.
- **Injuries are inferred, not listed.** ESPN's soccer rosters carry an empty `injuries` array for every player, so the
  `injured` reason never fires from that source. The infirmary is driven by *absent* (a regular with three or more team
  matches without minutes) and *suspended* (red card in the last match). Wording on the site: "ausente desde", not "lesionado",
  unless a source says so.
- Thresholds after the first calibration on the pool abroad (median score about 30, 75th percentile about 47, 90th about 60):
  Titular fijo from 50, En racha from 55 with a rise of 8 or more.

First-build check after the multiplier fix is recorded in the session notes; the pool at a glance must show top-league regulars
at the top of each position.

## 5. Infirmary

`player_state` carries `infirmary_reason`: `suspended` (red card in the last match and the club has not played since), `absent`
(a regular, minutes share of 40% or more at the last anchor before the absence, with three or more of his current club's
matches without minutes, and not a new signing), `injured` (never fires: ESPN has no soccer injury listings). "Since" is the
last match played; "missed" counts the current club's matches.

## 6. Trajectory (Next cycle)

- `int_age_reference`: at every anchor date, the activity index (minutes share × competition weight) of every scored player,
  grouped by the player's age on that date: observations, players, p25, p50, p75 per age from 16 to 40. This is the reference
  band for the age-against-minutes chart.
- `player_trajectory`: the cohort (aged 23 or under at the horizon, eligible, in a tracked squad, the Argentine league in full),
  with the index now and a year ago, competition tier now and a year ago, minutes this season and last, first senior season
  and first move abroad from the Transfermarkt history, the dual-national-untied flag, and `trajectory` = index now divided by
  the median index at the same age (median floored at 0.05).

## 7. Movers

- `player_events` gained rank moves (five or more places within the position since the last squad announcement, and over 28
  days, labelled by basis) and selection events (`selection_called` from the squad lists; `selection_left_out` for players in
  the previous list but not the next). Season-start suppression: streaks of three only once a player is past his fifth match
  of the season; minute surges and drops only when the previous 28-day window held at least four team matches.
- `movers`: every event with an importance weight from `event_weights.csv` plus modifiers (stronger or weaker tier on a club
  change, size of a rank move, hat-trick, five-match scoring streak, ten straight starts, last-squad membership, top-ten rank),
  scaled by competition tier, and the filter columns the page needs (position, league, direction, last squad, age, 7 and 28
  day flags). `player_state` now carries `in_last_squad`.

## Operations note

Building `stg_espn__player_match_stats` (now over ten thousand summaries, 444k rows) crashed Postgres inside the Docker VM
twice: once alongside the Highlightly crosswalk, once alone, with the host itself short of memory. The VM's cap is a hard
ceiling with an OOM killer; the fix was to move Postgres to Homebrew (`postgresql@16`, tuned: shared_buffers 1 GB, work_mem
64 MB, maintenance_work_mem 512 MB), where macOS manages memory pressure without killing backends. Migration was a dump and
restore (292 MB dump, minutes). `make up` now starts the Homebrew service; `make up-docker` keeps the compose alternative.
dbt `threads` is 2 in the profile.

The staging model is incremental now (delete+insert by match, watermark on `ingested_at`), so a daily run parses only new
summaries and the full-parse cost is paid once per full refresh.
