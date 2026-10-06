import numpy as np
import pandas as pd
from pathlib import Path
from typing import Dict, List, Tuple

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

        max_impact = df["impact_now"].max()
        df["trade_value"] = [
            impact_to_value(i, a, max_impact) for i, a in zip(df["impact_now"], df["age"])
        ]
        PLAYERS = df
    return PLAYERS

def age_factor(age: float) -> float:
    """Younger players carry more future years; value fades after 28."""
    if age < 26:
        return min(1.25, 1 + 0.05 * (26 - age))
    if age <= 28:
        return 1.0
    return max(0.4, 1 - 0.06 * (age - 28))

def impact_to_value(impact: float, age: float, max_impact: float = None) -> float:
    """Trade value on a 0-100 scale. Squared so one star outweighs several role players."""
    if max_impact is None:
        max_impact = _load_players()["impact_now"].max()
    share = max(impact, 0.0) / max_impact
    return round(100 * share ** 2 * age_factor(age), 1)

def draft_slot_impact(pick):
    # Expected impact by year 3 for this draft slot. Rookie seasons of the 2023-25 classes fit
    # ~2.4 for #1, ~1.5 for #8, ~0.85 late 1st; those classes grew ~1.4x by year 3.
    return (1.4 * (0.8 + 1.6 * np.exp(-(pick - 1) / 8))).round(3)

def player_values(player_ids) -> List[Tuple[str, float]]:
    df = _load_players().set_index("player_id")
    return [(str(df.at[pid, "name"]), float(df.at[pid, "trade_value"])) for pid in player_ids if pid in df.index]

def sum_salary(player_ids):
    df = _load_players()
    return float(df[df.player_id.isin(player_ids)]["salary"].sum())
