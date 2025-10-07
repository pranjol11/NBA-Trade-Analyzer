from app.services.grading import score_team

def test_score_signals():
    # bring in a higher-impact player
    score, br = score_team(players_out=[102], players_in=[103], picks_out=[], picks_in=[])
    assert score > 0
