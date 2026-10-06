from typing import List
from ..schemas import TradeSide, LegalityIssue, ValidateResponse
from ..services import value as pv
from ..util.money import salary_band_max
from ..config import settings

def validate_trade(sides: List[TradeSide]) -> ValidateResponse:
    issues: List[LegalityIssue] = []
    players_df = pv._load_players()

    # Two-way contracts don't count toward the cap or the standard roster limit.
    standard = players_df[~players_df["two_way"].astype(bool)]
    # Prefer official team payrolls: they include dead money that per-player sums miss.
    team_salary = {**standard.groupby("team", dropna=False)["salary"].sum().to_dict(), **pv.team_payrolls()}
    team_count = standard.groupby("team", dropna=False).size().to_dict()

    if len(sides) < 2:
        issues.append(LegalityIssue(
            code="TRADE_SIDES",
            message="A trade must include at least two teams"
        ))

    # 1) Salary legality
    # If post-trade payroll is at/below cap, allow salary absorption.
    # Otherwise apply matching-band rule.
    for side in sides:
        team_code = (side.team or "").strip().upper()
        current_team_salary = float(team_salary.get(team_code, 0.0))

        outgoing = pv.sum_salary(side.players_out)
        incoming = pv.sum_salary(side.players_in)

        post_trade_salary = current_team_salary - outgoing + incoming
        if post_trade_salary > settings.salary_cap:
            limit = salary_band_max(outgoing, post_trade_salary)
            if incoming > limit:
                above_apron = post_trade_salary > settings.first_apron
                issues.append(LegalityIssue(
                    code="SALARY_MATCH_FAIL",
                    message=(
                        f"{side.team}: incoming ${incoming:,.0f} exceeds allowed ${limit:,.0f}"
                        + (" (over the first apron: max 100% of outgoing)" if above_apron else "")
                    ),
                    details={
                        "incoming": incoming,
                        "allowed": limit,
                        "outgoing": outgoing,
                        "team_payroll_post_trade": post_trade_salary,
                        "salary_cap": settings.salary_cap,
                        "first_apron": settings.first_apron,
                    }
                ))

            # Second-apron teams can't combine salaries to take back a bigger contract.
            if post_trade_salary > settings.second_apron and len(side.players_out) > 1:
                biggest_single = max(pv.sum_salary([pid]) for pid in side.players_out)
                if incoming > biggest_single:
                    issues.append(LegalityIssue(
                        code="SECOND_APRON_AGGREGATION",
                        message=(
                            f"{side.team}: over the second apron after the trade, so it can't aggregate "
                            f"salaries; incoming ${incoming:,.0f} exceeds its largest outgoing "
                            f"salary ${biggest_single:,.0f}"
                        ),
                        details={
                            "incoming": incoming,
                            "largest_outgoing": biggest_single,
                            "team_payroll_post_trade": post_trade_salary,
                            "second_apron": settings.second_apron,
                        }
                    ))

    # 2) MVP input sanity checks
    for side in sides:
        if not side.team or not side.team.strip():
            issues.append(LegalityIssue(code="TEAM_REQUIRED", message="Each side must include a team code"))

        team_code = side.team.strip().upper() if side.team else ""
        current_team_count = int(team_count.get(team_code, 0))
        net_change = len(side.players_in) - len(side.players_out)
        post_trade_count = current_team_count + net_change
        # Offseason rosters legitimately sit above the max (training camp), so only
        # flag trades that push a roster further out of range.
        too_many = net_change > 0 and post_trade_count > settings.roster_max
        too_few = net_change < 0 and post_trade_count < settings.roster_min
        if too_many or too_few:
            issues.append(LegalityIssue(
                code="ROSTER_COUNT",
                message=(
                    f"{side.team}: post-trade roster count {post_trade_count} is outside "
                    f"{settings.roster_min}-{settings.roster_max}"
                ),
                details={
                    "post_trade_count": post_trade_count,
                    "allowed_min": settings.roster_min,
                    "allowed_max": settings.roster_max,
                }
            ))

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
