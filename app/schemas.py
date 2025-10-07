from pydantic import BaseModel, Field
from typing import List, Dict, Optional

class TradeSide(BaseModel):
    team: str
    players_out: List[int] = Field(default_factory=list)  # player_ids
    players_in: List[int] = Field(default_factory=list)
    picks_out: List[str] = Field(default_factory=list)    # pick_ids
    picks_in: List[str] = Field(default_factory=list)

class TradePayload(BaseModel):
    sides: List[TradeSide]

class LegalityIssue(BaseModel):
    code: str
    message: str
    details: Optional[Dict] = None

class ValidateResponse(BaseModel):
    legal: bool
    issues: List[LegalityIssue] = []

class TeamGrade(BaseModel):
    team: str
    score_raw: float
    letter: str
    breakdown: Dict[str, float]

class EvaluateResponse(BaseModel):
    legality: ValidateResponse
    grades: List[TeamGrade]
