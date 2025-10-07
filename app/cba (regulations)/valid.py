from typing import List, Tuple
from ..schemas import TradeSide, LegalityIssue, ValidateResponse
from ..services import value as pv
from ..utils.money import salary_band_max

ROSTER_MIN = 13
ROSTER_MAX = 15

def validate_trade(sides: List[TradeSide]) -> ValidateResponse:
    issues: List[LegalityIssue] = []

    # 1) Salary matching (super rough; assumes both teams are > cap)
    for side in sides:
        outgoing = pv.sum_salary(side.players_out)
        incoming = pv.sum_salary(side.players_in)
        limit = salary_band_max(outgoing)
        if incoming > limit:
            issues.append(LegalityIssue(
                code="SALARY_MATCH_FAIL",
                message=f"{side.team}: incoming ${incoming:,.0f} exceeds allowed ${limit:,.0f}",
                details={"incoming": incoming, "allowed": limit, "outgoing": outgoing}
            ))

    # 2) Roster size (approx: count players swapped; needs roster table later)
    # For MVP, we just ensure each side isn't receiving negative players.
    for side in sides:
        if len(side.players_in) < 0:
            issues.append(LegalityIssue(code="ROSTER_COUNT", message=f"{side.team}: invalid player counts"))

    # 3) Stepien Rule (cannot be without a 1st in consecutive future years)
    # MVP placeholder: if a side sends 2+ firsts (marked by value_units>=2.5) we warn.
    # Proper implementation comes when you track actual pick years/ownership.
    from ..services.picks import _load_picks
    picks_df = _load_picks()

    for side in sides:
        sent = picks_df[picks_df.pick_id.isin(side.picks_out)]
        high_value_firsts = (sent["value_units"] >= 2.5).sum()
        if high_value_firsts >= 2:
            issues.append(LegalityIssue(
                code="STEPIEN_POSSIBLE",
                message=f"{side.team}: check Stepien (sent multiple 1st-like picks)",
            ))

    return ValidateResponse(legal=(len(issues) == 0), issues=issues)
