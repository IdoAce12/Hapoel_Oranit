#!/usr/bin/env python3
"""
IFA deep scraper for Hapoel Oranit (team_id=2735).

Aggregates per-season match statistics from the official IFA
GetTeamPlayersStatisticsList endpoint and writes all-time totals to
src/data/oranitData.json.
"""

from __future__ import annotations

import argparse
import html as html_lib
import json
import re
import sys
import time
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse

import atexit
import signal

import requests
import urllib3
from bs4 import BeautifulSoup

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

REQUEST_TIMEOUT = 10
BLOCKED_HTTP_STATUSES = frozenset({403, 404, 429, 503})

TEAM_ID = 2735
BASE_URL = "https://www.football.org.il"
STATS_API = f"{BASE_URL}/Components.asmx/GetTeamPlayersStatisticsList"
TEAM_PAGE = f"{BASE_URL}/team-details/"
TEAM_CAT_ID = "2cf66391-238f-4199-aa04-4c61c7b892a9"
STAFF_ITEM_ID = "d9e76668-5f1a-4149-ab0f-ba59a233c363"
HEAD_COACH_ROLE = "מאמן הקבוצה"
ORANIT_NAME_MARKERS = ("אורנית", "הפועל אורנית", "הפ' אורנית")
NON_LEAGUE_MARKERS = ("גביע", "טוטו", "חופש", "מקדימות", "חימום", "גמר")

SEASON_LABEL_OVERRIDES: dict[int, str] = {}
DEFAULT_SEASON_START = 10
DEFAULT_SEASON_END = 28

DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Referer": f"{TEAM_PAGE}?team_id={TEAM_ID}",
}

NS = {"t": "http://tempuri.org/"}

# Column order in IFA player statistics table (data-sort attributes)
COL_GAMES = 1
COL_GOALS = 2
COL_YELLOW_LEAGUE = 3
COL_YELLOW_TOTO = 4
COL_RED = 5
COL_STARTED = 6
COL_SUB_IN = 7
COL_MINUTES = 9


@dataclass
class PlayerSeason:
    season_id: int
    season_label: str
    caps: int = 0
    goals: int = 0
    yellow_cards: int = 0
    red_cards: int = 0
    minutes: int = 0
    started: int = 0
    sub_in: int = 0

    def has_activity(self) -> bool:
        return any(
            [
                self.caps > 0,
                self.goals > 0,
                self.yellow_cards > 0,
                self.red_cards > 0,
                self.minutes > 0,
            ]
        )


@dataclass
class ManagerSeason:
    season_id: int
    season_label: str
    matches: int = 0
    wins: int = 0
    draws: int = 0
    losses: int = 0


@dataclass
class ManagerAggregate:
    name: str
    member_id: str = ""
    seasons: list[ManagerSeason] = field(default_factory=list)

    def add_season(self, season: ManagerSeason) -> None:
        if season.matches <= 0:
            return
        self.seasons.append(season)

    def add_match_result(
        self,
        season_id: int,
        season_label: str,
        outcome: str,
    ) -> None:
        for season in self.seasons:
            if season.season_id == season_id:
                season.matches += 1
                if outcome == "W":
                    season.wins += 1
                elif outcome == "D":
                    season.draws += 1
                else:
                    season.losses += 1
                return
        wins = 1 if outcome == "W" else 0
        draws = 1 if outcome == "D" else 0
        losses = 1 if outcome == "L" else 0
        self.seasons.append(
            ManagerSeason(
                season_id=season_id,
                season_label=season_label,
                matches=1,
                wins=wins,
                draws=draws,
                losses=losses,
            )
        )

    def totals(self) -> dict[str, Any]:
        labels = sorted({s.season_label for s in self.seasons})
        wins = sum(s.wins for s in self.seasons)
        draws = sum(s.draws for s in self.seasons)
        losses = sum(s.losses for s in self.seasons)
        return {
            "totalMatches": sum(s.matches for s in self.seasons),
            "wins": wins,
            "draws": draws,
            "losses": losses,
            "points": wins * 3 + draws,
            "seasons": labels,
        }


@dataclass
class PlayerAggregate:
    player_id: str
    name: str
    seasons: list[PlayerSeason] = field(default_factory=list)
    wins: int = 0
    draws: int = 0
    losses: int = 0

    def add_outcome(self, outcome: str) -> None:
        if outcome == "W":
            self.wins += 1
        elif outcome == "D":
            self.draws += 1
        elif outcome == "L":
            self.losses += 1

    def add_season(self, season: PlayerSeason) -> None:
        if not season.has_activity():
            return
        self.seasons.append(season)

    def recompute_totals(self) -> dict[str, int | list[str]]:
        caps = sum(s.caps for s in self.seasons)
        goals = sum(s.goals for s in self.seasons)
        yellow = sum(s.yellow_cards for s in self.seasons)
        red = sum(s.red_cards for s in self.seasons)
        minutes = sum(s.minutes for s in self.seasons)
        labels = sorted({s.season_label for s in self.seasons if s.has_activity()})
        return {
            "caps": caps,
            "goals": goals,
            "yellowCards": yellow,
            "redCards": red,
            "minutesPlayed": minutes,
            "wins": self.wins,
            "draws": self.draws,
            "losses": self.losses,
            "seasons": labels,
        }


