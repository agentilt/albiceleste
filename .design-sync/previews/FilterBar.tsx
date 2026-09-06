import { Chip, Field, FilterBar, FilterRow } from "@albiceleste/ui";

export const FeedFilters = () => (
  <FilterBar>
    <FilterRow label="Competition">
      {["Premier League", "La Liga", "Bundesliga", "Serie A", "Brasileirão Série A", "Ligue 1", "Liga Profesional"].map((c, i) => (
        <Chip key={c} pressed={i === 4} onClick={() => {}}>
          {c}
        </Chip>
      ))}
    </FilterRow>
    <FilterRow label="Event">
      {["Club change", "League debut", "Minutes surge", "Multi-goal match", "Return after absence"].map((c) => (
        <Chip key={c} pressed={c === "Club change"} onClick={() => {}}>
          {c}
        </Chip>
      ))}
    </FilterRow>
    <div className="flex flex-wrap items-center gap-4">
      <Field label="Min severity">
        <select defaultValue={2}>
          <option value={1}>1</option>
          <option value={2}>2</option>
          <option value={3}>3</option>
        </select>
      </Field>
      <Field label="Days back">
        <select defaultValue={30}>
          <option value={7}>7</option>
          <option value={30}>30</option>
          <option value={60}>60</option>
        </select>
      </Field>
      <span className="text-muted">232 events</span>
    </div>
  </FilterBar>
);
