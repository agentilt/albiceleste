import streamlit as st
from lib import REPO_URL, manifest, page

page("About and methodology", "📖")
m = manifest()

st.markdown(
    f"""
**What this is.** An open, free-data view of every footballer eligible for Argentina's senior national team who plays in
Europe's top five leagues, Brazil's Série A or Argentina's Liga Profesional: who they are, where they play, how much they play,
and what has changed recently. It is a portfolio project, not an official product. Source code, pipeline and models: [{REPO_URL}]({REPO_URL}).

**Data horizon.** Matches through **{m["data_as_of"]}**; squads as of {str(m["squad_as_of"])[:10]}. The site is a snapshot that is
refreshed by re-running the pipeline, so the "last 7 days" style figures are relative to that date, not to today.

### Eligibility

A player counts as eligible when he holds Argentine citizenship or has an Argentina senior cap, and has not been cap-tied to
another nation at senior level. Players with a senior spell for another national team are shown as *review* rather than excluded,
because eligibility switches under FIFA rules are possible in some cases. Youth-only Argentina internationals without evidence of
citizenship are *youth_only* and left out of the main views.

### Sources

| Source | Used for | Terms |
|---|---|---|
| Wikidata | identity, citizenship, national-team spells, external ids | CC0 |
| ESPN (public site API) | squads with citizenship and birth dates, fixtures, match summaries with per-player stats and substitution clocks | unofficial, read-only |
| Highlightly | per-match box scores (minutes, xG, xA, ratings) | free tier, 100 requests per day |
| football-data.org | fixtures, standings, squads for European competitions | free tier; *football data provided by football-data.org* |
| Fantasy Premier League | per-gameweek Premier League statistics | public API |
| Transfermarkt via the `transfermarkt-datasets` snapshot | career history, transfers, market values, frozen at 2026-07-06 | CC0 |

### How players are matched across sources

Precision first. Two records are the same person only when birth dates agree exactly and the names are compatible
(a surname token appears in both and the given names are similar), with mutual-best assignment so one record cannot
claim two identities. Ambiguous cases are listed on the Data Quality page rather than guessed. A small override file pins
the few Highlightly nicknames and transliterations that rules cannot resolve.

### Minutes

Highlightly minutes are used where a box score exists. Otherwise minutes are derived from ESPN's starter and substitution
clocks, with a 120-minute reference for matches that went to extra time. Where both sources exist, 98% of pairs agree within
three minutes.

### Change detection

Events are computed in SQL from the ordered match sequence of each player: club changes with a stronger/weaker verdict from
competition tier, first starts, streaks of starts or goals, returns from long absences, league debuts, and 28-day minute surges
or drops. The watch feed shows events for players abroad plus Argentine-league players who enter the focus set through explicit
rules, so the domestic league does not flood the feed.

### Known limitations

- Highlightly's free tier limits box scores to roughly 70 matches per day, so recent rows fall back to ESPN more often.
- Transfermarkt history is frozen at the snapshot date; destination country is unknown for leagues outside its 65 competitions.
- Injury flags come from ESPN rosters and lag reality.
"""
)
