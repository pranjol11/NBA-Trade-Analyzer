from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import RedirectResponse
from app.schemas import TradePayload, EvaluateResponse, TeamGrade, TradePayloadInput
from app.cba.valid import validate_trade
from app.services.grading import score_team, letter_grade
from app.util.resolve import normalize_payload
from app.services import value as pv
from app.services.picks import _load_picks
import pandas as pd
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI(title="NBA Trade Grader (MVP)")

origins = [
    o.strip() for o in os.getenv(
        "CORS_ALLOW_ORIGINS",
        "https://nba-trade-analyzer-1.onrender.com,http://localhost:5173"
    ).split(",") if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")

@app.get("/health")
def health():
    return {"ok": True}

@app.get("/players/search")
def players_search(q: str = Query("", min_length=1), limit: int = 10):
    """Search players by name (case-insensitive). Returns name, team only."""
    try:
        df = pv._load_players()
        subset = df[df['name'].str.contains(q, case=False, na=False)].head(limit)
        results = []
        for _, row in subset.iterrows():
            # Explicitly access name column and ensure it's a string
            player_name = str(row['name']) if 'name' in row else str(row.get('name', ''))
            player_team = str(row['team']) if 'team' in row else str(row.get('team', ''))
            results.append({
                "name": player_name,
                "team": player_team
            })
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/teams/{team}/assets")
def team_assets(team: str):
    """A team's current players (by salary) and the draft picks it owns."""
    code = team.strip().upper()
    players = pv._load_players()
    roster = players[players["team"] == code].sort_values("salary", ascending=False)
    picks = _load_picks()
    owned = picks[picks["current_team"] == code].sort_values(["year", "round"])
    return {
        "players": [
            {"name": str(r["name"]), "salary": float(r["salary"]), "two_way": bool(r["two_way"])}
            for _, r in roster.iterrows()
        ],
        "picks": [
            {
                "pick_id": str(r["pick_id"]),
                "year": int(r["year"]),
                "round": int(r["round"]),
                "original_team": str(r["original_team"]),
                "protection": "" if pd.isna(r["prot_type"]) or r["prot_type"] == "none" else str(r["prot_type"]),
            }
            for _, r in owned.iterrows()
        ],
    }

@app.post("/trade/validate")
def trade_validate(payload: TradePayloadInput):
    """Accepts player ids or names, and flexible pick strings; resolves to canonical ids."""
    try:
        norm = normalize_payload(payload.model_dump())
        canonical = TradePayload(**norm)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    return validate_trade(canonical.sides)

@app.post("/trade/evaluate", response_model=EvaluateResponse)
def trade_evaluate(payload: TradePayloadInput):
    try:
        norm = normalize_payload(payload.model_dump())
        canonical = TradePayload(**norm)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    legality = validate_trade(canonical.sides)

    grades = []
    # Build quick lookup of players/picks movement for each side
    for side in canonical.sides:
        score, breakdown = score_team(
            players_out=side.players_out,
            players_in=side.players_in,
            picks_out=side.picks_out,
            picks_in=side.picks_in
        )
        grades.append(TeamGrade(
            team=side.team,
            score_raw=round(score, 3),
            letter=letter_grade(score),
            breakdown={k: round(v, 3) for k, v in breakdown.items()}
        ))

    return EvaluateResponse(legality=legality, grades=grades)