def season_id_to_label(season_id: int) -> str:
    if season_id in SEASON_LABEL_OVERRIDES:
        return SEASON_LABEL_OVERRIDES[season_id]
    if season_id >= 1:
        start = season_id + 1998
        return f"{start}/{start + 1}"
    return str(season_id)


def normalize_name_key(raw: str) -> str:
    import unicodedata

    text = unicodedata.normalize("NFC", raw or "")
    for old, new in (
        ("'", "'"),
        ("ʼ", "'"),
        ("`", "'"),
        ("׳", "'"),
        ("\u200f", ""),
        ("\u200e", ""),
        ("\xa0", " "),
    ):
        text = text.replace(old, new)
    return " ".join(text.split()).casefold()


def normalize_staff_name(raw: str) -> str:
    return " ".join((raw or "").split())


def normalize_display_name(raw: str) -> str:
    text = " ".join((raw or "").split())
    if not text:
        return text
    parts = text.split()
    if len(parts) >= 2:
        return " ".join(parts[1:] + [parts[0]])
    return text


def is_oranit_team_name(name: str) -> bool:
    text = name or ""
    return any(marker in text for marker in ORANIT_NAME_MARKERS)


def is_league_competition(text: str) -> bool:
    competition = (text or "").strip()
    if not competition:
        return False
    if any(marker in competition for marker in NON_LEAGUE_MARKERS):
        return False
    return True


def parse_teams_column(text: str) -> tuple[str, str] | None:
    parts = [part.strip() for part in (text or "").split(" - ") if part.strip()]
    if len(parts) < 2:
        return None
    if len(parts) >= 3:
        return parts[-2], parts[-1]
    return parts[0], parts[1]


def parse_score_pair(text: str) -> tuple[int, int] | None:
    """IFA team-games column uses guest score first, home score second."""
    match = re.search(r"(\d+)\s*[-–:]\s*(\d+)", text or "")
    if not match:
        return None
    return int(match.group(1)), int(match.group(2))


def outcome_from_goals(for_oranit: int, against: int) -> str:
    if for_oranit > against:
        return "W"
    if for_oranit < against:
        return "L"
    return "D"


def extract_team_id_from_href(href: str | None) -> str | None:
    if not href:
        return None
    parsed = urlparse(href)
    ids = parse_qs(parsed.query).get("team_id") or []
    return ids[0] if ids else None


def parse_int(value: str) -> int:
    digits = re.sub(r"[^\d]", "", value or "")
    return int(digits) if digits else 0


def column_text(column: BeautifulSoup) -> str:
    clone = BeautifulSoup(str(column), "html.parser")
    for hidden in clone.select(".sr-only"):
        hidden.decompose()
    return clone.get_text(" ", strip=True)


def resolve_minutes(
    caps: int,
    started: int,
    sub_in: int,
    api_minutes: int,
) -> int:
    """
    Use IFA TotalMin when present; otherwise estimate from lineup data.
    Starters assumed 90 min; substitute appearances ~30 min each.
    """
    if api_minutes > 0:
        return api_minutes
    if caps <= 0:
        return 0
    if started > 0 or sub_in > 0:
        subs = sub_in if sub_in > 0 else max(0, caps - started)
        return started * 90 + subs * 30
    return caps * 90


def extract_player_id(href: str | None) -> str | None:
    if not href:
        return None
    parsed = urlparse(href)
    params = parse_qs(parsed.query)
    ids = params.get("player_id") or []
    return ids[0] if ids else None


def parse_stat_row(row: BeautifulSoup) -> dict[str, Any] | None:
    cols = row.select(".table_col")
    if len(cols) < 3:
        return None

    name = column_text(cols[0])
    caps = parse_int(column_text(cols[COL_GAMES])) if len(cols) > COL_GAMES else 0
    goals = parse_int(column_text(cols[COL_GOALS])) if len(cols) > COL_GOALS else 0
    yellow_league = (
        parse_int(column_text(cols[COL_YELLOW_LEAGUE]))
        if len(cols) > COL_YELLOW_LEAGUE
        else 0
    )
    yellow_toto = (
        parse_int(column_text(cols[COL_YELLOW_TOTO])) if len(cols) > COL_YELLOW_TOTO else 0
    )
    red = parse_int(column_text(cols[COL_RED])) if len(cols) > COL_RED else 0
    started = parse_int(column_text(cols[COL_STARTED])) if len(cols) > COL_STARTED else 0
    sub_in = parse_int(column_text(cols[COL_SUB_IN])) if len(cols) > COL_SUB_IN else 0
    api_minutes = (
        parse_int(column_text(cols[COL_MINUTES])) if len(cols) > COL_MINUTES else 0
    )

    display = normalize_display_name(name)
    minutes = resolve_minutes(caps, started, sub_in, api_minutes)

    return {
        "player_id": str(extract_player_id(row.get("href")) or display),
        "name": display,
        "name_key": normalize_name_key(display),
        "caps": caps,
        "goals": goals,
        "yellow_cards": yellow_league + yellow_toto,
        "red_cards": red,
        "minutes": minutes,
        "started": started,
        "sub_in": sub_in,
    }


@dataclass
class SeasonLeagueRecord:
    season_id: int
    season_label: str
    matches: int
    wins: int
    draws: int
    losses: int


