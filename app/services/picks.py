import re
from pathlib import Path
from typing import List, Tuple

import pandas as pd

from . import value as pv
from ..config import settings

PICKS = None

# Team strength: lower = weaker team, higher = stronger team (2025-26 final standings)
TEAM_STRENGTH = {
    'WAS': 1, 'IND': 2, 'BKN': 3, 'SAC': 4, 'UTA': 5, 'MEM': 6, 'NOP': 7, 'DAL': 8, 'CHI': 9, 'MIL': 10,
    'GSW': 11, 'POR': 12, 'LAC': 13, 'MIA': 14, 'CHA': 15, 'PHI': 16, 'PHX': 17, 'ORL': 18, 'TOR': 19, 'ATL': 20,
    'MIN': 21, 'CLE': 22, 'HOU': 23, 'NYK': 24, 'LAL': 25, 'DEN': 26, 'BOS': 27, 'DET': 28, 'SAS': 29, 'OKC': 30
}

AVG_STRENGTH = sum(TEAM_STRENGTH.values()) / len(TEAM_STRENGTH)
PROSPECT_DISCOUNT = 0.8  # a pick is a lottery ticket, not a proven player
DRAFTEE_AGE = 20

def _load_picks():
    global PICKS
    if PICKS is None:
        PICKS = pd.read_csv(Path("data/picks.csv"))
    return PICKS

def projected_slot(team: str, year: int) -> float:
    """Expected draft slot: worst team ~#3 next year, drifting toward the middle further out."""
    strength = TEAM_STRENGTH.get(team, AVG_STRENGTH)
    years_out = max(0, year - settings.next_draft_year)
    weight = 0.85 * 0.8 ** years_out  # lottery luck + team quality changing over time
    return AVG_STRENGTH + (strength - AVG_STRENGTH) * weight

def protection_factor(prot) -> float:
    m = re.match(r"top(\d+)", str(prot))
    if not m:
        return 0.7 if prot == "split" else 1.0
    n = int(m.group(1))
    return 0.85 if n <= 4 else 0.7 if n <= 10 else 0.55

def pick_value(row) -> float:
    year = int(row["year"])
    years_out = max(0, year - settings.next_draft_year)
    slot = projected_slot(row["original_team"], year)
    value = pv.impact_to_value(float(pv.draft_slot_impact(slot)), DRAFTEE_AGE)
    value *= PROSPECT_DISCOUNT * (1 - settings.discount_rate) ** years_out * protection_factor(row["prot_type"])
    return round(value, 1)

def pick_label(row) -> str:
    rnd = "1st" if int(row["round"]) == 1 else "2nd"
    return f"{row['original_team']} {int(row['year'])} {rnd}"

def pick_values(pick_ids) -> List[Tuple[str, float]]:
    df = _load_picks()
    return [(pick_label(r), pick_value(r)) for _, r in df[df.pick_id.isin(pick_ids)].iterrows()]
