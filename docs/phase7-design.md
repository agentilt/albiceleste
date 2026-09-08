# Phase 7 — Design pass (Home first)

**Date:** 2026-09-08. Done in code, on a branch, with screenshots for review; Claude Design stays an optional sketchpad.

## Identity

- **Type.** Chivo (display, 800–900), Archivo (text, and semi-condensed data through its width axis), Chivo Mono (labels).
  All by Omnibus-Type, Buenos Aires. Loaded with next/font; the package's `styles.css` imports the same families from Google
  Fonts for the design-sync cards. Base size 17px.
- **Palette.** Sky-white ground `#f4f8fb`, navy-black ink `#0f1721`, AFA celeste `#75aadb` as the one accent (`#2a6db5` deep
  for links), gold `#b8912a` for last-squad marks only, danger `#b23a2f` for out. Tables carry a 2px celeste rule under the head.
- **The stripe mark.** Three bands (`.stripe`), on the wordmark and at the start of every section and panel title. The whole
  ornament budget.
- **Panels.** `Panel` (white box, mono title bar, corner link) with `PanelRows` (equal single-line rows that stretch to fill the
  box, facts on the right, ellipsis instead of wrapping) and `Figure` (big number, small label). The data-horizon line moved
  from the header to the footer.

## Home

One screen and a half: the headline band (countdown), the **squad sheet** (`SquadSheet`: the last list in its real positions
with each player's season since 1 July — minutes and G+A, or clean sheets for GK and DEF — and the site's rank on the left;
under a firm rule, **los que pelean el lugar**: three per position on the watch and outside the list, by the season index
printed in the caption), then **Los de la semana** and **Señales de alarma** (the last seven days on the watch), then **Mi
lista**. Movers, La fecha, Enfermería, the week's fixtures, Próximo ciclo and where-the-pool-plays live on their pages.

## Decisions that reached the data

- **The watch is the pool** (`int_watch`, `in_watch` on `player_rank_history` and `player_state`, `in_watch` on the competitions
  seed): ranks exist only inside it. See the cross-cutting note in `page-briefs.md`. The domestic ramp is
  `domestic_watch_slots` = 3 in `score_thresholds.csv`.
- **Season figures start on 1 July** (`seasonStart` in the data package) so calendar-year leagues do not show three times the
  minutes of the European ones.
- `weekIndex` and `seasonIndex` (data package) are the two printed indexes behind the Home panels.

## Still to do in this pass

Phone header (three rows today); Plantel, La fecha and the other pages in the same register; a favicon; re-sync to Claude
Design after the tokens settle (the synced project still shows the cream/serif look).
