from . import value as pv
from . import picks as pk

# Keeps swaps of near-worthless assets from swinging the grade wildly.
MIN_TRADE_SIZE = 20.0

LETTERS = [(70, "A+"), (62, "A"), (55, "B+"), (45, "B"), (38, "C"), (30, "D")]


def grade_side(players_out, players_in, picks_out, picks_in):
    """Grade one team's side out of 100; 50 = even, 100 = got value for nothing."""
    assets_in = pv.player_values(players_in) + pk.pick_values(picks_in)
    assets_out = pv.player_values(players_out) + pk.pick_values(picks_out)
    value_in = sum(v for _, v in assets_in)
    value_out = sum(v for _, v in assets_out)
    size = max(value_in + value_out, MIN_TRADE_SIZE)
    grade = 50 + 50 * (value_in - value_out) / size
    return grade, value_in, value_out, assets_in, assets_out


def letter_grade(grade: float) -> str:
    for cutoff, letter in LETTERS:
        if grade >= cutoff:
            return letter
    return "F"
