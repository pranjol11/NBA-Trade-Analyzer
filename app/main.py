from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import RedirectResponse
from app.schemas import TradePayload, EvaluateResponse, TeamGrade, TradePayloadInput
from app.cba.valid import validate_trade
from app.services.grading import score_team, letter_grade
from app.util.resolve import normalize_payload
from app.services import value as pv

app = FastAPI(title="NBA Trade Grader (MVP)")

@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")

@app.get("/health")
def health():
    return {"ok": True}

@app.get("/players/search")
def players_search(q: str = Query("", min_length=1), limit: int = 10):
    """Search players by name (case-insensitive). Returns id, name, team."""
    try:
        df = pv._load_players()
        subset = df[df['name'].str.contains(q, case=False, na=False)].head(limit)
        return [
            {
                "player_id": int(row.player_id),
                "name": str(row.name),
                "team": str(row.team),
            }
            for _, row in subset.iterrows()
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/trade/validate")
def trade_validate(payload: TradePayloadInput):
    """Accepts player ids or names, and flexible pick strings; resolves to canonical ids."""
    try:
        norm = normalize_payload(payload.dict())
        canonical = TradePayload(**norm)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    return validate_trade(canonical.sides)

@app.post("/trade/evaluate", response_model=EvaluateResponse)
def trade_evaluate(payload: TradePayloadInput):
    try:
        norm = normalize_payload(payload.dict())
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
