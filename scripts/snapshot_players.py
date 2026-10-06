# Usage: python scripts/snapshot_players.py --season 2026-27 --salaries data/raw_salaries_2026_27.csv \
#            --ratings data/ratings_2k27.csv
# The ratings CSV (team, name, ovr, pot) comes from 2kratings.com team pages.
import argparse
import re
import sys
import time
import unicodedata
from pathlib import Path

import pandas as pd
from nba_api.stats.endpoints import commonteamroster, leaguedashplayerstats
from nba_api.stats.static import teams as teams_static

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.services.value import draft_slot_impact  # noqa: E402

NAME_SUFFIXES = {"jr", "sr", "ii", "iii", "iv", "v"}
# Basketball-Reference team codes -> NBA codes
TEAM_ALIASES = {"BRK": "BKN", "CHO": "CHA", "PHO": "PHX"}


def prev_season(season):
    start = int(season[:4]) - 1
    return f"{start}-{str(start + 1)[-2:]}"


def norm_name(name):
    # "Nikola Jokić" == "Nikola Jokic", "Jimmy Butler III" == "Jimmy Butler", "P.J. Tucker" == "PJ Tucker"
    s = unicodedata.normalize("NFKD", str(name)).encode("ascii", "ignore").decode().lower()
    s = re.sub(r"[.'`]", "", s)
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return " ".join(t for t in s.split() if t not in NAME_SUFFIXES)


def _fetch_roster(team_id, season, attempts=3):
    for i in range(attempts):
        try:
            return commonteamroster.CommonTeamRoster(team_id=team_id, season=season, timeout=30).get_data_frames()[0]
        except Exception:
            if i == attempts - 1:
                raise
            time.sleep(3)


def load_rosters(season):
    frames = []
    for t in teams_static.get_teams():
        r = _fetch_roster(t["id"], season)
        two_way = r["SUPPLEMENTAL_STATUS"].eq(1) if "SUPPLEMENTAL_STATUS" in r.columns else False
        draft = r["HOW_ACQUIRED"].astype(str).str.extract(r"#(\d+) Pick in (\d{4}) Draft").astype(float)
        frames.append(pd.DataFrame({
            "player_id": r["PLAYER_ID"],
            "name": r["PLAYER"],
            "team": t["abbreviation"],
            "age": r["AGE"],
            "two_way": two_way,
            "draft_pick": draft[0],
            "draft_year": draft[1],
        }))
        time.sleep(0.6)  # stats.nba.com throttles rapid requests
    return pd.concat(frames, ignore_index=True)


def load_stats(season):
    stats = leaguedashplayerstats.LeagueDashPlayerStats(
        season=season, per_mode_detailed="PerGame", season_type_all_star="Regular Season", timeout=60
    ).get_data_frames()[0]
    keep = ["PLAYER_ID", "PTS", "AST", "REB", "STL", "BLK", "TOV", "FG3M"]
    return stats[keep].rename(columns={"PLAYER_ID": "player_id"})


def load_salaries(path):
    s = pd.read_csv(path)
    name_col = next((c for c in s.columns if c.lower() in ("player", "name")), None)
    sal_col = next((c for c in s.columns if "salary" in c.lower()), None) \
        or next((c for c in s.columns if re.search(r"\d{4}", c)), None)
    if name_col is None or sal_col is None:
        raise RuntimeError(f"Couldn't find name/salary columns in {path}; found {list(s.columns)}")
    team_col = next((c for c in s.columns if c.lower() in ("team", "tm")), None)
    out = pd.DataFrame({
        "key": s[name_col].map(norm_name),
        "team": s[team_col].str.strip().replace(TEAM_ALIASES) if team_col else None,
        "salary": pd.to_numeric(
            s[sal_col].astype(str).str.replace(r"[$,\s]", "", regex=True), errors="coerce"
        ),
    })
    return out.dropna(subset=["salary"])


