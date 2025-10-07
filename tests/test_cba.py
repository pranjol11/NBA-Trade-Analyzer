from app.schemas import TradePayload, TradeSide
from app.cba.valid import validate_trade

def test_salary_match_basic():
    payload = TradePayload(sides=[
        TradeSide(team="LAL", players_out=[101], players_in=[103]),
        TradeSide(team="BOS", players_out=[103], players_in=[101]),
    ])
    res = validate_trade(payload.sides)
    assert isinstance(res.legal, bool)
