from ..config import settings


def salary_band_max(outgoing: float, post_trade_payroll: float) -> float:
    """Max incoming salary for a team over the cap after the trade (2023 CBA).

    Below the first apron: the most generous of 125% + $250K and outgoing + the
    expanded TPE amount, capped at 200% + $250K. Above the first apron: 100%.
    """
    if post_trade_payroll > settings.first_apron:
        return outgoing
    return min(
        outgoing * 2 + 250_000,
        max(outgoing + settings.expanded_tpe_amount, outgoing * 1.25 + 250_000),
    )
