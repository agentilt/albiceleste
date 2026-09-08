# Design review, 8 September 2026

Nine page reviews run by a design-review agent against the local production build (commit 0524578) at 1280, 820 and 390
widths, in both locales. Screenshots live in `.design-sync/.cache/shots/review/` (not committed). Per-page reports follow the
themes; the fix order at the end is the working plan.

## Cross-cutting themes (the shared fixes that clear findings on several pages at once)

1. **Explanations are back on every page except Home.** Ledes under the page title, `Note` footnotes (Movers prints its lede
   twice, Próximo ciclo has six, Compare has three explanations of the same thing). Rule already agreed for Home: one hover
   "?" per block, method detail lives on Sobre los datos. Pages: Round, Pool, Player, Movers, Compare, Next cycle, Board.
2. **Column headers repeat per position group.** Round (per category × group), Pool ("Por puesto" default, 4×), Next cycle
   (retention table repeats the cohort table's header for a subset). One table per block with a group sub-row, as SquadSheet does.
3. **Tables clip on the phone with no scroll cue**, hiding the club and the follow star: Pool (only #/Mov/State/Player/Age
   visible), Round (stat columns off-screen), Cohort (17 columns, 2.4× scroll at 820). Pool clips even at 1280 with a long club
   name. Needs: column priorities (hide low-priority columns under a width), truncated club/competition, a visible scroll edge,
   and `aria-sort` on the `th`.
4. **Unbounded lists.** Movers 547–1,090 rows (22,000 px), Cohort 453 rows (20,000 px), Player 5,200 px, Pool 1.8 MB HTML.
   Caps with "show all", or grouping.
5. **Touch targets and chips.** `.chip` is 28 px tall everywhere (dozens per page); Hint 17 px; Quitar 35×17; Compare × 8×15;
   "+ nota" 32×17. `.chip` has no hover state and no disabled style (NoteComposer's Guardar looks pressed when disabled).
6. **Segmented control ARIA**: `role=radio` with both `aria-checked` and `aria-pressed`, no arrow-key navigation, no
   accessible name on Round/Pool. Import banner actions rendered as toggles.
7. **Charts**: hardcoded English accessible names on every SVG (also on /es); four AgeScatters share one name; ~400 tabbable
   per-point links in the scatters form a keyboard trap; fixed 900-px viewBoxes scale tick text to ~4 px at 390.
8. **Muted grey fails AA on paper**: #6d7884 on #f4f8fb is 4.21:1 (verified). Used for meta lines, footer, filter labels,
   state words, chart ticks. #5f6b78 gives 5.09:1 with the same look. Gold on white is 2.95:1: keep it a mark, never text.
9. **Header wraps to four rows on the phone** (wordmark / nav / nav / search + language), pushing content ~220 px down.
10. **Section vocabulary drifts.** Home uses Panel (boxed, mono uppercase label, stripe); the others use bare `Section`
    h2 + rule, and inner group headers ("Arqueros · 7") are plain text. Compare's dividers are bold text in a `td`.
11. **Half-empty boxes**: SquadSheet columns (GK 3 rows beside 8), Next cycle youth beside pipeline (135 px of content in a
    1,010 px column), Board notes grid, Compare empty state.
12. **Data and copy bugs** found on the way: position untranslated on /es player pages ("Forward"); "altura 1.85 cm";
    "1 partidos"; "other / not covered" as the biggest export bucket; English country names and competition slugs
    ("serie-a") on /es; raw ISO date in the Pool note; mixed decimal locales in Compare diffs ("0,6 -0.4"); Movers empty
    state says "Semana tranquila" for a 3-month window; Otamendi "convocado" beside "Retirado"; duplicate "Selección" row.
13. **Compare logic**: radar draws a player without a ranking as zero on every axis; the search is silently narrowed by the
    site-wide competition filter the page never shows; the position picker is a dead end on the empty state; a refused
    cross-position key still takes one of the four slots; "Traer de mi lista" does nothing when the list is empty.
14. **Movers has no follow star**, and Board shows the share confirmation in the export block at the bottom of the page.

15. **Reference and chrome bugs**: unknown routes and bad player keys show Next's bare English 404, not the bilingual page;
    the `#home`/`#watch` anchors that every Home hint links to land with the heading scrolled off; the method-parameter
    descriptions on Sobre los datos are English-only; the repo URL there is plain text.

## Fix order (working plan)

Shared primitives first, because they clear findings on every page at once; then one page at a time in nav order, each
verified with screenshots at 1280 and 390 before moving on.

1. **Tokens and base**: muted → #5f6b78; `.chip` 32 px tall with hover and disabled styles, 40 px on coarse pointers; Hint,
   follow star and small buttons get a 40 px hit area; scroll-cue edges on every `overflow-x-auto` table wrapper.
2. **Segmented**: proper radiogroup (arrow keys, one tab stop) with an accessible name; plain buttons for one-shot actions.
3. **Header**: on the phone, wordmark + language + search on one row, nav as one horizontally scrollable row (two rows total).
4. **Charts**: accessible names passed in from the page (localised); scatter points out of the tab order; mobile sizing so
   ticks stay ≥ 10 px (scroll the chart, do not shrink it).
5. **SortableTable / StaticTable**: `aria-sort` on `th`; column priorities so the phone drops secondary columns instead of
   clipping; club and competition truncated; the follow star never off-screen.
6. **Home**: SquadSheet rows responsive (name truncates, club stays; single column under 640 px); short columns filled to the
   tallest with empty slots ruled the same; PanelRows and compact FollowList truncate the secondary text, never the name;
   compact empty state sentence; drop the dead "marked" track.
7. **La fecha**: one table per category with position sub-rows; one line per player with the matches folded into the facts
   cell; lede and footnote become hints; enfermería treatment for club-idle rows; mobile stacked rows.
8. **Plantel**: one header per table; lede and scope paragraphs → hint; overflow fix from step 5; input ids; formatted date.
9. **Jugador**: translated position, height, plural caps, chart names; "Por qué" prose → stat row + hint; sections with no
   data collapse; Carrera/Pases behind a disclosure.
10. **Movimientos**: rows rebuilt on RankList (rank, arrow, delta, club, facts) in a Panel; default cap with "show all";
    follow star; one filter group per row; the lede once, as a hint; period-aware empty copy.
11. **Comparar**: radar skips missing axes; competition filter shown or not applied; position picker stays; slot count from
    accepted players; one hint; real section headings; duplicate row; locale-formatted diffs; × as a button; seedNone copy.
12. **Próximo ciclo**: cohort table capped with show-all; retention table without the duplicate header (a mark in the cohort
    table instead); youth list with clubs in PanelRows; export bucket label and country/competition names localised; six
    Notes → hints; lede trimmed; youth/pipeline grid re-balanced.
13. **Mi tablero**: Panel + compact FollowList; lede and Note → one hint; message next to its control; undo for removals.
14. **Sobre los datos and chrome**: anchors with scroll margin; bilingual 404; localised parameter descriptions; repo link;
    sticky mini-TOC; h3 captions in ink-2.
15. Later: Pool HTML weight (lazy "Toda la base"); favicon; Claude Design re-sync after tokens settle.

## Per-page reports

## Home (/es)

**Verdict**: The dashboard register (mono labels, stripe marks, tabular rank/stat pairs, club beside every name) reads correctly at 1280 and the English variant has no overflow. But SquadSheet breaks below desktop width (text overlap at 390, vanishing club names at 820), and "boxes filled" is violated at 1280 where the 3-row GK column and 7-row MID column leave blank gaps beside 8-row columns.

- [Blocker] Name/club/stats text overlaps illegibly across the squad sheet at 390 — home-390-full.png — name span shrink-0, no truncate inside a 1fr track (SquadSheet.tsx:51-59); truncate the name or stack name/club/stats below ~640px.
- [Blocker] "Mi lista" rows collapse the name to one letter + ellipsis on phone ("Nahuel Tenaglia" → "N…") because the match/kickoff string on the right is shrink-0 — home-390-full.png — FollowList.tsx:105 compact li; let the match text truncate instead, or drop the kickoff clause on narrow widths.
- [High] Club name collapses to 0px width in the squad sheet at 820 for any player with a longer name (computed width 0) — home-820-full.png — SquadSheet.tsx:53-59.
- [High] GK (3 rows) and MID (7 rows) columns leave large white space beside the 8-row DEF/FWD columns — home-1280-viewport.png — SquadSheet Columns: each position an independent ol, no cross-column fill; real slot counts from page.tsx:70.
- [High] text-muted (#6d7884) on paper measures ~4.2:1, below AA 4.5:1; on white ~4.5:1 — countdown meta line (page.tsx:125 font-mono text-sm text-muted on paper) and Footer (Header.tsx, text-xs text-muted on paper); darken muted or put on surface.
- [Medium] Right-hand facts truncate mid-content, cutting the final score or opponent — "Los de la semana"/"Señales de alarma" — home-1280-full.png ("...vs 1. FC Union Berlin…", "...@ Royal Charleroi SC 3–2" cut at 390) — Panel.tsx:35 PanelRows right span capped at 58%, only a title tooltip; the left club also truncates.
- [Medium] Header wraps to 4 visual rows on phone (logo, two nav lines, search+lang) — home-390-viewport.png — Header.tsx Nav flex-wrap + 6 items; pushes the squad sheet a full viewport below the fold.
- [Medium] "Mi lista" empty state on Home never renders its sentence because compact suppresses it, leaving only "Para empezar:" — FollowList.tsx:84.
- [Nit] Hint "?" targets ~17×17px on phone — Hint.tsx:3 (h-4 w-4).
- [Nit] Desktop 1280×800 needs ~620px extra scroll (1419px content).
- [Nit] SheetName.marked hardcoded false on Home (page.tsx:63) yet still reserves a grid track/gap on every row.

Top 3: (1) SquadSheet row responsive (truncate name, or stack under ~900px); (2) fill/resolve the short GK/MID columns; (3) invert truncation priority in PanelRows and compact FollowList (protect name, club, score; truncate opponent/kickoff).
Shots: home-1280-viewport.png, home-1280-full.png, home-1280-hint-focus.png, home-1280-en-viewport.png, home-820-full.png, home-390-viewport.png, home-390-full.png.

## La fecha (/es/round)

**Verdict**: Not had its design pass: the news-site register Home was redesigned away from. A long editorial lede and a prose footnote reappear, column headers repeat once per position group inside every category, and row heights ride the height of each player's match sub-lines instead of Home's fixed-row Panel pattern. On mobile the per-table horizontal scroll hides the stat columns and the follow star off-screen. Interaction logic (week nav, scope, comp chips, note composer) works; the problems are structural/visual.

- [Blocker] Stat columns and follow-star clipped off-screen on phone — position-group tables (390px) — round-390-filters.png — the overflow-x-auto table is 458px in a 348px container, PJ/JUGÓ/TIT./MIN./G+A/PUNTAJE and the follow star sit past the fold with no scroll affordance; RoundExplorer.tsx table.data per position group — needs a mobile stacked layout, not a scrollable table.
- [Blocker] Column headers repeat once per position group per category — "DEFENSORES · 3" / "MEDIOCAMPISTAS · 2" each get their own header row — round-1280-scroll1.png — RoundExplorer.tsx:174-195 renders one <table> per (category × pos_group). One table per category with a pos_group sub-row (like SquadSheet/Panel) would remove the repetition.
- [High] Long explanatory lede — under "La fecha" title — round-1280-viewport.png — d.round.lede (i18n.ts:352) via PageTitle lede; move to a Hint.
- [High] Footnote is a visible caveat paragraph — page bottom — round-1280-bottom.png — <Note>{d.round.footnote}</Note> (RoundExplorer.tsx:228); should be a Hint next to the section/page title.
- [High] Row heights not equal — "played" tables, e.g. Santiago Ramos (2 lines) next to Gonzalo Escobar (1 line) — round-1280-prevweek-rows.png — MatchLine stacks one line per match under the name (RoundExplorer.tsx:83-87), rows range 1–3+ lines with vertical-align top numeric cells.
- [High] Category treatment inconsistent — "El club no jugó"/"Poco rodaje" full stat tables vs the flat one-line list for "En enfermería" — round-1280-bottom.png — the enfermería list (RoundExplorer.tsx:204-227) is dense and Home-like; the other categories force a 6-column table mostly 0/– for club-idle players; unify on the flat-line treatment, table only for players with real numbers.
- [Medium] Segmented control has no accessible name — "En la mira / Todo el plantel" — role=radiogroup aria-label null — RoundExplorer.tsx:131-138 doesn't pass label to Segmented (filters.tsx:40-50).
- [Medium] Position sub-headers break the mono/stripe vocabulary — "ARQUEROS · 1" — round-1280-scroll1.png — font-sans text-xs uppercase (RoundExplorer.tsx:171), no stripe; category h2s ("Jugaron", "No jugaron…") are large black Chivo headlines with a rule, closer to an article section break than a panel bar.
- [Medium] Disabled "Guardar" looks identical to enabled — note composer — round-1280-notecomposer.png — NoteComposer (Notes.tsx) hardcodes aria-pressed="true" and relies on disabled, but .chip has no disabled styling in base.css.
- [Nit] Muted small text dense and borderline contrast — match sub-lines (date, "titular · 90'") text-xs text-muted throughout MatchLine.
- [Nit] Chips ~28px / follow-star ~15px tall (round-390-filters.png), under 40–44px touch targets; shared with Home (filters.tsx, Follow.tsx).

Top 3: (1) one table per category or PanelRows-style equal rows, no repeated headers; (2) lede + footnote → Hint; (3) mobile: stacked card per player or a visible scroll cue.

## Plantel (/es/pool)

**Verdict**: Right bones (dense chip filtering, tabular numbers, working sort, clean empty state; all interactions work, no console errors). Not design-passed: opens with the explanation paragraph pattern Home removed, the default view repeats the full column header four times, and the fixed-width nowrap cells clip the follow star and rightmost stat columns with no scroll affordance — completely on mobile, and on tablet/desktop once a club name is long.

- [Blocker] Mobile table shows only #/Mov./State/Player/Age — club, competition, stats and follow star off-screen, no scrollbar/fade cue — pool-390-4-table-default.png, pool-390-2-full.png (scrollWidth 1134–1220 vs 348 container) — truncate Club & Competition and hide low-priority columns below ~600px (SortableTable.tsx).
- [Blocker] Long club name (or "Toda la base") pushes the table wider than its container and clips CAMBIO and the follow star at 1280 too — pool-1280-11-overflow-clip.png (up to 151px over) — fixed column widths / ellipsis instead of nowrap; visible scroll affordance.
- [High] Default "Por puesto" view repeats the 13-column header per position group (4×) — pool-1280-2-full.png — PoolExplorer.tsx:230-240 renders a SortableTable per group; share one header or default to the flat list.
- [High] 3-line lede plus a full-paragraph scope explanation always visible, repeated near-identically in the footer Note — pool-1280-1-viewport.png — shorten pool.lede/pool.scopeNote; method detail behind a Hint.
- [High] aria-sort set on the <button> inside each <th> rather than on the <th> — SortableTable.tsx:141-149.
- [Medium] Segmented renders role=radio with both aria-checked and aria-pressed — filters.tsx:40-50.
- [Medium] .chip has no :hover rule; densest chip surface on the site (5 filter rows) — base.css:124-137.
- [Medium] Chips/segmented ~28px tall on phone — pool-390-1-viewport.png — bump padding at small viewports.
- [Medium] Position-group headers ("Arqueros 7") bare h2 + rule, no stripe — PoolExplorer.tsx:234 — reuse Section.
- [Medium] HTML ~1.83MB (1,141 rows embedded, ≤92 shown by default); fast only on localhost (FCP 68ms) — pool/page.tsx:21 — lazy-load "Toda la base" client-side.
- [Nit] Three numeric inputs (age min/max, min minutes) have no id/name — PoolExplorer.tsx:207-212.
- [Nit] pool.downloadNote/scopeNote inserts a raw ISO date ("2026-09-07") while the footer formats it — i18n.
- [Nit] text-muted carries the most frequent state word ("Estable") at 14px.

Top 3: (1) table overflow: club and follow star never off-screen without warning; (2) no repeated header per position group; (3) lede/scope paragraphs → Hint.

## Jugador (/es/players/<key>)

**Verdict**: Header line (state word + rank + arrow) answers in seconds and reuses Home's typographic system. Past the header it reverts to the pre-redesign register: permanent explanatory prose instead of hover hints, no Panel/PanelRows, and on lower-activity players table/chart sections render full chrome around nothing. Several concrete bugs (untranslated position, hardcoded English chart names, singular count, height unit) independent of design.

- [Blocker] Position leaks in English on /es — "AS Roma, Serie A · Forward · 32" (also Midfielder, Goalkeeper) — player-1280-viewport-top.png — translate p.primary_position via d.pos before interpolating in players/[key]/page.tsx:49.
- [Blocker] Empty "Carrera" table renders full header + one dash row beside a populated "Pases" table — Javier García (Q2733986) — player-1280-full-domestic.png — suppress when history.length===0 (page.tsx:207-223).
- [High] No Home vocabulary: only Section/StaticTable/Note; the ranking rationale is four permanent sentences ("Por qué…") — page.tsx:3,97-118 — swap for a compact stat row + Hint.
- [High] Chart labels illegible at phone width: fixed viewBox 900 scaled to 347px → 11px ticks ≈ 4.2px — charts.tsx MinutesTimeline, RankHistory — player-390-minutes-chart.png, player-390-rank-chart.png — scale font with container or render narrower viewBox on mobile.
- [High] All SVG charts carry hardcoded English aria-labels ("minutes per match", "rank history") and yLabel="market value" at page.tsx:242 — pass translated strings.
- [High] NoteComposer submit always aria-pressed="true", no disabled visual — Notes.tsx:61 — player-1280-notes-composer.png.
- [Medium] CallStrip marks 14px hollow/dashed squares with only a mouse title; not focusable; nothing on touch — Selection.tsx:9-21 — player-1280-callstrip.png — persistent caption or focusable aria-label per mark.
- [Medium] Grammar: "1 partidos con la Selección mayor" — i18n player.caps — singular/plural branch.
- [Medium] Data: "altura 1.85 cm" — page.tsx:254 raw height_cm — format (185 cm or 1,85 m).
- [Medium] "+ nota" buttons ~32×17px in a 25-row table — PlayerNotes.tsx:66-69 — pad hit area.
- [Medium] Empty-state stubs render full section chrome for a dash: minutes-chart fallback and "Cambios registrados" — page.tsx:148-156, 191-193 — collapse.
- [Medium] Page ~5,188px tall at 1280 (9 sections, 4 tables, 2 charts) — player-1280-full-dybala.png — disclosure/tabs for Carrera/Pases.
- [Nit] "Últimos partidos" role column has an empty header cell — PlayerNotes.tsx:55.
- [Nit] Muted mono at 10–11px throughout charts/event dates/asides.
- Env note: phone tab reported innerWidth=612 despite 390 emulation (check).
Positives: focus-visible works everywhere; no console errors; heading order correct; /en no overflow.

Top 3: (1) "Por qué" prose → compact stat row + Hint; Panel/PanelRows for Selección/Form; (2) never render chrome around zero data; (3) fix leaking English strings.

## Movimientos (/es/movers)

**Verdict**: Reads as an endless changelog, not a dashboard. Six filter rows before any data; rows are full sentences with numbers buried mid-clause instead of the Rank.tsx arrow vocabulary; renders every mover (547–1090 rows, ~22,000px tall) with no cap. Visible lede paragraph duplicated verbatim at the bottom; bare variable-height list lines with no Panel.

- [Blocker] Unbounded list — 28-day view 547 li, "since announcement" 1090; scrollHeight 22,325px — movers-1280-1-viewport.png, movers-1280-4-window-allcomp.png — cap the default view (top N + expand) in MoversExplorer.tsx.
- [Blocker] No follow star in the list — MoverLine.tsx only imports NoteCount (null at 0) — add FollowStar per row.
- [Blocker] Lede paragraph under the H1 AND duplicated verbatim in a <Note> at the bottom — movers-1280-1-viewport.png, movers-1280-3-kind-called.png — drop/Hint the lede; remove the duplicate at MoversExplorer.tsx:134.
- [High] Rows are prose ("subió del 20 al 4 entre los delanteros en 28 días") — RankArrow/RankList unused in MoverLine.tsx — render rank + arrow + delta as a compact column, sentence secondary.
- [High] Rows unequal height and unboxed — bare on paper, wrap to 1–2 lines ("Joaquin Freitas" wraps) — movers-820-1-viewport.png — adopt Panel/PanelRows or table.data.
- [High] Two filter groups crammed into one FilterRow ("ORDENAR POR" inside PERÍODO, "DIRECCIÓN" inside PUESTO via span ml-4); at 820/390 the second label lands orphaned — movers-390-1-viewport.png — own FilterRow each (MoversExplorer.tsx:60-79, 88-106).
- [High] Segmented: button role=radio with aria-checked AND aria-pressed; no roving tabindex/arrow keys — filters.tsx — pick one pattern.
- [Medium] Empty-state copy "Semana tranquila" even when period is 28 days / since announcement — movers.quiet in i18n.
- [Medium] Squad-batch heading "Lista para Copa del Mundo 2026" is a bare h2 text-xl, no stripe — MoversExplorer.tsx:116 — use Section.
- [Medium] Chips 28px tall; ~40 of them before content — base.css .chip.
- [Medium] 12px muted labels pervasive (PERÍODO/TIPO/PUESTO/DIRECCIÓN/COMPETENCIA, date column, "Filtro recordado…") — FilterRow, MoverLine date span.
- [Nit] Contradictory: Otamendi "convocado para Copa del Mundo 2026" beside "Retirado" in red.
- [Nit] Tournament name repeats in the batch heading and in every row's fact string.
- [Nit] "547 movimientos · 10 de ago de 2026 → 7 de sept de 2026" plain body text, not mono meta.

Top 3: (1) Panel/RankList equal rows, rank + arrow + delta as data, cap default; (2) FollowStar per row, one lede only; (3) split filter rows, fix Segmented ARIA.
Shots: movers-1280-1-viewport.png, movers-1280-3-kind-called.png, movers-1280-4-window-allcomp.png, movers-1280-5-en.png, movers-1280-6-focus-period.png, movers-820-1-viewport.png, movers-390-1-viewport.png.

## Comparar (/es/compare)

**Verdict**: Dashboard bones (mono table headers, celeste rule, tabular numbers, MAX=4/position-lock logic) but predates the Home pass: three stacked explanations, un-semantic section dividers, no Hint. Two functional bugs: an invisible cross-page competition filter and a radar that draws "no data" as zero. Responsive solid (no body overflow); mobile problem is touch-target size.

- [Blocker] Radar draws unranked players as zero ("worst on every axis") — compare-1280-6-two-players-full.png, compare-1280-8-four-players-full.png — charts.tsx pt(i, v ?? 0); skip the vertex / omit the series when pct is null.
- [Blocker] Search silently filtered by the shared competition filter which this page never shows — compare-1280-4-search-alvarez.png (0 hits for "Alvarez") — CompareTool.tsx:60 comp.matches(e.league); surface the filter or stop applying it.
- [Blocker] Position picker dead end on the empty state — clicking "Arqueros" replaces the Segmented with plain text, no way back; "Vaciar" disabled with 0 players — CompareTool.tsx:59,77-85; keep Segmented visible until a player is chosen.
- [High] "Quitar" (×) ~8×15px on phone — CompareTool.tsx:124 — real button box.
- [High] A refused cross-position key still occupies a MAX slot — CompareTool.tsx:32,86 gates on keys.length not players.length.
- [High] Three permanent explanations (lede, axis-definition list CompareTool.tsx:104-110, near-duplicate Note at :205) — compare-1280-2-full.png — one Hint.
- [High] "Selección" title duplicated back-to-back — CompareTool.tsx:180-186 SectionRow then Row with the same label.
- [Medium] Decimal locale mixed in one cell ("0,6 -0.4", "0,09 -0.91 cada 90") — CompareTool.tsx:260-274 formatDiff raw JS numbers → fmtDec.
- [Medium] Section dividers are bold title-case Chivo in a <td>, not headings, third type style — CompareTool.tsx:225-233 vs Panel.tsx:12.
- [Medium] Radar/sparkline accessible names generic ("radar", two identical "minutes per match") — charts.tsx.
- [Medium] Empty state: one sentence + chip row over ~500px blank — compare-1280-9-empty.png — worked example / seeded content.
- [Medium] "Traer de mi lista" no-ops silently when the follow list is empty — CompareTool.tsx:62-68; d.compare.seedNone defined but never rendered.
- [Nit] Radar column ends far short of the table, blank gap; worse at 820 (compare-820-2-full.png).
- [Nit] Console: form field should have id or name (×2) — SearchInput.tsx:55.
- [Nit] Chips ~29px tall.
- [Nit] CallStrip explanation only a title attribute — Selection.tsx:17.

Top 3: (1) radar null handling; (2) show or drop the competition filter on Compare search; (3) one hint per block, real headings styled like Panel, fix duplicate "Selección".

## Próximo ciclo (/es/next-cycle)

**Verdict**: Leftover news-site copy (Hero-scale lede, six explanatory footnotes) around a useful but unbounded explorer. Broken: a ~400-link keyboard trap inside the scatter charts, and unlocalized/placeholder strings ("other / not covered", "serie-a", "United States") on the Spanish page. Conceptually the site's most interesting page.

- [Blocker] Scatter charts are a ~400-stop keyboard trap — 4 AgeScatter charts contain 27+126+130+114 tabbable per-point <a> links before the filters — charts.tsx:349 — tabIndex -1 or drop per-point links.
- [Blocker] "Por destino" bar chart: largest bar (315 of ~504 exits) labelled "other / not covered" in both locales — cycle-1280-9-bars-destino.png — page.tsx:123 renders c.to_country raw; real bucket label or drop.
- [Blocker] Country/competition strings unlocalized on /es: "United States", "Brazil", "Italy", slugs "serie-a", "premier-liga", "campeonato-brasileiro-serie-a", "liga-mx-clausura" — page.tsx:133-134 prints first_abroad_country / first_abroad_competition unmapped.
- [Blocker] Half-empty panel: grid lg:grid-cols-2 stretches "Juveniles de Argentina" to 1010px with 135px of content beside "La salida al exterior" — page.tsx:106-120.
- [High] Six explanatory <Note> paragraphs (curve, trajectory, retention, breakthroughs, youth, pipeline); Hint imported 0 times.
- [High] "Riesgo de retención" table header duplicates 6 of 8 headers of the cohort table above, for a subset of the same players — page.tsx:68-89 vs Cohort.tsx:71-101.
- [High] Youth list has no club: 15 names in a comma sentence with age only — cycle-820-2-youth-pipeline.png — page.tsx:107-118.
- [High] "La camada" unbounded: 453 of 504 rows in one table, section ~16,000px, page 19,930px; Retention/Breakthroughs/Youth/Pipeline unreachable — Cohort.tsx CohortExplorer — cap (top 30–50 by trajectory) with show all, or group.
- [High] Chips 28px tall; 28 chips on this page (8 filter + 20 competition) — filters.tsx:6-12, base.css:124-136.
- [Medium] News-style opener: H1 + 3-line lede + inline "Calendario juvenil" sentence — page.tsx:38-49.
- [Medium] All 4 AgeScatter share aria-label "age against index"; Bars/LineChart default "bar chart"/"line chart" — charts.tsx:327,34,126.
- [Medium] 17-column table, no frozen name column, 2.4× horizontal scroll at 820 (1838 vs 778) — Cohort.tsx:71-101.
- [Medium] Six text-xs text-muted Notes stacked.
- Nit: "Trayectoria" appears as section aside, table column, and StaticTable column in one screenful.
- Nit: inherited comp-filter state (453/504 shown) easy to miss; "Filtro recordado" sits at the end of a 20-chip row.

Top 3: (1) keyboard-safe scatter; (2) cap/group the cohort table, cut the Retention duplicate header/columns; (3) Notes → Hint, trim lede, fix the two data bugs.
Note: two bottom-of-page captures rendered blank (tool limitation at extreme scroll depth).

## Mi tablero (/es/board)

**Verdict**: Functionally solid (follows persist, notes round-trip, share-link banner on-brand) but the most pre-redesign page: old Section/Line vocabulary instead of Panel/PanelRows, the verbose non-compact FollowList, a full lede paragraph, half-empty panel and too much text. Reads as a dense text list.

- [Blocker] Half-empty panel: Notes section grid lg:grid-cols-2 leaves 608 of 1182px empty with one note group — board-1280-5-notes-populated.png — Board.tsx:104.
- [Blocker] Wrong FollowList variant: verbose Line rows (name·club·league·pos·rank·arrow·state·tag·last-match sentence·next-match·event·note preview), 1–2 lines each, uneven — board-1280-2-full.png — Board.tsx:84 (no compact) vs Home page.tsx:187 (compact).
- [High] Feedback message in the wrong section: "Copiar enlace…" → "Enlace copiado" renders in the Export/Import block at the bottom — board-1280-3-share-msg.png — Board.tsx:39-41,61,129 shared msg state.
- [High] Lede + Note footnote; data-loss warning stated twice — board/page.tsx:27, Board.tsx:131, i18n:324,339.
- [High] Section vocabulary mismatch: bare Section for "Mi lista"/"Notas"/"Exportar…", never Panel — text.tsx:24 vs Panel.tsx:10.
- [Medium] "Quitar" 35×17px, text-xs text-muted, no confirmation — FollowList.tsx:152.
- [Medium] Note delete ("Borrar") instant, no confirm/undo — Notes.tsx:101-105, store.ts:100.
- [Medium] Duplicated note preview: same note truncated in the follow row (✎ …) and in full in Notes below — FollowList.tsx:148.
- [Nit] Header 4 rows on phone (board-390-1-full.png).
- [Nit] Import banner "Reemplazar/Sumar/Ignorar" one-shot actions rendered as Chip with aria-pressed=false — Board.tsx:61-69.
Positives: no horizontal scroll, no console errors, English fits, club always beside the name, share banner matches Home.

Top 3: (1) Panel/PanelRows + compact FollowList; (2) remove lede + Note, one hint; (3) message next to its control; undo/confirm for removals.

## Sobre los datos (/es/about-data), 404 page, shared chrome

**Verdict**: Content-complete and consistent with Home's vocabulary (stripe/mono headers, table.data, es-AR numbers), but the anchors the Home hints depend on land with the heading cut off, and any unknown URL (including a bad player key) falls through to Next's bare English default 404 instead of the bilingual one already built. Single column with a permanent half-empty right rail for ~7,000px.

- [Blocker] Custom 404 never renders: /es/players/nope and /es/does-not-exist serve Next's raw "404 / This page could not be found" (no chrome, English) — notfound-players-nope-1280.png, notfound-does-not-exist-820.png — with dynamicParams=false unbuilt segments bypass the [locale] not-found boundary; check how Vercel serves it and route unknown paths to the bilingual page.
- [Blocker] Anchor targets land above the fold: #home / #watch leave the h2 at top −37.6px — about-data/page.tsx:179,214,219 (div id inside Section after the title row, no scroll-margin-top) — put the id on the heading with scroll-margin-top.
- [High] Untranslated English in the Spanish methodology tables ("team matches without minutes that put a player in the infirmary as absent") — about-1280-thresholds-english-leak.png — site.ts:41 getMethodParameters and method_parameters.sql carry one description column; es/en pair or i18n keyed by name.
- [High] Muted fails 4.5:1 on real headings: the ten h3 table captions (14.9px bold), the Note footnote, the footer paragraph sitewide — darken.
- [High] Header touch targets: nav links 25px tall, language switch 56×17px — chrome-header-390.png — Header.tsx Nav, SiteHeader.tsx:36.
- [High] Repo link is plain text ("Código y metodología: https://github.com/…") — about-data/page.tsx:151 — wrap REPO_URL in a link.
- [Medium] Prose max-w-3xl (816px) inside a 1224px main leaves a 390–590px empty right rail for 7,000px — about-1280-full.png — sticky side rail (mini-TOC) or narrower main.
- [Medium] No table of contents for 16 h2 sections (~7,000px desktop / 10,853px mobile).
- [Medium] Wide tables ("Registros crudos por fuente", 5 cols) clip at 390 with no scroll cue — chrome-footer-390.png — StaticTable overflow-x-auto wrapper.
- [Medium] Mobile header 4 rows (~166px).
- Nit: prose ~87 characters per line at 14.9px.
- Nit: all three Home hints point to the same #home anchor.

Top 3: (1) anchor landing; (2) real bilingual 404; (3) localize the method parameter descriptions.

