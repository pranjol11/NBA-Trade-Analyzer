import pandas as pd
from pathlib import Path

PICKS = None

def _load_picks():
    global PICKS
    if PICKS is None:
        PICKS = pd.read_csv(Path("data/picks.csv"))
    return PICKS

def value_picks(pick_ids):
    df = _load_picks()
    return float(df[df.pick_id.isin(pick_ids)]["value_units"].sum())
