from fastapi import FastAPI
from fastapi.responses import RedirectResponse, FileResponse
from app.schemas import TradePayload, EvaluateResponse, TeamGrade
from app.cba.valid import validate_trade
from app.services.grading import score_team, letter_grade

app = FastAPI(title="NBA Trade Grader (MVP)")

@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")

@app.get("/health")
def health():
    return {"ok": True}

@app.get("/ui", include_in_schema=False)
def ui_page():
    return FileResponse("static/index.html")

@app.post("/trade/validate")
def trade_validate(payload: TradePayload):
    return validate_trade(payload.sides)

@app.post("/trade/evaluate", response_model=EvaluateResponse)
def trade_evaluate(payload: TradePayload):
    legality = validate_trade(payload.sides)

    grades = []
    # Build quick lookup of players/picks movement for each side
    for side in payload.sides:
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