class IfaClient:
    def __init__(self, delay: float = 2.0, verify_ssl: bool = True) -> None:
        self.delay = delay
        self.session = requests.Session()
        self.session.headers.update(DEFAULT_HEADERS)
        self.verify_ssl = verify_ssl
        self._last_request = 0.0

    def _throttle(self) -> None:
        elapsed = time.monotonic() - self._last_request
        if elapsed < self.delay:
            time.sleep(self.delay - elapsed)

    def get(self, url: str, **kwargs: Any) -> requests.Response | None:
        self._throttle()
        kwargs.setdefault("timeout", REQUEST_TIMEOUT)
        kwargs.setdefault("verify", self.verify_ssl)
        try:
            response = self.session.get(url, **kwargs)
        except requests.RequestException as exc:
            print(f"  ! request error ({REQUEST_TIMEOUT}s): {exc}", flush=True)
            return None
        self._last_request = time.monotonic()
        if response.status_code in BLOCKED_HTTP_STATUSES:
            print(
                f"  ! HTTP {response.status_code} — skipping: {url[:90]}",
                flush=True,
            )
            return None
        if response.status_code >= 400:
            print(
                f"  ! HTTP {response.status_code} — skipping: {url[:90]}",
                flush=True,
            )
            return None
        return response

    def fetch_season_label(self, season_id: int) -> str:
        return season_id_to_label(season_id)

    def fetch_player_statistics(self, season_id: int) -> list[dict[str, Any]]:
        url = (
            f"{STATS_API}?teamId={TEAM_ID}&seasonId={season_id}"
            '&isFemale="False"'
        )
        response = self.get(
            url,
            headers={
                **DEFAULT_HEADERS,
                "Accept": "application/json, text/javascript, */*; q=0.01",
                "Referer": f"{TEAM_PAGE}?team_id={TEAM_ID}&season_id={season_id}",
            },
        )
        if response is None:
            return []

        root = ET.fromstring(response.text)
        node = root.find(".//t:HtmlData", NS)
        if node is None:
            node = root.find(".//{http://tempuri.org/}HtmlData")
        if node is None or not node.text:
            return []

        fragment = html_lib.unescape(node.text)
        soup = BeautifulSoup(fragment, "html.parser")
        players: list[dict[str, Any]] = []

        for row in soup.select("a.table_row"):
            parsed = parse_stat_row(row)
            if parsed:
                players.append(parsed)
        return players

    def fetch_html_page(self, url: str, referer: str) -> BeautifulSoup | None:
        response = self.get(url, headers={**DEFAULT_HEADERS, "Referer": referer})
        if response is None:
            return None
        return BeautifulSoup(response.text, "html.parser")

    def fetch_staff_page(self, season_id: int) -> BeautifulSoup | None:
        url = (
            f"{BASE_URL}/?catid={TEAM_CAT_ID}&itemid={STAFF_ITEM_ID}"
            f"&team_id={TEAM_ID}&season_id={season_id}"
        )
        return self.fetch_html_page(
            url,
            referer=f"{TEAM_PAGE}?team_id={TEAM_ID}&season_id={season_id}",
        )

    def fetch_team_details_page(self, season_id: int) -> BeautifulSoup | None:
        url = f"{TEAM_PAGE}?team_id={TEAM_ID}&season_id={season_id}"
        return self.fetch_html_page(
            url,
            referer=f"{TEAM_PAGE}?team_id={TEAM_ID}&season_id={season_id}",
        )

    def fetch_team_games_page(self, season_id: int) -> BeautifulSoup | None:
        url = f"{TEAM_PAGE}team-games?team_id={TEAM_ID}&season_id={season_id}"
        return self.fetch_html_page(
            url,
            referer=f"{TEAM_PAGE}?team_id={TEAM_ID}&season_id={season_id}",
        )

    def fetch_game_page(self, game_id: str, season_id: int) -> BeautifulSoup | None:
        url = f"{BASE_URL}/leagues/games/game/?game_id={game_id}"
        return self.fetch_html_page(
            url,
            referer=(
                f"{TEAM_PAGE}team-games?team_id={TEAM_ID}&season_id={season_id}"
            ),
        )


@dataclass
class LeagueMatch:
    game_id: str
    season_id: int
    season_label: str
    outcome: str
    home_team: str
    away_team: str


def parse_league_match_row(
    row: BeautifulSoup,
    season_id: int,
    season_label: str,
) -> LeagueMatch | None:
    cols = row.select(".table_col")
    if len(cols) < 5:
        return None

    competition = cols[2].get_text(" ", strip=True)
    if not is_league_competition(competition):
        return None

    teams = parse_teams_column(cols[1].get_text(" ", strip=True))
    score = parse_score_pair(cols[4].get_text(" ", strip=True))
    href = row.get("href")
    if not teams or not score or not href:
        return None

    home_team, away_team = teams
    guest_score, home_score = score
    if is_oranit_team_name(home_team):
        oranit_goals, opponent_goals = home_score, guest_score
    elif is_oranit_team_name(away_team):
        oranit_goals, opponent_goals = guest_score, home_score
    else:
        return None

    parsed = urlparse(href)
    game_ids = parse_qs(parsed.query).get("game_id") or []
    if not game_ids:
        return None

    return LeagueMatch(
        game_id=game_ids[0],
        season_id=season_id,
        season_label=season_label,
        outcome=outcome_from_goals(oranit_goals, opponent_goals),
        home_team=home_team,
        away_team=away_team,
    )


