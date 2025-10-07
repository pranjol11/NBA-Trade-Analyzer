from . import value as pv
from . import picks as pk
from ..config import settings

def team_trade_delta(players_out, players_in, picks_out, picks_in):
    # deltas from perspective of one team
    delta_now = pv.sum_impact_now(players_in) - pv.sum_impact_now(players_out)
    delta_future = pv.sum_value_future(players_in) - pv.sum_value_future(players_out)
    delta_picks = pk.value_picks(picks_in) - pk.value_picks(picks_out)
    return delta_now, delta_future, delta_picks

def score_team(players_out, players_in, picks_out, picks_in):
    dn, df, dp = team_trade_delta(players_out, players_in, picks_out, picks_in)
    score = settings.alpha_now*dn + settings.beta_future*df + settings.gamma_pick*dp
    breakdown = {"impact_now": dn, "future_value": df, "pick_value": dp}
    return score, breakdown

def letter_grade(x: float):
    # very simple mapping; tweak later
    if x >= 3.0: return "A"
    if x >= 1.5: return "B"
    if x >= 0.5: return "C"
    if x >= -0.5: return "D"
    return "F"
