import pandas as pd
from pathlib import Path


PICKS = None

# Team strength: lower = weaker team, higher = stronger team (2025-26 final standings)
TEAM_STRENGTH = {
    'WAS': 1, 'IND': 2, 'BKN': 3, 'SAC': 4, 'UTA': 5, 'MEM': 6, 'NOP': 7, 'DAL': 8, 'CHI': 9, 'MIL': 10,
    'GSW': 11, 'POR': 12, 'LAC': 13, 'MIA': 14, 'CHA': 15, 'PHI': 16, 'PHX': 17, 'ORL': 18, 'TOR': 19, 'ATL': 20,
    'MIN': 21, 'CLE': 22, 'HOU': 23, 'NYK': 24, 'LAL': 25, 'DEN': 26, 'BOS': 27, 'DET': 28, 'SAS': 29, 'OKC': 30
}

AVG_STRENGTH = sum(TEAM_STRENGTH.values()) / len(TEAM_STRENGTH)
K = 0.04  # tuning parameter: value changes ~4% per spot

def _load_picks():
    global PICKS
    if PICKS is None:
        PICKS = pd.read_csv(Path("data/picks.csv"))
    return PICKS

def value_picks(pick_ids):
    df = _load_picks()
    total = 0.0
    for _, row in df[df.pick_id.isin(pick_ids)].iterrows():
        base = row["value_units"]
        team = row["original_team"]
        strength = TEAM_STRENGTH.get(team, AVG_STRENGTH)
        # Lower strength = worse team = better pick
        adj = base * (1 + K * (AVG_STRENGTH - strength))
        total += adj
    return total
