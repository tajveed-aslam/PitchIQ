"""Coach rooms: plan gating, expiring join codes, roles, tasks, hand-ins, coach feedback, reminders, team view."""

from datetime import datetime, timedelta, timezone

from conftest import signup
from test_main_player import analysed

from app.database import SessionLocal
from app.models import Room


def later(hours: float = 72) -> str:
    return (datetime.now(timezone.utc) + timedelta(hours=hours)).isoformat()


def squad(client, worker, players: int = 2, kind: str = "team", min_touches: int | None = None):
    coach = signup(client, email="coach@example.com", plan="team", name="Coach Carter")
    room = client.post("/rooms", headers=coach, json={"name": "U16 Lions", "kind": kind, "min_touches": min_touches}).json()
    hs = []
    for i in range(players):
        h = signup(client, email=f"p{i}@example.com", name=f"Player {i} Test")
        assert client.post("/rooms/join", headers=h, json={"code": room["join_code"].lower()}).status_code == 200
        hs.append(h)
    return coach, room, hs


def test_only_the_coach_plan_can_create_rooms(client):
    h = signup(client, plan="coach")
    r = client.post("/rooms", headers=h, json={"name": "My squad"})
    assert r.status_code == 402 and "Coach plan" in r.json()["detail"]
    assert client.get("/rooms", headers=h).json()["can_create"] is False


def test_join_codes_are_checked_and_expire(client, worker):
    coach, room, _ = squad(client, worker, players=0)
    h = signup(client, email="late@example.com")
    assert client.post("/rooms/join", headers=h, json={"code": "ZZZZZZ"}).status_code == 404
    assert client.post("/rooms/join", headers=coach, json={"code": room["join_code"]}).status_code == 409
    with SessionLocal() as db:
        r = db.get(Room, room["id"])
        r.code_expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
        db.commit()
    assert client.post("/rooms/join", headers=h, json={"code": room["join_code"]}).status_code == 410
    fresh = client.post(f"/rooms/{room['id']}/code", headers=coach).json()["join_code"]
    assert fresh != room["join_code"]
    assert client.post("/rooms/join", headers=h, json={"code": fresh}).status_code == 200
    assert client.post("/rooms/join", headers=h, json={"code": fresh}).status_code == 200  # joining twice is harmless
    assert len(client.get(f"/rooms/{room['id']}", headers=coach).json()["members"]) == 1


def test_players_see_their_view_and_outsiders_see_nothing(client, worker):
    coach, room, (p0, _) = squad(client, worker)
    player_view = client.get(f"/rooms/{room['id']}", headers=p0).json()
    assert player_view["role"] == "player"
    assert "join_code" not in player_view and "members" not in player_view and "alerts" not in player_view
    outsider = signup(client, email="spy@example.com")
    assert client.get(f"/rooms/{room['id']}", headers=outsider).status_code == 404
    assert client.post(f"/rooms/{room['id']}/tasks", headers=p0,
                       json={"title": "Sneaky", "due_at": later()}).status_code == 403
    first_member = client.get(f"/rooms/{room['id']}", headers=coach).json()["members"][0]["user_id"]
    assert client.get(f"/rooms/{room['id']}/players/{first_member}", headers=p0).status_code == 403


def test_task_flow_hand_in_review_and_notifications(client, worker):
    coach, room, (p0, p1) = squad(client, worker)
    t = client.post(f"/rooms/{room['id']}/tasks", headers=coach,
                    json={"title": "20 touches, both feet", "target_touches": 20, "due_at": later()})
    assert t.status_code == 201
    assert any("New task" in n["text"] for n in client.get("/me/notifications", headers=p1).json())

    a = analysed(client, worker, p0, touches=23)
    assert client.post(f"/rooms/tasks/{t.json()['id']}/submit", headers=p0, json={"analysis_id": a}).status_code == 201
    other_players_report = analysed(client, worker, p1)
    assert client.post(f"/rooms/tasks/{t.json()['id']}/submit", headers=p0,
                       json={"analysis_id": other_players_report}).status_code == 404

    view = client.get(f"/rooms/{room['id']}", headers=coach).json()
    task = view["tasks"][0]
    assert task["expected"] == 2 and len(task["submissions"]) == 1
    sub = task["submissions"][0]
    assert sub["met_target"] is True and sub["reviewed"] is False
    assert client.post(f"/rooms/submissions/{sub['id']}/review", headers=p0, json={"score": 100}).status_code == 404
    assert client.post(f"/rooms/submissions/{sub['id']}/review", headers=coach,
                       json={"score": 85, "note": "Great left foot"}).status_code == 200
    mine = client.get(f"/rooms/{room['id']}", headers=p0).json()["tasks"][0]["submissions"][0]
    assert mine["score"] == 85 and mine["note"] == "Great left foot"
    assert any("85/100" in n["text"] for n in client.get("/me/notifications", headers=p0).json())
    assert view["team"]["completion"] == 50


