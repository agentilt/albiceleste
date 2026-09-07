# Phase 6 — The site, built to the page briefs

**Date:** 2026-09-07
**Deliverable:** the eight pages of `page-briefs.md`, functional first, in Argentine Spanish (default) and English, statically
generated from the Parquet snapshot. The visual pass in Claude Design comes after this, on the components this phase added.

## Routes

Every page lives under `/es` and `/en` (`/` and any un-prefixed path redirect to the Spanish edition; slugs stay in English so
shared links survive the language switch):

| Path | Brief | Client-side state |
|---|---|---|
| `/{locale}` | Home: countdown line, follow list, pool at a glance, movers of the week, infirmary, this week's matches, next cycle, where the pool plays | follow list from `localStorage` |
| `/{locale}/pool` | Pool: depth chart by default, flat list on a switch, column tiers, filters, CSV/JSON download | view, filters, sort and columns in the URL |
| `/{locale}/players/{key}` | Player: why this rank, selection strip, minutes timeline with announcement markers, rank history, season lines, recent matches with match notes, events from evidence, career, notes | notes and follow |
| `/{locale}/movers` | Movers: importance order, filters, period, squad batch first | filters in the URL |
| `/{locale}/compare` | Compare: up to four of one position, radar on percentiles, aligned rows | selection in the URL (`?p=k1,k2`) |
| `/{locale}/next-cycle` | Next cycle: age-against-index panels, cohort list by trajectory, retention watch, breakthroughs, youth record, pipeline context | list filters in the URL |
| `/{locale}/board` | Mi tablero: follow list with remove and share link, notes by player, export/import | the whole personal layer |
| `/{locale}/about-data` | About the data: every rule with its numbers, parameter tables, windows, data quality | — |

Static data routes: `/data/index.json` (search index with position group), `/data/pool.json` (compact record per pool player
for the follow list, 420 KB raw), `/data/players/{key}` (Compare record: percentile axes, season, sparkline, call-ups).

3,691 static pages; the production build takes about 25 s on the Parquet snapshot.

## Data package additions (`packages/data/src/site.ts`)

- `getPool()`: one row per pool player (state, rank, arrow, components, season line for the current league, 28-day form,
  next and last match, the strongest event of the last fourteen days). Read once per build and shared by every page.
- `getMovers()`, `getWeekend()`, `getTrajectory()`, `getAgeBands()`, `getPlayerExtra()`, `getComparePlayer()`,
  `getPoolJson()`, plus `getWindows()`, `getSquadLists()`, `getYouthEvents()`, `getMethodParameters()`.
- Five small marts were added so the site reads the hand-kept seeds from Parquet: `selection_windows`, `squad_lists`,
  `youth_events`, `nt_status`, `method_parameters` (thresholds, position weights and event weights in one table).
- Compare percentiles are computed in TypeScript over the pool: for each axis, the share of the position group at or below the
  value (goals conceded inverted). Axes per position are in `COMPARE_AXES`.

## Site conventions

- **Dictionaries.** `apps/web/lib/i18n.ts` holds every label in both languages; pages read `t(locale)`. Argentine Spanish is
  the reference copy. Dates and numbers format with `Intl` (`es-AR` / `en-GB`); kickoffs in Buenos Aires time.
- **Events from evidence.** `apps/web/lib/events.ts` renders each event type from its JSON evidence in either language; the
  SQL headline is not used by the site.
- **Personal layer.** `apps/web/lib/store.ts`: follows and notes in `localStorage` under one key, read through
  `useSyncExternalStore`; export/import as a JSON file; share links carry keys in `?follow=`.
- **URL state.** `apps/web/lib/urlstate.ts` keeps filters, sort and selections in the query string on static pages (wrapped in
  `Suspense`).
- **Countdown.** `apps/web/lib/countdown.ts` decides the masthead line from the windows seed and the build date.

## UI package additions (`packages/ui`)

`RankArrow`, `StateWord`, `Tag`, `RankList`, `Line`, `CallStrip`, `FollowButton`, `NoteMark`, `NoteComposer`, `NoteList`,
`Segmented`, `Radar`, `Sparkline`, `RankHistory`, `AgeScatter`; `SortableTable` with custom renderers and controlled sorting;
`MinutesTimeline` with markers; `Header` with `homeHref`; data cells no longer wrap. Previews for the design sync are in
`.design-sync/previews/`; the next `/design-sync` run pushes them.

## Decisions taken while building

- Movers default to the last 28 days rather than "since the last list", so the World Cup list of 28 May does not lead the page
  a hundred days later; the window period is one click away.
- "This week" on Home keeps matches with a last-squad player or a top-10 player in his position; the domestic league alone
  would otherwise fill the block.
- The Compare trend axis is the 28-day minutes change, already public, rather than a delta of the hidden score.
- Injured never fires (ESPN has no soccer injury data), so the site says "ausente desde" and counts the club's matches.
