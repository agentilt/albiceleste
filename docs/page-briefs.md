# Page briefs

**Date:** 2026-09-06. Settled in conversation, page by page. This is the spec for the design pass and for the data work each
page needs. A brief is closed when it has a "Settled" line; "In discussion" sections are proposals.

## The goal

For the informed Argentina supporter and the journalist or analyst who wants a reliable free reference. The question the site
answers: **who is in form for the next squad, who is falling out of it, and who is knocking on the door.** The pool is the object;
the international windows are the heartbeat; "what changed" is the briefing before a window, not a feed for its own sake.

## Cross-cutting decisions

- **Bilingual, Spanish default.** Every page exists under `/es` and `/en`, statically generated. Argentine Spanish is the reference
  copy (arquero, defensor, mediocampista, delantero, convocado, titular, fecha FIFA, la Selección, plantel, juveniles, Enfermería,
  Mi tablero); English is the translation. Dates and numbers format per locale. Event headlines are rendered by the site from
  each event's evidence, in either language, not templated in SQL.
- **Coverage.** Extend ingestion to the leagues where pool players actually are: at least MLS, Portugal, Mexico and Saudi Arabia,
  plus Turkey, the Netherlands and Belgium. ESPN covers them free; Highlightly box scores stay a bonus where available.
- **Selection context.** A hand-kept table of FIFA windows (dates, Argentina's matches, announcement date, expected or official) and
  squad lists per window (player, status: called, started, unused, withdrew). Seeded from AFA announcements, updated each window.
- **Ranking score.** Per position group, transparent, from what the data reliably has: share of available minutes, starts,
  competition strength, production per ninety for midfielders and forwards, clean-sheet and goals-conceded context for goalkeepers
  and defenders. Ratings and expected goals are shown as supporting columns when present but are not score inputs until box-score
  coverage improves. Age is a filter and a display, never a score input. The score is computed as of any date, so movement between
  windows is real. Every player page shows the components of the score.
- **Availability.** Three kinds of absence: injured (club listing, which ESPN does not provide for soccer, so this stays empty
  until a source exists), suspended (red card in the last match), absent (a regular with no minutes for three team matches).
  "Since" is the last match played. Return dates are shown only when a source gives one.
- **Competition filter, everywhere the same.** One control on every list page (Pool, Movers, Next cycle, La fecha, and the
  player search on Compare): the fourteen competitions as chips plus three presets (Top 5 de Europa; Sudamérica: Argentina and
  Brazil; Resto: the other seven). The selection travels in the URL (`comp=`) so a view can be shared, and the last selection is
  remembered in the browser as the default on the next list page when the URL carries none, with a visible "clear" chip so the
  narrowing is never silent. Home stays whole (it is the briefing), but every link out of Home carries the current selection.
  Settled 2026-09-08.
- **Follow list.** Stored in the browser; follow buttons on player pages and on every list row; a share link encodes the list in the
  URL (replace or merge on open); a "followed" filter on Pool, Movers and Next cycle; the compare page can be seeded from it.
  One compact JSON of every pool player is generated at build so the follow block renders client-side from a single file.
- **Notes.** Per player and per match, stored in the browser, never sent anywhere. A note has a date, free text and an optional
  verdict tag (convocar, seguir, no). Note marks on list rows; latest excerpt on the follow list; full trail on the player page.
  Export and import as a file, because the browser store can be wiped.
- **Charts, only where they show change or distribution:** minutes-per-match timeline (player, and as sparklines in Compare), rank
  history with windows marked (player), age against minutes per position with the pool as reference (Next cycle), where the pool
  plays (Home), and one radar on Compare (percentile axes, fixed order, values at the vertices). No gauges or donuts; the ranking
  is a list; Compare pairs the radar with aligned rows per metric.
- **Not building:** goal clips or highlight links, contract-expiry watch, club pages, standalone export-pipeline page, headline
  totals for their own sake, xG or ratings on the front page.

## Pages

1. **Home** — the briefing
2. **Pool** — the ranked, sortable, filterable list; availability and next match as columns; CSV download
3. **Player** — the evidence for one player
4. **Movers** — noticeable changes, ranked by importance
5. **Compare** — two to four players of the same position side by side
6. **Next cycle** — players aged 23 and under
7. **Mi tablero** — the personal layer: follow list, notes, export and import
8. **About the data** — footer only: methodology, sources, attribution, data-quality tables
9. **La fecha** — the round in review: one calendar week of the pool, who played, who did not, who is out

## Home

**Settled 2026-09-06.**

Purpose: in sixty seconds, where the pool stands, what changed, and how long until the next squad. Every block links into Pool,
Player, Movers or Next cycle; nothing on Home is the end of a journey. The question it answers: "if the list were announced
today, who is in form, and what should I have noticed this week?"

Top to bottom:

1. **Masthead.** One hand-written sentence of scope in each language, the data horizon, and the countdown line: next squad
   announcement in N days (marked "expected" until official), the window dates, and a link to the last list. During a window the
   line shows the called squad and Argentina's matches instead; between calendars it shows the next window's dates only.
   Beneath it, **the round so far** (added 2026-09-08): how many of the last squad and the top fifteen per position played this
   calendar week, how many did not play although their club did, how many are out, and the three or four standout lines of the
   round; links to La fecha.
2. **Follow list.** One dense line per followed player: name, club, position, rank and movement, availability, last match line,
   next match with kickoff, latest event in the last fourteen days, latest note excerpt. Sorted by next kickoff. Empty state: an
   invitation with three suggested players from the top of the ranking.
3. **The pool at a glance.** Four columns, one per position group, each with the top three or four by ranking score: name, club,
   minutes this season, movement arrow since the last window, last-squad mark.
4. **This weekend.** Matches of pool players in the next seven days, grouped by day, kickoff in Buenos Aires time, the pool players
   involved; ranked players first.
5. **Movers this week.** Six one-line changes ranked by importance: club changes, debuts, returns, big rank rises and falls.
   Link to the Movers page.
6. **Enfermería / Infirmary.** Injured, suspended and absent pool players: reason, out since (last match played), team matches
   missed, last-squad mark; return date only when a source gives one. Last-squad players first, then by ranking.
7. **Next cycle.** Three or four youngsters with the strongest trajectory this season, age and club; the retention-watch count
   (dual-nationals not yet tied) alongside. Both link to the Next cycle page.
8. **Where the pool plays.** The small bar chart by competition; the domestic-league note; "122 abroad" style figures live as
   captions here, not as a stat row.
9. **Footer.** Sources and attribution, About the data, language switch if not in the header.

Off the page: headline totals, xG and ratings, long tables, export history, data-quality detail.

Data work this page needs: the ranking score with as-of-date history; the windows and squads table; fixtures one week ahead;
suspension flag from red cards; the "absent" rule; season-start suppression for streak and surge events; events re-templated from
evidence; the coverage extension; the follow-list JSON.

## Pool

**Settled 2026-09-06.**

Purpose: the whole eligible pool in one list, ranked, so any argument about a player can be checked against the numbers in seconds.
The question it answers: "where does this player stand among the options for his position, and on what evidence?"

**Score, rank, state, arrow.** One score computation is the engine and is never displayed. It is computed per player per position
group as of every date from position-specific inputs (minutes share, starts, competition strength, production per ninety for
attackers and midfielders, clean sheets and goals conceded for goalkeepers and defenders). The **rank** is the score's position in
the group. The **state** is one word derived from score level and change, with availability states taking precedence:

| Spanish | English | Rule |
|---|---|---|
| En enfermería | Out | injured, suspended or absent (infirmary rules) |
| Recién llegado | Just moved | club change in the last 30 days |
| Volvió | Back | returned from an absence in the last 14 days |
| En racha | On fire | score high and rising fast |
| En alza | Rising | score rising clearly |
| En baja | Declining | score falling clearly |
| Poco rodaje | Short of minutes | score low because the minutes component is low, not out |
| Titular fijo | Established | score high and stable |

The **arrow** is the rank change since the last window's date, with places ("▲ 3"). Thresholds live in one place and are printed
on About the data with exact numbers. The player page justifies the rank in plain language per component, never as a total.

**Views.** Depth chart by default: the four position groups, each in its own rank order. A switch to the flat list for
cross-position sorting. Sortable by any column.

**Columns, in tiers** (a column picker turns tiers on and off; the URL carries columns, sort and filters so a view can be shared):

1. Always: rank and arrow, state, name, age, club, competition, last-squad mark, availability mark, note mark, follow button.
2. Form: minutes this season, share of available minutes, starts and appearances, last 28 days against the previous 28.
3. Production: goals, assists, per-ninety; goals conceded and clean sheets for goalkeepers and defenders.
4. Supporting, hidden by default: ratings and expected goals where present, market value, competition strength.
5. Next match: opponent and kickoff.

**Filters.** Position group; competition and country; age range; minimum minutes; eligibility status ("review" off by default);
last squad; availability; followed; the domestic-league lens (focus rules by default, widenable to the whole league); under-23
quick toggle linking across to Next cycle.

**Download.** The current view as CSV and the full pool as JSON, with a line naming the data horizon and the sources.

**Scale.** A few hundred players abroad plus the domestic focus set: the list stays client-side, filters and sorting are instant,
the page is static.

Off the page: career history, transfers, events, anything that needs a player's full context.

## Player

**Settled 2026-09-06.**

Purpose: everything the site knows about one player, arranged so the rank is explained before it is questioned. Where a reader
lands from any list, and where a scout writes. The question it answers: "why is he ranked where he is, is he trending up or
down, and has the national team noticed?"

Top to bottom:

1. **Header.** Name, club and competition, position, age, eligibility, state word with movement arrow; follow button and note
   count; one availability line when in the infirmary (reason, out since, matches missed).
2. **Why this rank.** Rank within the position and one plain-language line per score component (minutes share, starts,
   competition strength, production), each naming the number and whether it is above or below his own season rate. Prose, not a
   table, and never a total.
3. **Selection.** Last squad or not; call-ups over recent windows as a strip, one mark per window; caps and first cap where known;
   youth international record; a dual-national-not-yet-tied line when it applies.
4. **Form.** Minutes-per-match timeline with starters and substitutes distinguished and the windows marked; the 28-day against
   previous-28 comparison; rank history since the earliest computable date with call-ups marked.
5. **This season.** Season line per competition (appearances, starts, minutes, goals, assists, per-ninety; supporting columns only
   where box scores exist); recent matches table, each row with a note affordance and its match note if one exists.
6. **Events.** The player's own change log: club changes, debuts, streaks, returns, rank rises and falls.
7. **Career.** Seasons by club and competition; transfers with fees and value at the time; market value line; export context (age
   at first move abroad, destination, against the cohort median).
8. **Notes.** Entries in date order with verdict tags, the compose box, export of this player's notes. Match notes appear here and
   on their match rows.

Off the page: comparisons (Compare, seeded from here with one click); provenance and source ids (About the data and the JSON
download).

## Movers

**Settled 2026-09-06.**

Purpose: the changes worth a look, ranked by how much they matter to the national-team question, filterable enough that "what
changed for forwards in Italy this month" gets a short answer. The question it answers: "who moved, in which direction, and does
it change the argument?"

Kinds of change, each a line with the player, the fact and the date:

1. Rank rises and falls: several places in his position, both since the last window and over the last 28 days, labelled which;
   with the from-and-to rank.
2. State changes: became En racha, En alza, En baja, Poco rodaje; entered or left the infirmary.
3. Club changes: with the stronger-or-weaker verdict from competition tier, and a Recién llegado follow-up at his first minutes.
4. Breakthroughs: league debut, first start of a season, first goal in a competition.
5. Streaks: goals in consecutive matches, ten straight starts; streak-of-three noise suppressed at season start.
6. Selection: called, and left out of the list (inferred from absence, worded as "quedó afuera de la lista"), as a dated batch
   when a squad is published.

Importance: a weight from the kind of change, the size of the move, last-squad membership or proximity to the top of the position,
and competition tier. Default order; a switch orders by date. Weights printed on About the data.

Filters: position group, competition, kind, direction (up, down, neutral), last squad, followed, period (7, 14, 28 days, since the
last window).

Each line: the fact rendered from evidence in the reader's language, player linked, state word after the fact, note mark. No
severity dots. During a window the page leads with the squad batch; in a quiet week it says so rather than padding.

Off the page: the full ranking (Pool). The cohort's breakthroughs also appear on Next cycle.

## Compare

**Settled 2026-09-06.**

Purpose: the selection argument in one screen: two to four players of the same position, side by side, on the evidence the
ranking uses. The question it answers: "on what does one of these players beat the others, and by how much?"

**Choosing.** Position group first; a search box offering only that group; "seed from my follow list"; the URL carries the
selection. Up to four. Cross-position comparisons are refused politely.

**Radar, the one exception to the charts rule.** At the top: one radar with the compared players overlaid as outlines in distinct
strokes with a light fill. Every axis is the player's percentile among pool players of his position, so the scale is identical on
all axes; the axis order is fixed per position; the value is printed at each vertex. Five or six axes from the score components:
minutes share, starts, competition strength, production per ninety, 28-day form trend; goalkeepers and defenders swap production
for clean-sheet rate and goals conceded. The legend doubles as the header row.

**Rows beneath, players as columns:**

1. Header: name, club and competition, age, state word, rank with arrow, last-squad mark, availability.
2. The rank explained: the component lines as rows across players; best value marked once; the difference to the leader in plain
   units ("+12 percentage points", "0.14 fewer goals per ninety"). No total.
3. Form: minutes-per-match sparklines over the same date range, aligned.
4. This season: appearances, starts, minutes, goals, assists, per-ninety; supporting rows only where every compared player has
   them.
5. Selection: call-ups over recent windows as aligned strips; caps.
6. Context: club level, minutes against the previous season, age, market value.

Nothing is coloured by good or bad beyond the best-value mark. A note affordance per player column.

## Next cycle

**Settled 2026-09-06.**

Purpose: players aged 23 and under, looked at for trajectory rather than form: who is on a path to the senior pool, who is ahead
of his age, who Argentina risks losing to another federation, and who in the Argentine league is about to make the jump to Europe
or Brazil. The question it answers: "which youngsters should the senior staff already be watching, and why?"

**Cohort.** Aged 23 and under at the data horizon, eligible, with senior minutes in any tracked league. The Argentine league is
included in full for this page (not only the focus rules). Under-21 as a toggle.

**Trajectory**, the page's sort and its own metric, defined so it can be printed: minutes share this season, weighted by competition
tier, expressed relative to the median of pool players at the same age in the two seasons of history. Above 1 means playing more
at a higher level than pool players did at that age. Its components are shown per player like the rank components on the player
page. It rewards playing a lot at a high level young; age alone never decides the order.

Top to bottom:

1. **Masthead.** Cohort definition, count, and the cohort calendar (next under-20 and under-23 fixtures or tournaments, hand-kept).
2. **Ahead of the curve.** Age against senior-club minutes this season, one point per youngster, one panel per position group, the
   current senior pool as a reference band; hover or tap names a point; followed players marked.
3. **The cohort list.** Pool machinery filtered to the cohort, sorted by trajectory, with trajectory columns instead of form tiers:
   minutes this season against last, competition tier now against last season, age at first senior minutes, first move abroad if
   it has happened; follow and note marks.
4. **Retention watch.** Dual-nationals not yet tied to any senior team, with citizenships and any youth caps for another country,
   sorted by trajectory. A heading, not a footnote.
5. **Breakthroughs.** Movers filtered to the cohort: league debuts, first starts, first goals, first call-ups to any Argentina side.
6. **Youth international record.** Who has represented which Argentina youth team, from Wikidata.
7. **The pipeline as context.** Age at first move abroad and destinations from the Transfermarkt history, with the current cohort's
   own moves placed on it; the bar chart by destination and the line by year.

Off the page: senior form states and ranks as the primary sort; the infirmary as a block.

## Mi tablero

**Settled 2026-09-06.**

Purpose: the personal layer in one place: what you follow and what you have written, with the means to keep it safe.

Top to bottom: the follow list as the same dense lines as on Home, with remove buttons and the share link; notes grouped by
player, newest first, each with date and verdict tag, editable in place, match notes under their match line; export everything as
one file and import from one, with a warning line that clearing site data loses it; a "compare my followed players" shortcut per
position group. Empty state: a short explanation of following and notes, with the same three suggested players as Home.

Off the page: anything about the pool itself.

## La fecha (The round)

**Settled 2026-09-08.**

Purpose: the round as one picture, so the question "what did the pool do this week?" has an answer that lines players of the same
position up next to each other, including the ones who did not play. The question it answers: "who played this round, how much,
with what, and who was missing?"

**A round is a calendar week**, Monday to Sunday in Buenos Aires time, so a midweek league match sits in the same round as the
weekend. The page opens on the current week (partial, and says so) and steps back week by week through the two seasons of data.

**Row per player per week**, matches as sub-lines. A player with two matches shows both, each with result, role (started, came
on, unused) and minutes; the row carries the week's totals: minutes, starts out of matches, goals and assists, rating where box
scores exist. Sorting and side-by-side reading use the totals; a "matches" column keeps 90′ from one match apart from 90′ across
two. Each position group's header says how many matches each club played.

**Categories, decided for the week:**

1. **Played**: any minutes in the week.
2. **Did not play although the club played**: bench, unused or absent in every match; the club's results alongside. The quiet
   signal a squad list depends on.
3. **Out**: the infirmary as of that week (reason, since, matches missed).
4. **Club did not play**: a short list, so an empty row is never mistaken for an absence.
5. **Standouts**: the lines of the round from Movers dated inside the week (braces, debuts, returns, big rank moves).

Grouped by position in rank order; state word and last-squad mark on every row; note affordance per match line.

**Scope and filters.** Default scope: the last squad, the top fifteen of each position, and followed players; widenable to the
whole pool. Filters: position group, the shared competition filter, last squad, followed; a week picker. URL carries the week
and the filters.

**Honest limit, printed in the footnote:** the data covers the fourteen domestic leagues. Champions League, Copa Libertadores
and domestic cups are not ingested, so a midweek continental match does not appear and the player shows one match that week.
Extending coverage to those competitions is a separate data item; football-data already provides Champions League fixtures.

Off the page: the ranking itself (Pool), the forward look (Home's "this week").

## About the data

**Settled 2026-09-06.**

Purpose: the trust page, reachable from the footer only. Every rule the site applies, with its exact numbers, so nothing on the
other pages is a matter of opinion. Bilingual, drier than the rest of the site.

Sections: what the site is and is not; data horizon and refreshes; sources, terms and attribution; eligibility rules; matching
across sources; minutes derivation and validation; ranking score inputs per position, state thresholds, movement definition;
infirmary rules; trajectory definition; importance weights on Movers; the windows and squad table and its maintenance; data-quality
tables (coverage by league, box-score share, source agreement, unresolved matches); the follow-list and notes privacy statement.

## Data work the briefs depend on

In build order:

1. Coverage extension: ESPN ingestion for MLS, Portugal, Mexico, Saudi Arabia, Turkey, the Netherlands, Belgium; teams, rosters,
   scoreboards, summaries, athlete profiles; competition tiers in the seeds; two-season backfill.
2. Fixtures one week ahead for every tracked league, kept fresh by the daily run.
3. Windows and squads table: FIFA windows with dates and Argentina's matches; squad lists per window with statuses; expected
   announcement dates; under-20 and under-23 calendar.
4. Ranking score per position as of every date; rank, state, arrow; thresholds in one place.
5. Infirmary: injured from rosters, suspended from red cards, absent from three team matches without minutes.
6. Trajectory metric and the age-against-minutes reference from the pool history.
7. Movers: importance weights, season-start suppression, selection events, state-change events, rank-move events.
8. Events rendered from evidence in both languages; every label as a dictionary; Argentine Spanish reference copy.
9. Follow-list JSON and the per-player compact data for Home and Mi tablero; notes and follow storage in the browser.
10. Published snapshot and the site's data package extended for all of the above.
11. (Added 2026-09-08) La fecha: a per-player-per-week query over `fct_player_match_stats` and `fct_match` with the week's
    matches, totals and category, plus the infirmary and the Movers of the week; no new ingestion. Shared competition filter:
    one client control and one URL parameter across the list pages, with presets and the remembered default.
12. (Backlog) Continental and domestic cup coverage (Champions League via football-data first; Copa Libertadores needs a source),
    so a round shows every match a player played.
