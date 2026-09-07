from __future__ import annotations

from datetime import date
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# ESPN league codes: the seven priority competitions plus the leagues where pool players actually are (added 2026-09-06).
ESPN_LEAGUES = [
    "arg.1", "bra.1", "eng.1", "esp.1", "ger.1", "ita.1", "fra.1",
    "usa.1", "por.1", "mex.1", "ksa.1", "tur.1", "ned.1", "bel.1",
]

# Highlightly league ids, keyed by ESPN code. All seven verified/discovered on 2026-09-05
# (`alb ingest highlightly leagues` re-discovers them if they ever change).
HIGHLIGHTLY_LEAGUE_IDS: dict[str, int] = {
    "arg.1": 109712, "bra.1": 61205, "eng.1": 33973,
    "esp.1": 119924, "ger.1": 67162, "ita.1": 115669, "fra.1": 52695,
}

# ISO country codes Highlightly uses, keyed by ESPN code (for league discovery).
HIGHLIGHTLY_COUNTRY_CODES = {
    "arg.1": "AR", "bra.1": "BR", "eng.1": "GB-ENG", "esp.1": "ES",
    "ger.1": "DE", "ita.1": "IT", "fra.1": "FR",
    "usa.1": "US", "por.1": "PT", "mex.1": "MX", "ksa.1": "SA", "tur.1": "TR", "ned.1": "NL", "bel.1": "BE",
}

# football-data.org competition codes on the free tier that matter to us.
FD_COMPETITIONS = ["PL", "PD", "BL1", "SA", "FL1", "BSA", "CL", "PPL", "DED"]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql://alb:alb@localhost:5432/albiceleste"
    # Raw-file mirror, anchored at the repo root so it does not depend on the working directory.
    raw_dir: Path = Path(__file__).resolve().parents[2] / "data" / "raw"
    write_raw_files: bool = True

    highlightly_api_key: str = ""
    football_data_api_key: str = ""

    # Never spend the last N Highlightly requests of the day; leaves room for manual checks.
    highlightly_daily_reserve: int = 10

    user_agent: str = "albiceleste/0.1 (open research project on Argentine footballers)"

    # Players born before this date are ignored when querying Wikidata.
    dob_floor: date = date(1984, 1, 1)

    # Highlightly season label used for whole-season match lists (calendar year the season starts).
    highlightly_season: int = 2026

    espn_leagues: list[str] = Field(default_factory=lambda: list(ESPN_LEAGUES))
    highlightly_league_ids: dict[str, int] = Field(default_factory=lambda: dict(HIGHLIGHTLY_LEAGUE_IDS))
    fd_competitions: list[str] = Field(default_factory=lambda: list(FD_COMPETITIONS))


def get_settings() -> Settings:
    return Settings()
