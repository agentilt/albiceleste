# design-sync notes for albiceleste

Repo-specific facts a re-sync needs. Config lives in `.design-sync/config.json`; previews in `.design-sync/previews/`.

## Build

- The design system is `packages/ui` (`@albiceleste/ui`), an npm workspace. Build with `npx turbo run build --filter=@albiceleste/ui`
  from the repo root: `tsc -p tsconfig.build.json` emits `dist/*.js` + `.d.ts` (one file per source module, `"use client"`
  directives preserved), then the Tailwind v4 CLI compiles `src/styles.css` → `dist/styles.css`.
- Run the converter from the repo root with `--node-modules ./node_modules --entry ./packages/ui/dist/index.js` (workspace
  hoisting keeps react at the root; `node_modules/@albiceleste/ui` is a symlink to the package).
- `componentSrcMap` pins components that live in grouped source files (`Header.tsx`, `text.tsx`, `filters.tsx`, `charts.tsx`,
  `EventList.tsx`); `DefaultLink` is excluded (a helper, not a design component).
- Fonts come from a Google Fonts `@import` in `src/styles.css` (`[FONT_REMOTE]`, informational). The site itself loads the same
  families through next/font and overrides the `--font-*` tokens in `apps/web/app/globals.css`.

## Previews

- The compiled stylesheet only contains utilities used by the package source plus the safelist in `src/styles.css`
  (`@source inline(...)`). A preview that uses a utility outside that set renders unstyled (that is how `gap-10` collided the
  `Stat.Pair` labels). Use listed utilities or inline styles; add to the safelist if a utility is genuinely needed, and mirror the
  change in `conventions.md`.
- `SearchInput` only opens its results list on focus; the `Typing` story uses the `defaultOpen` prop added for this purpose.
  `align="right"` hangs the list from the input's right edge (the site header uses it).
- `Chip.Interactive` and `SearchInput.Typing` use `useState`; previews compile with React from `_vendor/`, hooks work.
- Wide components use `cardMode: column` (Header, Page, Hero, StatRow, Footer, StaticTable, SortableTable, MinutesTimeline,
  EventList, FilterBar, FilterRow, Nav).
- States that need pointer interaction (hover on table rows, dropdown keyboard navigation) are not captured.

## Phase 6 additions (synced 2026-09-07: 39 components, render check 39/39, 15 new previews graded good)

- New components for the briefs' pages: `RankArrow`, `StateWord`, `Tag`, `RankList`, `Line` (src/Rank.tsx); `CallStrip`
  (src/Selection.tsx); `FollowButton`, `NoteMark` (src/Follow.tsx); `NoteComposer`, `NoteList` (src/Notes.tsx); `Segmented`
  (src/filters.tsx); `Radar`, `Sparkline`, `RankHistory`, `AgeScatter` (src/charts.tsx). Previews written for all of them.
- `SortableTable` gained `render`/`sortValue`/`align`/`title`/`sortable` on columns, controlled `sort`/`dir`/`onSortChange`,
  `rowKey` and `rowClassName`. `MinutesTimeline` gained `markers`. `Header` gained `homeHref`. `table.data td` is `white-space:
  nowrap` now (`td.wrap` opts out).
- Tokens used by the new parts: `--color-gold` (Recién llegado, dual nationals) and `--color-danger` (out, remove actions).
  Conventions table updated; the safelist in `src/styles.css` did not need new entries because these utilities are used in the
  package source itself.
- A preview `.tsx` compiles alone: importing a value from another preview file (`import { LABELS } from "./NoteComposer"`)
  compiles but arrives `undefined` at runtime (NoteList rendered an empty root with `Cannot read properties of undefined`).
  Keep every preview self-contained; duplicate small fixtures instead of sharing them.
- Cards are narrower than the site's 1152 px container: a four-column `RankList` grid wrapped every name, so the preview shows
  two columns (`TwoColumns`); the site itself renders four.
- The 24 first-sync components were carried forward by the anchor (0 changed); only `Header`, `SortableTable`,
  `MinutesTimeline` and `Note` re-uploaded because their `.d.ts`/`.prompt.md` changed (new props), not their renders.
- `conventions.md` validated against this build (colours, utilities, tokens, helpers, components all resolve). It does not yet
  name the fifteen new components in its composition guidance; proposed addition, not applied by the sync: "Rank rows with
  `RankList` (+ `RankArrow`, `StateWord`, `Tag`), dense records with `Line`, call-ups with `CallStrip`, the personal layer with
  `FollowButton`, `NoteMark`, `NoteComposer`, `NoteList`, single-choice switches with `Segmented`, and the new charts `Radar`,
  `Sparkline`, `RankHistory`, `AgeScatter`."

## Known render warns

- none as of 2026-09-06 (24/24 clean).

## Fixes made during the first sync (component code, not preview workarounds)

- `MinutesTimeline`: x-axis ticks are thinned evenly and switch to day labels for spans under about 3.5 months.
- `SearchInput`: wrapper is `inline-block` so the results list anchors to the input in any container; `defaultOpen` and `align` props.

## Re-sync risks

- The safelist in `src/styles.css` and the utility table in `conventions.md` must move together; validate the header names against
  `ds-bundle/_ds_bundle.css` after any change.
- Preview data is hand-written from the September 2026 snapshot (player names, clubs, numbers). It does not track the live data
  and does not need to.
- Google Fonts is fetched at runtime by the cards and by designs; offline renders fall back to system fonts and would grade as
  unstyled.
- Toolchain at first sync: node 26.5, npm 11.17, turbo 2.10, tailwindcss 4.3.3, next 16.3.4, react 19.2.8, @duckdb/node-api 1.5.5,
  playwright chromium-headless-shell 1243 (macOS cache at ~/Library/Caches/ms-playwright).
