from __future__ import annotations
from typing import Union, List
import re

from app.services import value as pv
from app.services.picks import _load_picks

# Map many common 3-letter codes to the pick_id prefix used in picks.csv
TEAM_TO_PREFIX = {
    'ATL': 'atl', 'BOS': 'bos', 'BRK': 'brk', 'BKN': 'brk', 'CHI': 'chi', 'CLE': 'cle', 'DAL': 'dal', 'DEN': 'den',
    'DET': 'det', 'GSW': 'gsw', 'GOS': 'gsw', 'HOU': 'hou', 'IND': 'ind', 'LAC': 'lac', 'LAL': 'lal', 'MEM': 'mem',
    'MIA': 'mia', 'MIL': 'mil', 'MIN': 'min', 'NOP': 'nop', 'NOH': 'nop', 'NYK': 'nyk', 'OKC': 'okc', 'ORL': 'orl',
    'PHI': 'phi', 'PHX': 'phx', 'PHO': 'phx', 'POR': 'por', 'SAC': 'sac', 'SAS': 'sas', 'TOR': 'tor', 'UTA': 'uta',
    'WAS': 'was', 'CHA': 'cha', 'CHO': 'cha'
}

ROUND_ALIASES = {
    '1': '1st', '1st': '1st', 'first': '1st',
    '2': '2nd', '2nd': '2nd', 'second': '2nd',
}


def resolve_player_ref(ref: Union[int, str]) -> int:
    """Resolve a player reference (id or name) to a numeric player_id using data/players.csv.
    Raises ValueError if not found."""
    if isinstance(ref, int):
        return ref
    name = str(ref).strip()
    if name.isdigit():
        return int(name)
    df = pv._load_players()  # DataFrame
    rows = df[df['name'].str.lower() == name.lower()]
    if rows.empty:
        # try startswith/contains for convenience
        rows = df[df['name'].str.lower().str.contains(re.escape(name.lower()))]
    if rows.empty:
        raise ValueError(f"Unknown player name '{name}'")
    # If multiple, pick the first unique player_id
    pid = int(rows.iloc[0]['player_id'])
    return pid


def _norm_team(team: str) -> str:
    t = team.strip().upper()
    return TEAM_TO_PREFIX.get(t, t.lower())


def resolve_pick_ref(ref: str) -> str:
    """Resolve a pick reference to canonical pick_id from data/picks.csv.
    Accepted forms (case-insensitive):
      - exact pick_id (e.g., bos_2027_1st)
      - TEAM YYYY 1st/2nd (e.g., BOS 2027 1st)
      - TEAM YYYY (defaults to 1st)
      - TEAMYY (e.g., BOS27 => 2027 1st)
      - pTEAMYY (legacy pattern, same as above)
    Returns the canonical pick_id string or raises ValueError if not found.
    """
    s = str(ref).strip()
    picks = _load_picks()

    # exact id
    sid = s.lower().replace(' ', '_')
    if '1st' in sid or '2nd' in sid:
        if (picks['pick_id'].str.lower() == sid).any():
            return sid

    # TEAM YYYY [round]
    m = re.match(r"^([A-Za-z]{3})[ _-]?(\d{4})(?:[ _-]?([12](?:st|nd)?|first|second))?$", s, flags=re.I)
    if m:
        team, year, rnd = m.groups()
        prefix = _norm_team(team)
        rr = ROUND_ALIASES.get((rnd or '1st').lower(), '1st')
        pid = f"{prefix}_{year}_{rr}"
        if (picks['pick_id'].str.lower() == pid).any():
            return pid
        # fallback: if 1st not present, try 2nd
        alt = f"{prefix}_{year}_2nd"
        if (picks['pick_id'].str.lower() == alt).any():
            return alt
        raise ValueError(f"Unknown pick '{s}' (tried {pid})")

    # p?TEAMYY (defaults to 1st, year 20YY)
    m = re.match(r"^p?([A-Za-z]{3})[ _-]?(\d{2})$", s, flags=re.I)
    if m:
        team, yy = m.groups()
        year = int(yy)
        year += 2000
        prefix = _norm_team(team)
        pid = f"{prefix}_{year}_1st"
        if (picks['pick_id'].str.lower() == pid).any():
            return pid
        # try 2nd just in case
        alt = f"{prefix}_{year}_2nd"
        if (picks['pick_id'].str.lower() == alt).any():
            return alt
        raise ValueError(f"Unknown pick shorthand '{s}' (tried {pid})")

    # last resort: already a pick_id but missing underscores
    pid = s.lower().replace(' ', '_')
    if (picks['pick_id'].str.lower() == pid).any():
        return pid
    raise ValueError(f"Unrecognized pick format '{ref}'")


def normalize_trade_side(side: dict) -> dict:
    """Return a new side dict with players_* converted to ids and picks_* to pick_id strings."""
    out_players: List[int] = [resolve_player_ref(x) for x in side.get('players_out', [])]
    in_players: List[int] = [resolve_player_ref(x) for x in side.get('players_in', [])]
    out_picks: List[str] = [resolve_pick_ref(x) for x in side.get('picks_out', [])]
    in_picks: List[str] = [resolve_pick_ref(x) for x in side.get('picks_in', [])]
    return {
        'team': side.get('team'),
        'players_out': out_players,
        'players_in': in_players,
        'picks_out': out_picks,
        'picks_in': in_picks,
    }


def normalize_payload(payload: dict) -> dict:
    sides = [normalize_trade_side(s) for s in payload.get('sides', [])]
    return {'sides': sides}
