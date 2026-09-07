"""`alb` — command line for the albiceleste data platform."""
from __future__ import annotations

from datetime import date, timedelta
from pathlib import Path
from typing import Annotated

import typer
from rich.console import Console
from rich.table import Table

from . import db as dbmod
from .config import get_settings
from .ingest import espn, footballdata, fpl, highlightly, transfermarkt, wikidata
from .ingest.base import make_context
from .publish import export as publish_export

app = typer.Typer(no_args_is_help=True, help="Argentina football intelligence platform — data pipeline")
db_app = typer.Typer(no_args_is_help=True, help="Database bootstrap and inspection")
ingest_app = typer.Typer(no_args_is_help=True, help="Pull raw data from one source")
run_app = typer.Typer(no_args_is_help=True, help="Orchestrated multi-source runs")
app.add_typer(db_app, name="db")
app.add_typer(ingest_app, name="ingest")
app.add_typer(run_app, name="run")

wd_app = typer.Typer(no_args_is_help=True, help="Wikidata")
espn_app = typer.Typer(no_args_is_help=True, help="ESPN")
hl_app = typer.Typer(no_args_is_help=True, help="Highlightly (100 req/day)")
fd_app = typer.Typer(no_args_is_help=True, help="football-data.org")
fpl_app = typer.Typer(no_args_is_help=True, help="Fantasy Premier League")
tm_app = typer.Typer(no_args_is_help=True, help="Transfermarkt CC0 snapshot (frozen history)")
for name, sub in [("wikidata", wd_app), ("espn", espn_app), ("highlightly", hl_app), ("fd", fd_app), ("fpl", fpl_app), ("transfermarkt", tm_app)]:
    ingest_app.add_typer(sub, name=name)

console = Console()
SQL_INIT = Path(__file__).resolve().parents[2] / "sql" / "001_init.sql"

DateOpt = Annotated[str | None, typer.Option(help="YYYY-MM-DD")]


def _d(s: str | None, default: date) -> date:
    return date.fromisoformat(s) if s else default


# ---------------------------------------------------------------- db
@db_app.command("init")
def db_init() -> None:
    """Create schemas, raw.records, meta tables (idempotent)."""
    s = get_settings()
    with dbmod.connect(s.database_url) as conn:
        dbmod.run_sql_file(conn, SQL_INIT)
    console.print(f"[green]initialised[/] {s.database_url.split('@')[-1]}")


@db_app.command("status")
def db_status() -> None:
    """Row counts per source/entity, Highlightly quota, last runs."""
    s = get_settings()
    with dbmod.connect(s.database_url) as conn:
        rows = dbmod.fetch_all(
            conn,
            "SELECT source, entity, count(*) AS versions, count(DISTINCT source_record_id) AS records, "
            "max(ingested_at) AS last FROM raw.records GROUP BY 1,2 ORDER BY 1,2",
        )
        t = Table(title="raw.records")
        for c in ("source", "entity", "records", "versions", "last"):
            t.add_column(c)
        for r in rows:
            t.add_row(r["source"], r["entity"], str(r["records"]), str(r["versions"]), str(r["last"])[:19])
        console.print(t)
        q = dbmod.fetch_one(
            conn,
            "SELECT ratelimit_remaining, called_at FROM meta.api_calls WHERE source='highlightly' "
            "AND ratelimit_remaining IS NOT NULL ORDER BY called_at DESC LIMIT 1",
        )
        if q:
            console.print(f"highlightly remaining today: [bold]{q['ratelimit_remaining']}[/] (as of {str(q['called_at'])[:19]})")
        runs = dbmod.fetch_all(
            conn, "SELECT command, status, started_at, records_written, requests_made FROM meta.pipeline_runs ORDER BY started_at DESC LIMIT 8"
        )
        t2 = Table(title="recent runs")
        for c in ("started", "command", "status", "new versions", "requests"):
            t2.add_column(c)
        for r in runs:
            t2.add_row(str(r["started_at"])[:19], r["command"], r["status"], str(r["records_written"]), str(r["requests_made"]))
        console.print(t2)


# ---------------------------------------------------------------- wikidata
@wd_app.command("players")
def wd_players(year_from: int | None = None, year_to: int | None = None) -> None:
    with make_context("ingest wikidata players") as ctx:
        wikidata.ingest_players(ctx, year_from, year_to)


@wd_app.command("memberships")
def wd_memberships(year_from: int | None = None, year_to: int | None = None) -> None:
    with make_context("ingest wikidata memberships") as ctx:
        wikidata.ingest_memberships(ctx, year_from, year_to)


# ---------------------------------------------------------------- espn
LeaguesOpt = Annotated[list[str] | None, typer.Option("--league", "-l", help="ESPN league code, repeatable")]


