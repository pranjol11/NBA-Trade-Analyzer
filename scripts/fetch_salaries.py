# Usage: python scripts/fetch_salaries.py --season 2026-27
# Pulls player salaries and team payrolls from Basketball-Reference (2 requests).
import argparse
import io
import subprocess
from pathlib import Path

import pandas as pd
from nba_api.stats.static import teams as teams_static

BASE = "https://www.basketball-reference.com/contracts/"


def fetch_table(url, table_id):
    # Cloudflare blocks Python's requests here but lets curl through.
    html = subprocess.run(
        ["curl", "-sSf", "-m", "60", "-A", "Mozilla/5.0", url],
        capture_output=True, check=True,
    ).stdout.decode("utf-8")
    # Basketball-Reference ships some tables inside HTML comments.
    html = html.replace("<!--", "").replace("-->", "")
    t = pd.read_html(io.StringIO(html), flavor="lxml", attrs={"id": table_id})[0]
    t.columns = [c[1] if isinstance(c, tuple) else c for c in t.columns]
    return t


def dollars(col):
    return col.astype(str).str.startswith("$")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--season", required=True, help="e.g. 2026-27")
    ap.add_argument("--out-dir", default=Path("data"), type=Path)
    args = ap.parse_args()
    season = args.season

    players = fetch_table(BASE + "players.html", "player-contracts")
    if season not in players.columns:
        raise SystemExit(f"{season} not on the contracts page; columns: {list(players.columns)}")
    players = players[players["Player"].notna() & dollars(players[season])]
    players = players[["Player", "Tm", season]].rename(columns={"Tm": "Team", season: "Salary"})
    salaries_path = args.out_dir / f"raw_salaries_{season.replace('-', '_')}.csv"
    players.to_csv(salaries_path, index=False, encoding="utf-8")

    summary = fetch_table(BASE, "team_summary")
    summary = summary[summary["Team"].notna() & dollars(summary[season])]
    abbr = {t["full_name"]: t["abbreviation"] for t in teams_static.get_teams()}
    payrolls = pd.DataFrame({
        "team": summary["Team"].map(abbr),
        "payroll": summary[season].str.replace(r"[$,]", "", regex=True).astype(float),
    })
    if payrolls["team"].isna().any() or len(payrolls) != 30:
        raise SystemExit(f"Couldn't map team names: {summary['Team'][payrolls['team'].isna()].tolist()}")
    payrolls_path = args.out_dir / "team_payrolls.csv"
    payrolls.sort_values("team").to_csv(payrolls_path, index=False)

    print(f"Wrote {len(players)} salaries to {salaries_path} and 30 team payrolls to {payrolls_path}")


if __name__ == "__main__":
    main()
