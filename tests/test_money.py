from app.config import settings
from app.util.money import salary_band_max

UNDER_APRON = settings.salary_cap + 1


def test_small_outgoing_uses_200_percent():
    assert salary_band_max(2_000_000, UNDER_APRON) == 4_250_000


def test_mid_outgoing_adds_tpe_amount():
    # Hoops Rumors 2026-27 example: $10M out -> up to $19,096,000 back.
    assert salary_band_max(10_000_000, UNDER_APRON) == 19_096_000


def test_large_outgoing_uses_125_percent():
    assert salary_band_max(50_000_000, UNDER_APRON) == 62_750_000


def test_first_apron_team_limited_to_100_percent():
    assert salary_band_max(30_000_000, settings.first_apron + 1) == 30_000_000
