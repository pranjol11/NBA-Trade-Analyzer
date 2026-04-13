from typing import List
from ..schemas import TradeSide, LegalityIssue, ValidateResponse
from ..services import value as pv
from ..util.money import salary_band_max

ROSTER_MIN = 13
ROSTER_MAX = 15

def validate_trade(sides: List[TradeSide]) -> ValidateResponse:
    issues: List[LegalityIssue] = []

    if len(sides) < 2:
        issues.append(LegalityIssue(
            code="TRADE_SIDES",
            message="A trade must include at least two teams"
        ))

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

    # 2) MVP input sanity checks
    for side in sides:
        if not side.team or not side.team.strip():
            issues.append(LegalityIssue(code="TEAM_REQUIRED", message="Each side must include a team code"))

        if set(side.players_out) & set(side.players_in):
            issues.append(LegalityIssue(
                code="PLAYER_OVERLAP",
                message=f"{side.team}: same player appears in players_out and players_in"
            ))

        if len(side.players_out) != len(set(side.players_out)):
            issues.append(LegalityIssue(
                code="PLAYER_DUPLICATE",
                message=f"{side.team}: duplicate player ids in players_out"
            ))

        if len(side.players_in) != len(set(side.players_in)):
            issues.append(LegalityIssue(
                code="PLAYER_DUPLICATE",
                message=f"{side.team}: duplicate player ids in players_in"
            ))

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