def parse_league_table_summary(soup: BeautifulSoup) -> tuple[int, int, int, int] | None:
    """
    Read season W/D/L from the league table row on team-details
    (מקום · שם · משחקים · ניצחונות · תיקו · הפסדים · …).
    """
    for row in soup.select("a.table_row"):
        cols = row.select(".table_col")
        if len(cols) < 6:
            continue
        rank_text = cols[0].get_text(" ", strip=True)
        team_name = cols[1].get_text(" ", strip=True)
        if "מקום" not in rank_text or not is_oranit_team_name(team_name):
            continue
        matches = parse_int(cols[2].get_text(" ", strip=True))
        wins = parse_int(cols[3].get_text(" ", strip=True))
        draws = parse_int(cols[4].get_text(" ", strip=True))
        losses = parse_int(cols[5].get_text(" ", strip=True))
        if matches > 0:
            return wins, draws, losses, matches
    return None


def fetch_season_league_record(
    client: IfaClient,
    season_id: int,
    season_label: str,
) -> SeasonLeagueRecord | None:
    """One team-details request; fall back to team-games list if table missing."""
    soup = client.fetch_team_details_page(season_id)
    if soup:
        summary = parse_league_table_summary(soup)
        if summary:
            wins, draws, losses, matches = summary
            return SeasonLeagueRecord(
                season_id=season_id,
                season_label=season_label,
                matches=matches,
                wins=wins,
                draws=draws,
                losses=losses,
            )

    matches = list_league_matches(client, season_id, season_label)
    if not matches:
        return None
    wins, draws, losses, total = season_outcome_totals(matches)
    return SeasonLeagueRecord(
        season_id=season_id,
        season_label=season_label,
        matches=total,
        wins=wins,
        draws=draws,
        losses=losses,
    )


def list_league_matches(client: IfaClient, season_id: int, season_label: str) -> list[LeagueMatch]:
    soup = client.fetch_team_games_page(season_id)
    if not soup:
        return []

    matches: list[LeagueMatch] = []
    rows = soup.select("a.table_row.link_url[href*='game_id']")
    if not rows:
        rows = soup.select("section.games_table a.table_row.link_url[href*='game_id']")

    for row in rows:
        match = parse_league_match_row(row, season_id, season_label)
        if match:
            matches.append(match)
    return matches


def season_caps_for_players(
    aggregates: dict[str, PlayerAggregate],
    season_id: int,
) -> list[tuple[PlayerAggregate, int]]:
    roster: list[tuple[PlayerAggregate, int]] = []
    for agg in aggregates.values():
        for season in agg.seasons:
            if season.season_id == season_id and season.caps > 0:
                roster.append((agg, season.caps))
                break
    return roster


def distribute_outcomes_proportional(
    record: SeasonLeagueRecord,
    roster: list[tuple[PlayerAggregate, int]],
) -> int:
    """
    Allocate season W/D/L to players by share of squad caps (one page, no per-game fetches).
    """
    total_caps = sum(caps for _, caps in roster)
    if total_caps <= 0:
        return 0

    allocations: dict[str, list[int]] = {
        "wins": [0] * len(roster),
        "draws": [0] * len(roster),
        "losses": [0] * len(roster),
    }
    for key, target in (
        ("wins", record.wins),
        ("draws", record.draws),
        ("losses", record.losses),
    ):
        raw = [target * caps / total_caps for _, caps in roster]
        floors = [int(value) for value in raw]
        allocated = sum(floors)
        remainders = sorted(
            ((raw[index] - floors[index], index) for index in range(len(roster))),
            reverse=True,
        )
        for offset in range(target - allocated):
            if offset < len(remainders):
                floors[remainders[offset][1]] += 1
        allocations[key] = floors

    credited = 0
    for index, (agg, caps) in enumerate(roster):
        if caps <= 0:
            continue
        agg.wins += allocations["wins"][index]
        agg.draws += allocations["draws"][index]
        agg.losses += allocations["losses"][index]
        credited += 1
    return credited


def ingest_season_player_rows(
    aggregates: dict[str, PlayerAggregate],
    season_id: int,
    season_label: str,
    rows: list[dict[str, Any]],
) -> None:
    for row in rows:
        key = row["player_id"]
        if key not in aggregates:
            aggregates[key] = PlayerAggregate(player_id=key, name=row["name"])
        agg = aggregates[key]
        if row["name"] and len(row["name"]) >= len(agg.name):
            agg.name = row["name"]
        season = PlayerSeason(
            season_id=season_id,
            season_label=season_label,
            caps=row["caps"],
            goals=row["goals"],
            yellow_cards=row["yellow_cards"],
            red_cards=row["red_cards"],
            minutes=row["minutes"],
            started=row["started"],
            sub_in=row["sub_in"],
        )
        agg.add_season(season)


