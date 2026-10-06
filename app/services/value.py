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
        for col, default in [("two_way", False), ("ovr", np.nan), ("pot", None)]:
            if col not in df.columns:
                df[col] = default

        max_impact = df["impact_now"].max()
        top_ovr = df["ovr"].max() if df["ovr"].notna().any() else 97
        df["trade_value"] = [
            ovr_to_value(projected_ovr(o, p, a), a, top_ovr) if pd.notna(o) else impact_to_value(i, a, max_impact)
            for o, p, a, i in zip(df["ovr"], df["pot"], df["age"], df["impact_now"])
        ]
        PLAYERS = df
    return PLAYERS

# 2K ratings model. Players without a 2K rating fall back to the box-score model below.
REPLACEMENT_OVR = 65  # about a two-way / end-of-bench player: worth ~0
POTENTIAL_CEILING = {"A+": 95, "A": 90, "A-": 86, "B+": 82, "B": 77, "B-": 73}

def upside_weight(age: float) -> float:
    """Share of the gap to a player's 2K ceiling credited now: ~90% at 19, none from 25."""
    return min(0.9, max(0.0, 0.15 * (25 - age)))

def projected_ovr(ovr: float, pot, age: float) -> float:
    ceiling = POTENTIAL_CEILING.get(pot, ovr)
    return ovr + upside_weight(age) * max(0.0, ceiling - ovr)

def decline_factor(age: float) -> float:
    return 1.0 if age <= 28 else max(0.4, 1 - 0.06 * (age - 28))

def ovr_to_value(ovr: float, age: float, top_ovr: float = 97) -> float:
    """0-100 trade value from a 2K overall; the 2.5 power makes stars outweigh depth."""
    share = min(1.0, max(0.0, (ovr - REPLACEMENT_OVR) / (top_ovr - REPLACEMENT_OVR)))
    return round(100 * share ** 2.5 * decline_factor(age), 1)

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