@espn_app.command("teams")
def espn_teams(leagues: LeaguesOpt = None) -> None:
    with make_context("ingest espn teams") as ctx:
        espn.ingest_teams(ctx, leagues or ctx.settings.espn_leagues)


@espn_app.command("rosters")
def espn_rosters(leagues: LeaguesOpt = None) -> None:
    with make_context("ingest espn rosters") as ctx:
        espn.ingest_rosters(ctx, leagues or ctx.settings.espn_leagues)


@espn_app.command("scoreboard")
def espn_scoreboard(leagues: LeaguesOpt = None, date_from: DateOpt = None, date_to: DateOpt = None) -> None:
    with make_context("ingest espn scoreboard") as ctx:
        espn.ingest_scoreboard(ctx, leagues or ctx.settings.espn_leagues, _d(date_from, date.today() - timedelta(days=3)), _d(date_to, date.today()))


@espn_app.command("summaries")
def espn_summaries(leagues: LeaguesOpt = None, limit: int = 500) -> None:
    with make_context("ingest espn summaries") as ctx:
        espn.ingest_summaries(ctx, leagues or ctx.settings.espn_leagues, limit)


@espn_app.command("athletes")
def espn_athletes(leagues: LeaguesOpt = None, limit: int = 5000) -> None:
    """Profiles for athletes seen in summaries but not on any current roster."""
    with make_context("ingest espn athletes") as ctx:
        espn.ingest_athletes(ctx, leagues or ctx.settings.espn_leagues, limit)


@espn_app.command("backfill")
def espn_backfill(date_from: DateOpt = None, date_to: DateOpt = None, leagues: LeaguesOpt = None) -> None:
    """History: scoreboards, summaries, then athlete profiles for a date range (default: two seasons back)."""
    d0 = _d(date_from, date(2024, 7, 1))
    d1 = _d(date_to, date(2026, 6, 30))
    with make_context(f"ingest espn backfill {d0}..{d1}") as ctx:
        lg = leagues or ctx.settings.espn_leagues
        espn.ingest_scoreboard(ctx, lg, d0, d1)
        espn.ingest_summaries(ctx, lg, limit=20000)
        espn.ingest_athletes(ctx, lg, limit=20000)


# ---------------------------------------------------------------- transfermarkt
@tm_app.command("load")
def tm_load(tables: Annotated[list[str] | None, typer.Option("--table", "-t")] = None) -> None:
    """Download the CC0 snapshot CSVs and bulk-load them into raw_tm.* (one-off)."""
    with make_context("ingest transfermarkt load") as ctx:
        transfermarkt.load(ctx, tables)


# ---------------------------------------------------------------- highlightly
@hl_app.command("leagues")
def hl_leagues(leagues: LeaguesOpt = None) -> None:
    """Discover Highlightly league ids by country (1 request per league)."""
    with make_context("ingest highlightly leagues") as ctx:
        highlightly.ingest_leagues(ctx, leagues or ctx.settings.espn_leagues)


@hl_app.command("matches")
def hl_matches(date_from: DateOpt = None, date_to: DateOpt = None, max_requests: int | None = None) -> None:
    """Fetch match lists for league-days where ESPN shows completed matches."""
    with make_context("ingest highlightly matches") as ctx:
        plan = highlightly.plan_match_days(ctx, _d(date_from, date.today() - timedelta(days=7)), _d(date_to, date.today()))
        console.print(f"{len(plan)} league-days to fetch")
        highlightly.ingest_matches(ctx, plan, max_requests)


@hl_app.command("season")
def hl_season(leagues: LeaguesOpt = None, season: int | None = None) -> None:
    """Whole-season match lists (fixtures + results) via pagination, ~5 requests per league."""
    with make_context("ingest highlightly season") as ctx:
        highlightly.ingest_season_matches(ctx, leagues or ctx.settings.espn_leagues, season or ctx.settings.highlightly_season)


@hl_app.command("boxscores")
def hl_boxscores(limit: int = 60) -> None:
    with make_context("ingest highlightly boxscores") as ctx:
        highlightly.ingest_boxscores(ctx, limit)


# ---------------------------------------------------------------- football-data.org
CompsOpt = Annotated[list[str] | None, typer.Option("--competition", "-c", help="fd.org code, repeatable")]


@fd_app.command("competitions")
def fd_competitions() -> None:
    with make_context("ingest fd competitions") as ctx:
        footballdata.ingest_competitions(ctx)


@fd_app.command("teams")
def fd_teams(comps: CompsOpt = None) -> None:
    with make_context("ingest fd teams") as ctx:
        footballdata.ingest_teams(ctx, comps or ctx.settings.fd_competitions)


@fd_app.command("matches")
def fd_matches(comps: CompsOpt = None, date_from: DateOpt = None, date_to: DateOpt = None) -> None:
    with make_context("ingest fd matches") as ctx:
        footballdata.ingest_matches(ctx, comps or ctx.settings.fd_competitions, _d(date_from, date.today() - timedelta(days=7)), _d(date_to, date.today() + timedelta(days=7)))


