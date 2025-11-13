from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Union

class TradeSide(BaseModel):
    team: str
    players_out: List[int] = Field(default_factory=list)  # player_ids
    players_in: List[int] = Field(default_factory=list)
    picks_out: List[str] = Field(default_factory=list)    # pick_ids
    picks_in: List[str] = Field(default_factory=list)

class TradePayload(BaseModel):
    sides: List[TradeSide]

# Flexible input schema: allow player references by id or name; picks as free-form strings
class TradeSideInput(BaseModel):
    team: str
    players_out: List[Union[int, str]] = Field(default_factory=list)
    players_in: List[Union[int, str]] = Field(default_factory=list)
    picks_out: List[str] = Field(default_factory=list)
    picks_in: List[str] = Field(default_factory=list)

class TradePayloadInput(BaseModel):
    sides: List[TradeSideInput]

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
