# Building with @albiceleste/ui

albiceleste is an editorial data product: paper background, ink text, one accent (celeste), dense tables with tabular figures,
serif display headings (Fraunces), IBM Plex Sans text, IBM Plex Mono for data labels. Keep pages quiet: hairline rules, no cards,
no shadows, no gradients, no icons, one accent colour used for links and chart marks only.

## Setup

- No provider is needed. Load `styles.css` once; it carries the tokens, the base rules (`html`, headings, `table.data`, `.chip`,
  `.link`, `.num`, form controls) and the Google Fonts import for Fraunces, IBM Plex Sans and IBM Plex Mono.
- Wrap page content in `Page` (max-width container) under a `Header`; end with `Footer`.
- Links: every component that renders a link takes `LinkComponent` (default: a plain `<a>`) and, where relevant, `hrefFor(key)`.
  Pass the router's Link through `LinkComponent` when building inside a framework.

## Styling idiom: tokens + a small Tailwind vocabulary

Components are styled with Tailwind utility classes over these tokens. `styles.css` ships only the utilities listed here, so use
these (or inline styles) for your own layout glue; other Tailwind class names will not resolve.

| Family | Available values |
|---|---|
| Colours (`text-`, `bg-`, `border-`) | `paper`, `surface`, `ink`, `ink-2`, `muted`, `rule`, `rule-strong`, `celeste`, `celeste-deep`, `celeste-tint` |
| Type | `font-sans`, `font-serif`, `font-mono`, `font-medium`, `text-xs` … `text-5xl`, `uppercase`, `tracking-wide`, `tracking-tight`, `leading-tight`, `leading-relaxed`, `truncate`, `whitespace-nowrap` |
| Layout | `flex`, `inline-flex`, `grid`, `block`, `hidden`, `flex-wrap`, `flex-col`, `items-*`, `justify-*` (start, center, end, between, baseline), `grid-cols-{1,2,3,4,6}`, `sm:`/`lg:` grid variants, `mx-auto`, `ml-auto`, `max-w-{xl,3xl,6xl}`, `w-{16,20,56,80,full}` |
| Spacing | `gap-{1,2,3,4,5,6,8,10}`, `gap-x-*`, `gap-y-*`, `mt/mb/my/mx/pt/pb/py/px/p-{0,1,2,3,4,5,6,8,10,12}`, `space-y-{1,2,3,4}` |
| Rules | `border`, `border-t`, `border-b`, `border-y` with `border-rule`, `border-rule-strong`, `border-ink` |

CSS variables for anything else: `var(--color-paper)`, `var(--color-ink)`, `var(--color-ink-2)`, `var(--color-muted)`,
`var(--color-rule)`, `var(--color-rule-strong)`, `var(--color-celeste)`, `var(--color-celeste-deep)`, `var(--color-celeste-tint)`,
`var(--font-sans)`, `var(--font-serif)`, `var(--font-mono)`, `var(--radius-xs)`.

Semantic classes from the base rules: `table.data` (with `th.r`/`td.r` for numeric columns, `.sticky-head` on the scroll wrapper),
`.chip` (with `aria-pressed`), `.link`, `.num` (tabular figures).

## Where the truth lives

Read `styles.css` (imports `_ds_bundle.css`, which is the compiled tokens + base rules + utilities) before styling, and
`components/general/<Name>/<Name>.prompt.md` for each component's props and examples. Formatting helpers ship in the bundle too:
`int`, `dec1`, `dec2`, `pct`, `eur`, `date`, `datetime`.

## Idiomatic page

```tsx
import { Header, Page, PageTitle, Section, StaticTable, Note, Footer, int, pct } from "@albiceleste/ui";

const NAV = [{ href: "/feed", label: "Watch feed" }, { href: "/abroad", label: "Abroad" }];

<Header nav={NAV} current="/abroad" meta="Matches through 5 Sep 2026 · squads as of 5 Sep 2026" />
<Page>
  <PageTitle title="Argentine players abroad" lede="Eligible players whose current club is outside Argentina." />
  <Section title="Biggest movers, last 28 days" aside="vs the previous 28 days">
    <StaticTable
      rows={movers}
      rowKey={(r) => r.player_key}
      cols={[
        { label: "Player", render: (r) => <a className="link" href={`/players/${r.player_key}`}>{r.full_name}</a> },
        { label: "Club", render: (r) => r.team },
        { label: "Minutes", align: "r", render: (r) => int(r.minutes) },
        { label: "Change", align: "r", render: (r) => pct(r.minutes_change_pct, true) },
      ]}
    />
    <Note>Minutes come from box scores where present, otherwise from substitution clocks.</Note>
  </Section>
</Page>
<Footer>Free data only. Football data provided by football-data.org.</Footer>
```

Compose lists with `EventList` + `Severity`, filters with `FilterBar` > `FilterRow` > `Chip` and `Field`, headline numbers with
`StatRow` > `Stat`, and charts with `Bars`, `LineChart`, `MinutesTimeline` (server-safe SVG, no client code).
