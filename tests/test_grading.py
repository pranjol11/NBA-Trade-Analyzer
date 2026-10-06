from app.services.grading import grade_side, letter_grade
from app.services import value as pv
from app.services.picks import pick_value


def _ids_by_value():
    df = pv._load_players().sort_values("trade_value")
    return df.player_id.astype(int).tolist()


def test_upgrade_grades_above_even():
    ids = _ids_by_value()
    grade, *_ = grade_side(players_out=[ids[len(ids) // 2]], players_in=[ids[-1]], picks_out=[], picks_in=[])
    assert grade > 50


def test_identical_value_swap_is_even():
    pid = _ids_by_value()[-1]
    grade, *_ = grade_side(players_out=[pid], players_in=[pid], picks_out=[], picks_in=[])
    assert grade == 50


def test_star_for_bench_players_fails():
    # Quantity shouldn't beat quality: the best player for three of the weakest is an F.
    ids = _ids_by_value()
    grade, *_ = grade_side(players_out=[ids[-1]], players_in=ids[:3], picks_out=[], picks_in=[])
    assert letter_grade(grade) == "F"


def test_fair_trade_is_b():
    assert letter_grade(50) == "B"


def _pick(**overrides):
    row = {"original_team": "PHI", "year": 2028, "round": 1, "prot_type": "none"}
    row.update(overrides)
    return row


def test_bad_teams_picks_worth_more():
    assert pick_value(_pick(original_team="WAS")) > pick_value(_pick(original_team="OKC"))


def test_protection_lowers_pick_value():
    assert pick_value(_pick(prot_type="top4")) < pick_value(_pick())


def test_far_future_pick_discounted():
    assert pick_value(_pick(year=2033)) < pick_value(_pick(year=2027))