def scrape_player_outcomes(
    client: IfaClient,
    season_start: int,
    season_end: int,
    aggregates: dict[str, PlayerAggregate],
    on_season_done: Any | None = None,
) -> None:
    """
    Fast path: team-details league table + seasonal caps (2 requests/season).
    """
    for season_id in range(season_start, season_end + 1):
        label = client.fetch_season_label(season_id)
        record = fetch_season_league_record(client, season_id, label)
        if not record or record.matches <= 0:
            print(f"  [outcomes {season_id}] no league summary — skip", flush=True)
            if on_season_done:
                on_season_done()
            continue

        roster = season_caps_for_players(aggregates, season_id)
        if not roster:
            rows = client.fetch_player_statistics(season_id)
            if rows:
                ingest_season_player_rows(aggregates, season_id, label, rows)
                roster = season_caps_for_players(aggregates, season_id)

        credited = distribute_outcomes_proportional(record, roster)
        print(
            f"  [outcomes {season_id}] table {record.wins}W {record.draws}D "
            f"{record.losses}L / {record.matches} — {credited} players",
            flush=True,
        )
        if on_season_done:
            on_season_done()


def season_outcome_totals(matches: list[LeagueMatch]) -> tuple[int, int, int, int]:
    wins = sum(1 for match in matches if match.outcome == "W")
    draws = sum(1 for match in matches if match.outcome == "D")
    losses = sum(1 for match in matches if match.outcome == "L")
    total = wins + draws + losses
    return wins, draws, losses, total


def detect_oranit_side_from_game(soup: BeautifulSoup) -> str | None:
    home_link = soup.select_one(".teams-names .team-home a[href*='team_id']")
    guest_link = soup.select_one(".teams-names .team-guest a[href*='team_id']")
    home_id = extract_team_id_from_href(home_link.get("href") if home_link else None)
    guest_id = extract_team_id_from_href(guest_link.get("href") if guest_link else None)
    if home_id == str(TEAM_ID):
        return "home"
    if guest_id == str(TEAM_ID):
        return "guest"
    return None


def extract_coach_from_match_report(
    soup: BeautifulSoup,
    oranit_side: str,
) -> tuple[str, str] | None:
    """
    Parse מאמן block inside match protocol (#teams panel).
    """
    side_class = "home" if oranit_side == "home" else "guest"

    for block in soup.select("#teams div.home, #teams div.guest"):
        classes = block.get("class") or []
        if side_class not in classes:
            continue
        link = block.select_one("a[href*='coach_id']")
        if not link:
            continue
        name_el = block.select_one("b.name")
        if not name_el:
            continue

        name = normalize_staff_name(name_el.get_text(" ", strip=True))
        if not name:
            continue

        coach_id = ""
        if link.get("href"):
            parsed = urlparse(link["href"])
            ids = parse_qs(parsed.query).get("coach_id") or []
            coach_id = ids[0] if ids and ids[0] != "-1" else ""

        return name, coach_id

    return None


def extract_oranit_coach_from_game(soup: BeautifulSoup) -> tuple[str, str] | None:
    oranit_side = detect_oranit_side_from_game(soup)
    if not oranit_side:
        return None
    return extract_coach_from_match_report(soup, oranit_side)


def resolve_manager_key(
    name: str,
    aggregates: dict[str, ManagerAggregate],
) -> str:
    """Merge managers across IFA name variants (staff page vs match protocol)."""
    candidates = {
        normalize_name_key(name),
        normalize_name_key(normalize_display_name(name)),
        normalize_name_key(normalize_staff_name(name)),
    }
    for key in candidates:
        if key and key in aggregates:
            return key

    tokens = [token for token in name.split() if len(token) >= 3]
    for existing_key, aggregate in aggregates.items():
        existing_tokens = aggregate.name.split()
        if any(
            token in aggregate.name or token in existing_tokens for token in tokens
        ):
            return existing_key

    return normalize_name_key(name) or normalize_name_key(normalize_display_name(name))


def get_or_create_manager(
    aggregates: dict[str, ManagerAggregate],
    name: str,
    member_id: str = "",
) -> ManagerAggregate:
    key = resolve_manager_key(name, aggregates)
    if key not in aggregates:
        aggregates[key] = ManagerAggregate(name=name, member_id=member_id)
    aggregate = aggregates[key]
    if len(name) > len(aggregate.name):
        aggregate.name = name
    if member_id and member_id != "-1" and not aggregate.member_id:
        aggregate.member_id = member_id
    return aggregate


def scrape_managers_from_match_reports(
    client: IfaClient,
    season_id: int,
    season_label: str,
    matches: list[LeagueMatch],
    aggregates: dict[str, ManagerAggregate],
) -> int:
    credited = 0
    skipped = 0

    for index, match in enumerate(matches, start=1):
        soup = client.fetch_game_page(match.game_id, season_id)
        if not soup:
            skipped += 1
            continue

        coach = extract_oranit_coach_from_game(soup)
        if not coach:
            skipped += 1
            continue

        name, member_id = coach
        aggregate = get_or_create_manager(aggregates, name, member_id)
        aggregate.add_match_result(season_id, season_label, match.outcome)
        credited += 1

    print(
        f"  [managers {season_id}] match reports: {credited}/{len(matches)} credited, "
        f"{skipped} skipped",
        flush=True,
    )
    return credited


