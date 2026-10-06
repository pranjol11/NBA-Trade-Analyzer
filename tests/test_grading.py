from app.services.grading import score_team
from app.services import value as pv


def test_score_signals():
    df = pv._load_players()
    best = int(df.loc[df.impact_now.idxmax(), "player_id"])
    worst = int(df.loc[df.impact_now.idxmin(), "player_id"])
    score, _ = score_team(players_out=[worst], players_in=[best], picks_out=[], picks_in=[])
    assert score > 0
