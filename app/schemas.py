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
    issues: List[LegalityIssue] = Field(default_factory=list)

class AssetValue(BaseModel):
    name: str
    value: float

class TeamGrade(BaseModel):
    team: str
    grade: float  # 0-100, 50 = even trade
    letter: str
    value_in: float
    value_out: float
    assets_in: List[AssetValue]
    assets_out: List[AssetValue]

class EvaluateResponse(BaseModel):
    legality: ValidateResponse
    grades: List[TeamGrade]
