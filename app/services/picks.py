import pandas as pd
from pathlib import Path


PICKS = None

# Team strength: lower = weaker team, higher = stronger team (2024 standings proxy)
TEAM_STRENGTH = {
    'UTA': 1, 'WAS': 2, 'CHA': 3, 'NOP': 4, 'PHI': 5, 'BRK': 6, 'SAS': 7, 'TOR': 8, 'POR': 9, 'PHX': 10,
    'MIA': 11, 'DAL': 12, 'CHI': 13, 'SAC': 14, 'ATL': 15, 'ORL': 16, 'DET': 17, 'MEM': 18, 'GSW': 19, 'MIL': 20,
    'MIN': 21, 'LAL': 22, 'LAC': 23, 'IND': 24, 'DEN': 25, 'NYK': 26, 'HOU': 27, 'BOS': 28, 'CLE': 29, 'OKC': 30
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
