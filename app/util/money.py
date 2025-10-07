def salary_band_max(outgoing: float) -> float:
    """
    NBA-like quick approximation:
    - If outgoing >= 6.53M: can receive up to 125% + 100k
    - Else simple 175% + 100k (very rough; real CBA has more tiers)
    """
    if outgoing >= 6_530_000:
        return outgoing * 1.25 + 100_000
    return outgoing * 1.75 + 100_000