def match_column(df, source, col):
    """Look up source[col] for each player by normalized name (source needs key, team, col)."""
    by_name = source.drop_duplicates(subset="key", keep="first").set_index("key")[col]
    values = df["key"].map(by_name)

    # Fallback for nicknames ("Ron Holland" vs "Ronald Holland II"): same last name on the same team, if unique.
    src = source[~source["key"].isin(df["key"])].dropna(subset=["team"])
    src = src.assign(last=src["key"].str.split().str[-1])
    src = src.drop_duplicates(subset=["last", "team", "key"])
    src = src[~src.duplicated(subset=["last", "team"], keep=False)]
    by_last_team = src.set_index(["last", "team"])[col]
    fallback = pd.Series(
        [by_last_team.get((k.split()[-1] if k else "", t)) for k, t in zip(df["key"], df["team"])],
        index=df.index, dtype=values.dtype,
    )
    return values.fillna(fallback)


def load_ratings(path):
    r = pd.read_csv(path)
    return r.assign(key=r["name"].map(norm_name))


def compute_impact_now(df):
    imp = (df["PTS"] + df["REB"] + df["AST"] + df["STL"] + df["BLK"]) / 10.0 \
          - df["TOV"] / 5.0 + df["FG3M"] / 10.0
    return imp.round(3)


def guess_years_left(age):
    # crude horizon; replace later with real contracts
    return (3 - ((age - 27).abs() * 0.2)).clip(lower=1, upper=4)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--season", required=True, help="roster season, e.g. 2026-27")
    ap.add_argument("--stats-season", help="season for per-game stats (default: the season before --season)")
    ap.add_argument("--salaries", required=True, type=Path)
    ap.add_argument("--ratings", type=Path, help="2K ratings CSV (team, name, ovr, pot)")
    ap.add_argument("--out", default=Path("data/players.csv"), type=Path)
    args = ap.parse_args()
    stats_season = args.stats_season or prev_season(args.season)

    rosters = load_rosters(args.season)
    stats = load_stats(stats_season)
    # Players who missed the stats season (injury, overseas) fall back to the season before.
    older = load_stats(prev_season(stats_season))
    stats = pd.concat([stats, older[~older.player_id.isin(stats.player_id)]], ignore_index=True)
    salaries = load_salaries(args.salaries)

    df = rosters.merge(stats, on="player_id", how="left")
    df["key"] = df["name"].map(norm_name)
    df["salary"] = match_column(df, salaries, "salary")
    if args.ratings:
        ratings = load_ratings(args.ratings)
        df["ovr"] = match_column(df, ratings, "ovr")
        df["pot"] = match_column(df, ratings, "pot")
    else:
        df["ovr"], df["pot"] = None, None

    df["impact_now"] = compute_impact_now(df)
    rookie = df["impact_now"].isna() & df["draft_pick"].notna()
    df.loc[rookie, "impact_now"] = draft_slot_impact(df.loc[rookie, "draft_pick"])
    df["years_left"] = guess_years_left(df["age"])

    df_out = df[[
        "player_id", "name", "team", "salary", "age", "impact_now", "ovr", "pot",
        "draft_pick", "years_left", "two_way",
    ]].drop_duplicates(subset="player_id").sort_values("player_id")

    args.out.parent.mkdir(parents=True, exist_ok=True)
    df_out.to_csv(args.out, index=False, encoding="utf-8")

    no_salary = df_out[df_out.salary.isna()]
    no_stats = df_out[df_out.impact_now.isna()]
    print(f"Wrote {len(df_out)} players ({args.season} rosters, {stats_season} stats) to {args.out}")
    print(f"  {int(rookie.sum())} without NBA stats valued by draft slot")
    print(f"  {len(no_stats)} without stats or a draft slot (mostly undrafted) -> impact 0")
    if args.ratings:
        print(f"  {int(df_out.ovr.notna().sum())} matched to 2K ratings")
    print(f"  {len(no_salary)} without a salary match"
          + (f", e.g. {', '.join(no_salary.name.head(10))}" if len(no_salary) else ""))


if __name__ == "__main__":
    main()