def extract_head_coach(soup: BeautifulSoup) -> tuple[str, str] | None:
    """Return (name, member_id) for head coach from staff page."""
    candidates: list[tuple[str, str, int]] = []

    for li in soup.select("#teamStaff li"):
        text_div = li.select_one("div.text")
        if not text_div:
            continue

        role_span = text_div.select_one("span")
        roles = role_span.get_text(strip=True) if role_span else ""
        if HEAD_COACH_ROLE not in roles and "מאמן" not in roles:
            continue

        name = ""
        for child in text_div.children:
            if isinstance(child, str) and child.strip():
                name = normalize_staff_name(child)
                break
        if not name:
            img = li.select_one("figure img")
            if img and img.get("alt"):
                name = normalize_staff_name(img["alt"])

        if not name:
            continue

        member_id = ""
        link = li.select_one("a[href*='MEMBER_ID']")
        if link and link.get("href"):
            parsed = urlparse(link["href"])
            params = parse_qs(parsed.query)
            ids = params.get("MEMBER_ID") or []
            member_id = ids[0] if ids else ""

        priority = 0 if HEAD_COACH_ROLE in roles else 1
        candidates.append((name, member_id, priority))

    if not candidates:
        return None

    candidates.sort(key=lambda c: c[2])
    best = candidates[0]
    return best[0], best[1]


def scrape_managers(
    client: IfaClient,
    season_start: int,
    season_end: int,
) -> dict[str, ManagerAggregate]:
    aggregates: dict[str, ManagerAggregate] = {}

    for season_id in range(season_start, season_end + 1):
        label = client.fetch_season_label(season_id)
        record = fetch_season_league_record(client, season_id, label)

        soup = client.fetch_staff_page(season_id)
        coach = extract_head_coach(soup) if soup else None

        if coach and record:
            name, member_id = coach
            aggregate = get_or_create_manager(aggregates, name, member_id)
            aggregate.add_season(
                ManagerSeason(
                    season_id=season_id,
                    season_label=label,
                    matches=record.matches,
                    wins=record.wins,
                    draws=record.draws,
                    losses=record.losses,
                )
            )
            print(
                f"  [managers {season_id}] {name} — staff profile "
                f"({record.wins}W {record.draws}D {record.losses}L / {record.matches})",
                flush=True,
            )
            continue

        matches = list_league_matches(client, season_id, label)
        if not matches:
            print(f"  [managers {season_id}] no league matches for fallback", flush=True)
            continue

        reason = "staff page unavailable" if not soup else "no head coach on staff page"
        print(
            f"  [managers {season_id}] {reason} — scanning {len(matches)} match reports…",
            flush=True,
        )
        scrape_managers_from_match_reports(
            client,
            season_id,
            label,
            matches,
            aggregates,
        )

    return aggregates


def _merge_season_stats(existing: PlayerSeason, incoming: PlayerSeason) -> None:
    existing.caps = max(existing.caps, incoming.caps)
    existing.goals = max(existing.goals, incoming.goals)
    existing.yellow_cards = max(existing.yellow_cards, incoming.yellow_cards)
    existing.red_cards = max(existing.red_cards, incoming.red_cards)
    existing.minutes = max(existing.minutes, incoming.minutes)
    existing.started = max(existing.started, incoming.started)
    existing.sub_in = max(existing.sub_in, incoming.sub_in)


def merge_aggregates_by_name(
    by_id: dict[str, PlayerAggregate],
) -> dict[str, PlayerAggregate]:
    merged: dict[str, PlayerAggregate] = {}

    for agg in by_id.values():
        key = normalize_name_key(agg.name)
        if key not in merged:
            merged[key] = PlayerAggregate(
                player_id=agg.player_id,
                name=agg.name,
                seasons=list(agg.seasons),
                wins=agg.wins,
                draws=agg.draws,
                losses=agg.losses,
            )
            continue

        target = merged[key]
        if len(agg.name) > len(target.name):
            target.name = agg.name
        if sum(s.caps for s in agg.seasons) > sum(s.caps for s in target.seasons):
            target.player_id = agg.player_id
        target.wins += agg.wins
        target.draws += agg.draws
        target.losses += agg.losses

        by_season = {s.season_id: s for s in target.seasons}
        for season in agg.seasons:
            if season.season_id in by_season:
                _merge_season_stats(by_season[season.season_id], season)
            else:
                target.seasons.append(season)
                by_season[season.season_id] = season

    return merged


def scrape_seasons(
    client: IfaClient,
    season_start: int,
    season_end: int,
) -> dict[str, PlayerAggregate]:
    aggregates: dict[str, PlayerAggregate] = {}

    for season_id in range(season_start, season_end + 1):
        label = client.fetch_season_label(season_id)
        print(f"[season {season_id}] {label} …", flush=True)

        rows = client.fetch_player_statistics(season_id)
        if not rows:
            print("  · no player statistics for this season")
            continue

        active = 0
        for row in rows:
            key = row["player_id"]
            if key not in aggregates:
                aggregates[key] = PlayerAggregate(player_id=key, name=row["name"])
            agg = aggregates[key]
            if row["name"] and len(row["name"]) >= len(agg.name):
                agg.name = row["name"]

            season = PlayerSeason(
                season_id=season_id,
                season_label=label,
                caps=row["caps"],
                goals=row["goals"],
                yellow_cards=row["yellow_cards"],
                red_cards=row["red_cards"],
                minutes=row["minutes"],
                started=row["started"],
                sub_in=row["sub_in"],
            )
            agg.add_season(season)
            if season.has_activity():
                active += 1

        print(f"  · {len(rows)} players, {active} with recorded activity")

    return aggregates