@fd_app.command("standings")
def fd_standings(comps: CompsOpt = None) -> None:
    with make_context("ingest fd standings") as ctx:
        footballdata.ingest_standings(ctx, comps or ctx.settings.fd_competitions)


@fd_app.command("scorers")
def fd_scorers(comps: CompsOpt = None) -> None:
    with make_context("ingest fd scorers") as ctx:
        footballdata.ingest_scorers(ctx, comps or ctx.settings.fd_competitions)


# ---------------------------------------------------------------- fpl
@fpl_app.command("bootstrap")
def fpl_bootstrap() -> None:
    with make_context("ingest fpl bootstrap") as ctx:
        fpl.ingest_bootstrap(ctx)


@fpl_app.command("history")
def fpl_history(region: int | None = None) -> None:
    with make_context("ingest fpl history") as ctx:
        fpl.ingest_history(ctx, region)


# ---------------------------------------------------------------- orchestrated runs
@run_app.command("bootstrap")
def run_bootstrap(
    season_start: Annotated[str, typer.Option(help="First match date to backfill")] = "2026-07-01",
    boxscore_limit: int = 60,
    skip_wikidata: Annotated[bool, typer.Option(help="Run Wikidata separately (it is slow and rate-limited)")] = False,
) -> None:
    """First full load: identities, squads, fixtures since season start, and as many box scores as quota allows."""
    start = date.fromisoformat(season_start)
    today = date.today()
    with make_context("run bootstrap") as ctx:
        if not skip_wikidata:
            wikidata.ingest_players(ctx)
            wikidata.ingest_memberships(ctx)
        espn.ingest_teams(ctx, ctx.settings.espn_leagues)
        espn.ingest_rosters(ctx, ctx.settings.espn_leagues)
        espn.ingest_scoreboard(ctx, ctx.settings.espn_leagues, start, today)
        espn.ingest_summaries(ctx, ctx.settings.espn_leagues, limit=2000)
        footballdata.ingest_competitions(ctx)
        footballdata.ingest_teams(ctx, ctx.settings.fd_competitions)
        footballdata.ingest_matches(ctx, ctx.settings.fd_competitions, start, today + timedelta(days=14))
        footballdata.ingest_standings(ctx, ctx.settings.fd_competitions)
        footballdata.ingest_scorers(ctx, ctx.settings.fd_competitions)
        fpl.ingest_bootstrap(ctx)
        fpl.ingest_history(ctx)
        highlightly.ingest_season_matches(ctx, ctx.settings.espn_leagues, ctx.settings.highlightly_season)
        highlightly.ingest_boxscores(ctx, boxscore_limit)


@run_app.command("daily")
def run_daily(days_back: int = 3, boxscore_limit: int = 70) -> None:
    """Incremental: recent fixtures/results, new summaries, box scores within quota."""
    today = date.today()
    start = today - timedelta(days=days_back)
    with make_context("run daily") as ctx:
        # results for the last few days plus fixtures a week ahead (the site shows next matches)
        espn.ingest_scoreboard(ctx, ctx.settings.espn_leagues, start, today + timedelta(days=7))
        espn.ingest_summaries(ctx, ctx.settings.espn_leagues, limit=300)
        footballdata.ingest_matches(ctx, ctx.settings.fd_competitions, start, today + timedelta(days=7))
        footballdata.ingest_standings(ctx, ctx.settings.fd_competitions)
        plan = highlightly.plan_match_days(ctx, start - timedelta(days=14), today)
        highlightly.ingest_matches(ctx, plan, max_requests=20)
        highlightly.ingest_boxscores(ctx, boxscore_limit)


@run_app.command("weekly")
def run_weekly() -> None:
    """Slow-changing data: identities, squads, scorers, FPL history."""
    with make_context("run weekly") as ctx:
        wikidata.ingest_players(ctx)
        wikidata.ingest_memberships(ctx)
        espn.ingest_teams(ctx, ctx.settings.espn_leagues)
        espn.ingest_rosters(ctx, ctx.settings.espn_leagues)
        footballdata.ingest_teams(ctx, ctx.settings.fd_competitions)
        footballdata.ingest_scorers(ctx, ctx.settings.fd_competitions)
        fpl.ingest_bootstrap(ctx)
        fpl.ingest_history(ctx)


# ---------------------------------------------------------------- publish
@app.command("publish")
def publish_cmd(out: Annotated[Path | None, typer.Option(help="Output directory (default data/published)")] = None) -> None:
    """Export marts and provenance summaries to Parquet so the dashboard runs without the database."""
    publish_export(out, log=console.print)


if __name__ == "__main__":
    app()
