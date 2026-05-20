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

import requests
from bs4 import BeautifulSoup

TEAM_ID = 2735
BASE_URL = "https://www.football.org.il"
STATS_API = f"{BASE_URL}/Components.asmx/GetTeamPlayersStatisticsList"
TEAM_PAGE = f"{BASE_URL}/team-details/"
TEAM_CAT_ID = "2cf66391-238f-4199-aa04-4c61c7b892a9"
STAFF_ITEM_ID = "d9e76668-5f1a-4149-ab0f-ba59a233c363"
HEAD_COACH_ROLE = "מאמן הקבוצה"

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
    matches: int


@dataclass
class ManagerAggregate:
    name: str
    member_id: str = ""
    seasons: list[ManagerSeason] = field(default_factory=list)

    def add_season(self, season: ManagerSeason) -> None:
        if season.matches <= 0:
            return
        self.seasons.append(season)

    def totals(self) -> dict[str, Any]:
        labels = sorted({s.season_label for s in self.seasons})
        return {
            "totalMatches": sum(s.matches for s in self.seasons),
            "seasons": labels,
        }


@dataclass
class PlayerAggregate:
    player_id: str
    name: str
    seasons: list[PlayerSeason] = field(default_factory=list)

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

    def get(self, url: str, **kwargs: Any) -> requests.Response:
        self._throttle()
        response = self.session.get(url, verify=self.verify_ssl, timeout=45, **kwargs)
        self._last_request = time.monotonic()
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
        if response.status_code == 403:
            raise RuntimeError(
                f"IFA blocked request for season {season_id} (HTTP 403). "
                "Increase --delay or retry later."
            )
        response.raise_for_status()

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

    def fetch_staff_page(self, season_id: int) -> BeautifulSoup | None:
        url = (
            f"{BASE_URL}/?catid={TEAM_CAT_ID}&itemid={STAFF_ITEM_ID}"
            f"&team_id={TEAM_ID}&season_id={season_id}"
        )
        try:
            response = self.get(
                url,
                headers={
                    **DEFAULT_HEADERS,
                    "Referer": f"{TEAM_PAGE}?team_id={TEAM_ID}&season_id={season_id}",
                },
            )
            if response.status_code != 200:
                return None
            return BeautifulSoup(response.text, "html.parser")
        except requests.RequestException:
            return None

    def fetch_team_match_count(self, season_id: int) -> int:
        url = f"{TEAM_PAGE}team-games?team_id={TEAM_ID}&season_id={season_id}"
        try:
            response = self.get(
                url,
                headers={
                    **DEFAULT_HEADERS,
                    "Referer": f"{TEAM_PAGE}?team_id={TEAM_ID}&season_id={season_id}",
                },
            )
            if response.status_code != 200:
                return 0
            soup = BeautifulSoup(response.text, "html.parser")
            games = soup.select("a.table_row.link_url[href*='game_id']")
            if games:
                return len(games)
            return len(
                soup.select("section.games_table a.table_row.link_url[href*='game_id']")
            )
        except requests.RequestException:
            return 0


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
        soup = client.fetch_staff_page(season_id)
        if not soup:
            print(f"  [managers {season_id}] staff page unavailable", flush=True)
            continue

        coach = extract_head_coach(soup)
        if not coach:
            print(f"  [managers {season_id}] no head coach listed", flush=True)
            continue

        name, member_id = coach
        matches = client.fetch_team_match_count(season_id)
        key = normalize_name_key(name)

        if key not in aggregates:
            aggregates[key] = ManagerAggregate(name=name, member_id=member_id)
        agg = aggregates[key]
        if member_id and not agg.member_id:
            agg.member_id = member_id
        agg.add_season(
            ManagerSeason(
                season_id=season_id,
                season_label=label,
                matches=matches,
            )
        )
        print(
            f"  [managers {season_id}] {name} — {matches} team matches",
            flush=True,
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
            )
            continue

        target = merged[key]
        if len(agg.name) > len(target.name):
            target.name = agg.name
        if sum(s.caps for s in agg.seasons) > sum(s.caps for s in target.seasons):
            target.player_id = agg.player_id

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

        try:
            rows = client.fetch_player_statistics(season_id)
        except requests.RequestException as exc:
            print(f"  ! skipped: {exc}", file=sys.stderr)
            continue
        except RuntimeError as exc:
            print(f"  ! {exc}", file=sys.stderr)
            continue

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

    before = len(aggregates)
    aggregates = merge_aggregates_by_name(aggregates)
    if len(aggregates) < before:
        print(
            f"\nMerged {before} IFA player IDs into "
            f"{len(aggregates)} unique name profiles"
        )

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
                "seasons": totals["seasons"],
                "seasonDetails": [
                    {
                        "seasonId": s.season_id,
                        "seasonLabel": s.season_label,
                        "matches": s.matches,
                    }
                    for s in sorted(agg.seasons, key=lambda x: x.season_id)
                ],
            }
        )
    managers.sort(
        key=lambda m: (-m["totalMatches"], -len(m["seasons"]), m["name"]),
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


def write_json(data: dict[str, Any], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as handle:
        json.dump(data, handle, ensure_ascii=False, indent=2)
        handle.write("\n")


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
    args = parser.parse_args()

    if args.season_start > args.season_end:
        print("season-start must be <= season-end", file=sys.stderr)
        return 1

    client = IfaClient(delay=args.delay, verify_ssl=not args.insecure)
    print(
        f"Scraping Hapoel Oranit (team_id={TEAM_ID}), "
        f"seasons {args.season_start}–{args.season_end}, delay={args.delay}s"
    )

    if args.managers_only and args.output.is_file():
        with args.output.open(encoding="utf-8") as handle:
            payload = json.load(handle)
        print("Loaded existing dataset — updating managers only", flush=True)
    else:
        aggregates = scrape_seasons(client, args.season_start, args.season_end)
        payload = to_output(aggregates, {})

    print("\nScraping head coaches (בעלי תפקידים)…", flush=True)
    managers = scrape_managers(client, args.season_start, args.season_end)
    payload["managers"] = managers_to_output(managers)
    payload["scrapedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    write_json(payload, args.output)

    player_count = len(payload.get("players", []))
    manager_count = len(payload.get("managers", []))
    print(
        f"\nDone — {player_count} players, "
        f"{manager_count} managers -> {args.output}"
    )
    if payload["players"]:
        top = payload["players"][0]
        print(
            f"Leader: {top['name']} — {top['goals']} goals, "
            f"{top['caps']} caps, {top['minutesPlayed']} min"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