def managers_to_output(aggregates: dict[str, ManagerAggregate]) -> list[dict[str, Any]]:
    managers: list[dict[str, Any]] = []
    for agg in aggregates.values():
        totals = agg.totals()
        if totals["totalMatches"] <= 0:
            continue
        managers.append(
            {
                "managerId": agg.member_id or normalize_name_key(agg.name),
                "name": agg.name,
                "totalMatches": totals["totalMatches"],
                "wins": totals["wins"],
                "draws": totals["draws"],
                "losses": totals["losses"],
                "points": totals["points"],
                "seasons": totals["seasons"],
                "seasonDetails": [
                    {
                        "seasonId": s.season_id,
                        "seasonLabel": s.season_label,
                        "matches": s.matches,
                        "wins": s.wins,
                        "draws": s.draws,
                        "losses": s.losses,
                    }
                    for s in sorted(agg.seasons, key=lambda x: x.season_id)
                ],
            }
        )
    managers.sort(
        key=lambda m: (-m["points"], -m["wins"], -m["totalMatches"], m["name"]),
    )
    return managers


def to_output(
    aggregates: dict[str, PlayerAggregate],
    managers: dict[str, ManagerAggregate],
) -> dict[str, Any]:
    players: list[dict[str, Any]] = []

    for agg in aggregates.values():
        totals = agg.recompute_totals()
        if totals["caps"] == 0 and totals["goals"] == 0:
            continue
        players.append(
            {
                "playerId": agg.player_id,
                "name": agg.name,
                "goals": totals["goals"],
                "caps": totals["caps"],
                "yellowCards": totals["yellowCards"],
                "redCards": totals["redCards"],
                "minutesPlayed": totals["minutesPlayed"],
                "wins": totals["wins"],
                "draws": totals["draws"],
                "losses": totals["losses"],
                "seasons": totals["seasons"],
            }
        )

    players.sort(
        key=lambda p: (-p["goals"], -p["caps"], p["name"]),
    )
    return {
        "teamId": TEAM_ID,
        "teamName": "הפועל אורנית",
        "source": "football.org.il",
        "scrapedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "players": players,
        "managers": managers_to_output(managers),
    }


def sync_player_outcomes_to_payload(
    payload: dict[str, Any],
    aggregates: dict[str, PlayerAggregate],
) -> None:
    """Write wins/draws/losses from scraped aggregates into payload players."""
    players = payload.get("players", [])
    by_id = {str(player["playerId"]): player for player in players if player.get("playerId")}
    by_name = {
        normalize_name_key(str(player.get("name", ""))): player
        for player in players
        if player.get("name")
    }

    matched = 0
    for agg in aggregates.values():
        row = by_id.get(agg.player_id) or by_name.get(normalize_name_key(agg.name))
        if not row:
            continue
        row["wins"] = agg.wins
        row["draws"] = agg.draws
        row["losses"] = agg.losses
        matched += 1

    for player in players:
        player.setdefault("wins", 0)
        player.setdefault("draws", 0)
        player.setdefault("losses", 0)

    print(
        f"  · synced W/D/L for {matched}/{len(players)} players",
        flush=True,
    )


