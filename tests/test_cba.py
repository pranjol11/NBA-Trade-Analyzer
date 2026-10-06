from app.schemas import TradeSide
from app.cba.valid import validate_trade
from app.config import settings
from app.services import value as pv


def _roster_issues(res):
    return [i for i in res.issues if i.code == "ROSTER_COUNT"]


def test_one_for_one_swap_passes_roster_check():
    df = pv._load_players()
    a = df.iloc[0]
    b = df[df.team != a.team].iloc[0]
    res = validate_trade([
        TradeSide(team=a.team, players_out=[int(a.player_id)], players_in=[int(b.player_id)]),
        TradeSide(team=b.team, players_out=[int(b.player_id)], players_in=[int(a.player_id)]),
    ])
    assert _roster_issues(res) == []


def test_adding_players_to_full_roster_is_flagged():
    df = pv._load_players()
    team = df.team.iloc[0]
    incoming = df[df.team != team].player_id.head(settings.roster_max).astype(int).tolist()
    res = validate_trade([
        TradeSide(team=team, players_in=incoming),
        TradeSide(team="XXX", players_out=incoming),
    ])
    assert any(team in i.message for i in _roster_issues(res))
