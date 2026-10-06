import pandas as pd
from pathlib import Path
from typing import Dict, Any

PLAYERS = None
TEAM_PAYROLLS = None

def team_payrolls() -> Dict[str, float]:
    global TEAM_PAYROLLS
    if TEAM_PAYROLLS is None:
        path = Path("data/team_payrolls.csv")
        TEAM_PAYROLLS = pd.read_csv(path).set_index("team")["payroll"].to_dict() if path.exists() else {}
    return TEAM_PAYROLLS

def _load_players():
    global PLAYERS
    if PLAYERS is None:
        df = pd.read_csv(Path("data/players.csv"))

        # Defensive cleanup: keep one row per player_id so duplicate snapshot rows
        # do not overcount salary/impact/value in trade calculations.
        if "player_id" in df.columns:
            df = df.drop_duplicates(subset=["player_id"], keep="first")

        # Normalize numeric fields used by downstream math.
        for col in ["salary", "impact_now", "age"]:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce")

        df["salary"] = df["salary"].fillna(0.0)
        df["impact_now"] = df["impact_now"].fillna(0.0)
        df["age"] = df["age"].fillna(26.0)
        if "two_way" not in df.columns:
            df["two_way"] = False

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
