# scripts/snapshot_players.py
from nba_api.stats.static import players as pl_static
from nba_api.stats.endpoints import leaguedashplayerstats
import pandas as pd
from pathlib import Path

SEASON = "2024-25"   # update only when you decide to refresh
SALARY_CSV = Path("data/raw_salaries_2024_25.csv")
OUT = Path("data/players.csv")

def load_players_master():
    df = pd.DataFrame(pl_static.get_players())  # id, full_name, is_active
    df = df[df["is_active"]]
    df = df.rename(columns={"id": "nba_player_id", "full_name": "name"})
    return df[["nba_player_id", "name"]]

def load_basic_rates():
    stats = leaguedashplayerstats.LeagueDashPlayerStats(
        season=SEASON, per_mode_detailed="PerGame", season_type_all_star="Regular Season"
    ).get_data_frames()[0]
    keep = ["PLAYER_ID","PLAYER_NAME","TEAM_ABBREVIATION","AGE","PTS","AST","REB","STL","BLK","TOV","FG3M"]
    stats = stats[keep].rename(columns={
        "PLAYER_ID":"nba_player_id","PLAYER_NAME":"name","TEAM_ABBREVIATION":"team","AGE":"age"
    })
    return stats

def load_salaries():
    s = pd.read_csv(SALARY_CSV)
    # Try to locate likely name and salary columns (adjust if your CSV differs)
    name_col = None
    for c in s.columns:
        if c.lower() in ("player","name"):
            name_col = c; break
    sal_col = None
    for c in s.columns:
        if "2024" in c or "salary" in c.lower():
            sal_col = c; break
    if name_col is None or sal_col is None:
        raise RuntimeError("Couldn't find name/salary columns in salary CSV; open it and adjust load_salaries().")
    out = s[[name_col, sal_col]].copy()
    out.columns = ["name","salary"]
    out["salary"] = (out["salary"].astype(str)
        .str.replace("$","",regex=False)
        .str.replace(",","",regex=False)
        .astype(float)
        .fillna(0)
        .astype(int))
    return out[["name","salary"]]

def compute_impact_now(df):
    # Simple, transparent proxy to get you going
    imp = (df["PTS"] + df["REB"] + df["AST"] + df["STL"] + df["BLK"]) / 10.0 \
          - df["TOV"]/5.0 + df["FG3M"]/10.0
    return imp.round(3)

def guess_years_left(age):
    # crude horizon; replace later with real contracts
    return (3 - ((age - 27).abs() * 0.2)).clip(lower=1, upper=4)

def main():
    roster = load_players_master()
    rates = load_basic_rates()
    salaries = load_salaries()

    df = rates.merge(roster, on=["nba_player_id","name"], how="left") \
              .merge(salaries, on="name", how="left")

    df["impact_now"] = compute_impact_now(df)
    df["years_left"] = guess_years_left(df["age"])

    # Map to your app’s schema
    df_out = df.rename(columns={"nba_player_id":"player_id"})[[
        "player_id","name","team","salary","age","impact_now","years_left"
    ]].sort_values("player_id")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    df_out.to_csv(OUT, index=False)
    print(f"Wrote {len(df_out)} players to {OUT}")

if __name__ == "__main__":
    main()
