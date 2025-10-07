import pandas as pd
from pathlib import Path
from typing import Dict, Any

PLAYERS = None

def _load_players():
    global PLAYERS
    if PLAYERS is None:
        df = pd.read_csv(Path("data/players.csv"))
        df["value_future_3y"] = df["impact_now"] * (1.0 + 0.1) + (3 - (df["age"] - 26).abs()*0.05)
        PLAYERS = df
    return PLAYERS

def get_player(player_id: int) -> Dict[str, Any]:
    df = _load_players()
    row = df.loc[df.player_id == player_id]
    if row.empty:
        raise KeyError(f"Unknown player_id {player_id}")
    return row.iloc[0].to_dict()

def sum_salary(player_ids):
    df = _load_players()
    return float(df[df.player_id.isin(player_ids)]["salary"].sum())

def sum_impact_now(player_ids):
    df = _load_players()
    return float(df[df.player_id.isin(player_ids)]["impact_now"].sum())

def sum_value_future(player_ids):
    df = _load_players()
    return float(df[df.player_id.isin(player_ids)]["value_future_3y"].sum())