def test_rejected_videos_cant_be_handed_in(client, worker):
    from conftest import REJECTED_REPORT
    coach, room, (p0,) = squad(client, worker, players=1)
    t = client.post(f"/rooms/{room['id']}/tasks", headers=coach, json={"title": "Any", "due_at": later()}).json()
    a = analysed(client, worker, p0, report=REJECTED_REPORT)
    assert client.post(f"/rooms/tasks/{t['id']}/submit", headers=p0, json={"analysis_id": a}).status_code == 422


def test_tasks_for_one_player_stay_private(client, worker):
    coach, room, (p0, p1) = squad(client, worker)
    members = client.get(f"/rooms/{room['id']}", headers=coach).json()["members"]
    target = next(m["user_id"] for m in members if m["name"] == "Player 0 Test")
    client.post(f"/rooms/{room['id']}/tasks", headers=coach, json={"title": "Just you", "due_at": later(), "assignee_id": target})
    assert len(client.get(f"/rooms/{room['id']}", headers=p0).json()["tasks"]) == 1
    assert client.get(f"/rooms/{room['id']}", headers=p1).json()["tasks"] == []


def test_deadline_must_be_in_the_future(client, worker):
    coach, room, _ = squad(client, worker, players=1)
    r = client.post(f"/rooms/{room['id']}/tasks", headers=coach, json={"title": "Late", "due_at": later(-1)})
    assert r.status_code == 422


def test_due_soon_tasks_send_one_reminder(client, worker):
    coach, room, (p0,) = squad(client, worker, players=1)
    client.post(f"/rooms/{room['id']}/tasks", headers=coach, json={"title": "Quick one", "due_at": later(20)})
    for _ in range(3):
        tasks = client.get("/player/overview", headers=p0).json()["tasks"]
    assert tasks[0]["due_soon"] is True
    reminders = [n for n in client.get("/me/notifications", headers=p0).json() if n["text"].startswith("Reminder")]
    assert len(reminders) == 1


def test_task_notifications_respect_the_players_settings(client, worker):
    coach, room, (p0,) = squad(client, worker, players=1)
    client.put("/player/profile", headers=p0, json={"prefs": {"tasks": False, "reports": True, "badges": True}})
    client.post(f"/rooms/{room['id']}/tasks", headers=coach, json={"title": "Quiet", "due_at": later(20)})
    client.get("/player/overview", headers=p0)
    assert not any("Quiet" in n["text"] for n in client.get("/me/notifications", headers=p0).json())


def test_team_dashboard_alerts_and_leaderboard(client, worker):
    coach, room, (p0, p1) = squad(client, worker)
    analysed(client, worker, p0, touches=30)
    analysed(client, worker, p1, touches=12)
    view = client.get(f"/rooms/{room['id']}", headers=coach).json()
    assert [r["touches"] for r in view["leaderboard"]["week"]] == [30, 12]
    assert view["team"]["average_best"] == 21.0
    assert view["members"][0]["best"] == 30  # sorted best first
    assert view["milestones"][0]["value"] == 42
    profile = client.get(f"/rooms/{room['id']}/players/{view['members'][0]['user_id']}", headers=coach).json()
    assert profile["card"]["overall"] is not None and len(profile["reports"]) == 1
    rid = profile["reports"][0]["id"]
    assert client.get(f"/rooms/{room['id']}/reports/{rid}", headers=coach).json()["touches"] == 30


def test_academy_rooms_check_the_bar_and_keep_scouting_notes(client, worker):
    coach, room, (p0, p1) = squad(client, worker, kind="academy", min_touches=20)
    analysed(client, worker, p0, touches=25)
    analysed(client, worker, p1, touches=15)
    view = client.get(f"/rooms/{room['id']}", headers=coach).json()
    by_name = {m["name"]: m for m in view["members"]}
    assert by_name["Player 0 Test"]["meets_criteria"] is True
    assert by_name["Player 1 Test"]["meets_criteria"] is False
    uid = by_name["Player 1 Test"]["user_id"]
    assert client.put(f"/rooms/{room['id']}/members/{uid}/note", headers=coach, json={"note": "Good attitude"}).status_code == 200
    view = client.get(f"/rooms/{room['id']}", headers=coach).json()
    assert {m["name"]: m for m in view["members"]}["Player 1 Test"]["scouting_note"] == "Good attitude"


def test_coach_can_remove_players_and_players_can_leave(client, worker):
    coach, room, (p0, p1) = squad(client, worker)
    members = client.get(f"/rooms/{room['id']}", headers=coach).json()["members"]
    assert client.delete(f"/rooms/{room['id']}/members/{members[0]['user_id']}", headers=coach).status_code == 204
    assert client.post(f"/rooms/{room['id']}/leave", headers=p1).status_code == 204
    assert client.get(f"/rooms/{room['id']}", headers=coach).json()["members"] == []
    assert client.get("/rooms", headers=p1).json()["rooms"] == []