def write_json(data: dict[str, Any], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as handle:
        json.dump(data, handle, ensure_ascii=False, indent=2)
        handle.write("\n")


class ProgressWriter:
    """Persist partial results after each season or on interrupt."""

    def __init__(
        self,
        output_path: Path,
        payload: dict[str, Any],
        aggregates: dict[str, PlayerAggregate],
        managers: dict[str, ManagerAggregate] | None = None,
        outcomes_only: bool = False,
    ) -> None:
        self.output_path = output_path
        self.payload = payload
        self.aggregates = aggregates
        self.managers = managers
        self.outcomes_only = outcomes_only

    def save(self, label: str = "checkpoint") -> None:
        try:
            if self.outcomes_only:
                sync_player_outcomes_to_payload(self.payload, self.aggregates)
            elif self.aggregates:
                merged = merge_aggregates_by_name(self.aggregates)
                updated = to_output(merged, self.managers or {})
                self.payload["players"] = updated["players"]
                if self.managers is not None:
                    self.payload["managers"] = updated["managers"]
            if self.managers is not None and self.payload.get("managers") is None:
                self.payload["managers"] = managers_to_output(self.managers)
            self.payload["scrapedAt"] = time.strftime(
                "%Y-%m-%dT%H:%M:%SZ",
                time.gmtime(),
            )
            write_json(self.payload, self.output_path)
            print(f"  · saved {label} -> {self.output_path}", flush=True)
        except OSError as exc:
            print(f"  ! could not save progress: {exc}", file=sys.stderr)


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    default_out = root / "src" / "data" / "oranitData.json"

    parser = argparse.ArgumentParser(description="Scrape IFA all-time Oranit stats")
    parser.add_argument(
        "--season-start",
        type=int,
        default=DEFAULT_SEASON_START,
        help=f"First season_id (default {DEFAULT_SEASON_START})",
    )
    parser.add_argument(
        "--season-end",
        type=int,
        default=DEFAULT_SEASON_END,
        help=f"Last season_id (default {DEFAULT_SEASON_END})",
    )
    parser.add_argument("--delay", type=float, default=2.0)
    parser.add_argument("--output", type=Path, default=default_out)
    parser.add_argument("--insecure", action="store_true")
    parser.add_argument(
        "--managers-only",
        action="store_true",
        help="Only refresh managers; keep existing players from --output",
    )
    parser.add_argument(
        "--outcomes-only",
        action="store_true",
        help="Refresh W/D/L for players and managers; keep other player stats",
    )
    parser.add_argument(
        "--skip-outcomes",
        action="store_true",
        help="Skip league outcome scraping (faster, no W/D/L)",
    )
    args = parser.parse_args()

    if args.season_start > args.season_end:
        print("season-start must be <= season-end", file=sys.stderr)
        return 1

    client = IfaClient(delay=args.delay, verify_ssl=not args.insecure)
    print(
        f"Scraping Hapoel Oranit (team_id={TEAM_ID}), "
        f"seasons {args.season_start}–{args.season_end}, "
        f"delay={args.delay}s, timeout={REQUEST_TIMEOUT}s",
        flush=True,
    )

    aggregates: dict[str, PlayerAggregate] = {}
    payload: dict[str, Any] = {}
    managers: dict[str, ManagerAggregate] = {}
    progress: ProgressWriter | None = None
    exit_code = 0

    def persist_checkpoint(label: str) -> None:
        if progress:
            progress.save(label)

    def handle_stop(_signum: int, _frame: Any) -> None:
        print("\nInterrupted — saving progress…", flush=True)
        persist_checkpoint("interrupt")
        raise SystemExit(130)

    try:
        signal.signal(signal.SIGINT, handle_stop)
        if hasattr(signal, "SIGTERM"):
            signal.signal(signal.SIGTERM, handle_stop)

        if (args.managers_only or args.outcomes_only) and args.output.is_file():
            with args.output.open(encoding="utf-8") as handle:
                payload = json.load(handle)
            mode = "managers" if args.managers_only else "outcomes"
            print(f"Loaded existing dataset — updating {mode} only", flush=True)
            for player in payload.get("players", []):
                pid = str(player.get("playerId", ""))
                if not pid:
                    continue
                aggregates[pid] = PlayerAggregate(
                    player_id=pid,
                    name=player.get("name", ""),
                )
        else:
            aggregates = scrape_seasons(client, args.season_start, args.season_end)
            payload = to_output(aggregates, {})

        progress = ProgressWriter(
            args.output,
            payload,
            aggregates,
            managers=None,
            outcomes_only=args.outcomes_only or args.managers_only,
        )
        if not args.skip_outcomes:
            print(
                "\nScraping league outcomes (season tables, ~2 req/season)…",
                flush=True,
            )
            for agg in aggregates.values():
                agg.wins = 0
                agg.draws = 0
                agg.losses = 0
            scrape_player_outcomes(
                client,
                args.season_start,
                args.season_end,
                aggregates,
                on_season_done=lambda: persist_checkpoint("season"),
            )

            before = len(aggregates)
            aggregates = merge_aggregates_by_name(aggregates)
            if len(aggregates) < before:
                print(
                    f"Merged {before} player IDs into {len(aggregates)} profiles",
                    flush=True,
                )

            if args.outcomes_only or args.managers_only:
                sync_player_outcomes_to_payload(payload, aggregates)
            else:
                payload = to_output(aggregates, {})

            players_with_results = sum(
                1
                for player in payload.get("players", [])
                if (player.get("wins") or 0)
                + (player.get("draws") or 0)
                + (player.get("losses") or 0)
                > 0
            )
            print(
                f"  · league outcomes complete — {players_with_results} players "
                f"with W/D/L recorded",
                flush=True,
            )
            persist_checkpoint("outcomes")

        print("\nScraping head coaches (בעלי תפקידים)…", flush=True)
        managers = scrape_managers(client, args.season_start, args.season_end)
        payload["managers"] = managers_to_output(managers)
        if progress:
            progress.managers = managers
        payload["scrapedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        write_json(payload, args.output)

        if payload.get("managers"):
            top_mgr = payload["managers"][0]
            print(
                f"  · top manager: {top_mgr['name']} — "
                f"{top_mgr.get('points', 0)} pts "
                f"({top_mgr.get('wins', 0)}W {top_mgr.get('draws', 0)}D "
                f"{top_mgr.get('losses', 0)}L)",
                flush=True,
            )

        player_count = len(payload.get("players", []))
        manager_count = len(payload.get("managers", []))
        print(
            f"\nDone — {player_count} players, "
            f"{manager_count} managers -> {args.output}",
            flush=True,
        )
        if payload.get("players"):
            top = payload["players"][0]
            print(
                f"Leader: {top['name']} — {top['goals']} goals, "
                f"{top['caps']} caps, {top['minutesPlayed']} min",
                flush=True,
            )
    except SystemExit as exc:
        exit_code = int(exc.code) if exc.code is not None else 1
    except Exception as exc:
        print(f"\nFatal error: {exc}", file=sys.stderr)
        persist_checkpoint("error")
        exit_code = 1
    finally:
        if progress and exit_code == 0:
            pass  # final write already done

    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
