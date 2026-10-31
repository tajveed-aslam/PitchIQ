"""Main (Global) edition, player side: physical profile, tests (mindset, reaction, logic), full card, badges,
training plans, progress analytics and compare."""

import copy

from conftest import GOOD_REPORT, REJECTED_REPORT, VIDEO, signup

from app.services import assessments, training


def analysed(client, worker, headers, report=GOOD_REPORT, touches=None) -> int:
    """Upload a video and finish its job with `report` (touch count overridden if given)."""
    rep = copy.deepcopy(report)
    if touches is not None:
        rep["metrics"]["touches"] = touches
    a = client.post("/analyses", headers=headers, files={"file": VIDEO}, data={"title": "Session"}).json()
    worker.finish(f"job{len(worker.jobs)}", rep)
    assert client.get(f"/analyses/{a['id']}", headers=headers).json()["status"] in ("done", "rejected")
    return a["id"]


def all_agree() -> dict:
    return {q["id"]: 5 for q in assessments.questionnaire()}


# ---- Mindset ----

def test_mindset_reversed_items_stop_agree_with_everything_scoring_100():
    r = assessments.score_mindset(all_agree())
    assert r["score"] == 50  # each trait: 5 on the normal item, 1 after reversing the other
    honest = {q: (5 if not rev else 1) for q, _, _, rev in assessments.QUESTIONS}
    assert assessments.score_mindset(honest)["score"] == 100


def test_mindset_needs_every_answer_in_range(client):
    h = signup(client)
    answers = all_agree()
    answers.pop("q3")
    assert client.post("/player/assessments/mindset", headers=h, json={"answers": answers}).status_code == 422
    assert client.post("/player/assessments/mindset", headers=h, json={"answers": {**all_agree(), "q1": 9}}).status_code == 422
    r = client.post("/player/assessments/mindset", headers=h, json={"answers": all_agree()})
    assert r.status_code == 201 and set(r.json()["detail"]["traits"]) == set(assessments.TRAITS)


# ---- Reaction ----

def test_reaction_scores_the_median_and_refuses_impossible_taps(client):
    h = signup(client)
    ok = client.post("/player/assessments/reaction", headers=h, json={"times_ms": [250, 260, 270, 900, 240], "false_starts": 1})
    assert ok.status_code == 201
    assert ok.json()["detail"]["median_ms"] == 260  # one slow tap doesn't sink the score
    assert ok.json()["score"] == assessments.reaction_rating(260)
    too_fast = client.post("/player/assessments/reaction", headers=h, json={"times_ms": [40, 250, 260, 270, 280]})
    assert too_fast.status_code == 422
    too_few = client.post("/player/assessments/reaction", headers=h, json={"times_ms": [250, 260]})
    assert too_few.status_code == 422


def test_reaction_rating_bands():
    assert assessments.reaction_rating(200) == 99
    assert assessments.reaction_rating(520) == 30
    assert assessments.reaction_rating(900) == 30
    assert 30 < assessments.reaction_rating(370) < 99


# ---- Logic ----

def test_logic_is_graded_by_the_server_and_answers_never_sent(client):
    h = signup(client)
    test = client.get("/player/assessments/logic", headers=h).json()
    assert len(test["questions"]) == 8
    assert all("answer" not in q for q in test["questions"])
    _, right = assessments.logic_questions(__import__("jose").jwt.get_unverified_claims(test["token"])["seed"])
    r = client.post("/player/assessments/logic", headers=h, json={"token": test["token"], "answers": right, "seconds": 90})
    assert r.status_code == 201 and r.json()["score"] == 100 and r.json()["detail"]["correct"] == 8
    wrong = [(x + 1) % 4 for x in right]
    assert client.post("/player/assessments/logic", headers=h,
                       json={"token": test["token"], "answers": wrong}).json()["score"] == 0


def test_logic_rejects_a_forged_token(client):
    h = signup(client)
    from jose import jwt
    forged = jwt.encode({"kind": "logic", "seed": 1}, "not-the-secret", algorithm="HS256")
    r = client.post("/player/assessments/logic", headers=h, json={"token": forged, "answers": [0] * 8})
    assert r.status_code == 422


def test_logic_questions_are_valid_sequences():
    for seed in range(200):
        qs, right = assessments.logic_questions(seed)
        for q, r in zip(qs, right):
            assert len(set(q["options"])) == 4 and 0 <= r < 4


# ---- Card ----

def test_full_card_only_rates_what_was_measured(client, worker):
    h = signup(client)
    empty = client.get("/player/card", headers=h).json()
    assert empty["overall"] is None and empty["complete"] == 0 and empty["readiness"] is None
    assert all(s["value"] is None for s in empty["skills"])

    analysed(client, worker, h)
    client.put("/player/profile", headers=h, json={"height_cm": 172, "weight_kg": 63, "birth_year": 2009})
    client.post("/player/assessments/mindset", headers=h, json={"answers": all_agree()})
    card = client.get("/player/card", headers=h).json()
    video = [s for s in card["skills"] if s["measured_by"] == "video"]
    later = [s for s in card["skills"] if s["measured_by"] is None]
    assert {s["key"] for s in video} == {"TCH", "RHY", "CTL"} and all(s["value"] for s in video)
    assert later and all(s["value"] is None for s in later)  # dribbling etc. never guessed
    assert card["overall"] == round(sum(s["value"] for s in video) / len(video))
    assert card["physical"]["height_cm"] == 172 and card["physical"]["age"] is not None
    assert card["sections"] == {"skills": True, "physical": True, "mindset": True, "reaction": False, "logic": False}
    assert card["complete"] == 60
    assert card["readiness"]["value"] > 0


def test_physical_profile_validation_and_demo_is_read_only(client, seeded):
    h = signup(client)
    assert client.put("/player/profile", headers=h, json={"height_cm": 20}).status_code == 422
    demo = {"Authorization": f"Bearer {client.post('/auth/demo').json()['access_token']}"}
    assert client.put("/player/profile", headers=demo, json={"height_cm": 170}).status_code == 403


# ---- Badges ----

def test_badges_are_earned_once_with_a_notification(client, worker):
    h = signup(client)
    analysed(client, worker, h, touches=12)
    analysed(client, worker, h, touches=24)
    badges = {b["code"]: b for b in client.get("/player/badges", headers=h).json()}
    assert badges["first_analysis"]["earned_at"] and badges["club_20"]["earned_at"]
    assert badges["most_improved"]["earned_at"]  # 24 - 12 >= 5
    assert badges["club_40"]["earned_at"] is None
    client.get("/player/badges", headers=h)
    notes = [n["text"] for n in client.get("/me/notifications", headers=h).json()]
    assert sum("20 Club" in t for t in notes) == 1


def test_rejected_videos_earn_nothing(client, worker):
    h = signup(client)
    analysed(client, worker, h, report=REJECTED_REPORT)
    assert not any(b["earned_at"] for b in client.get("/player/badges", headers=h).json())


# ---- Training plans ----

def test_training_plan_is_gated_needs_a_video_and_has_rest_days(client, worker):
    trial = signup(client)
    assert client.get("/player/training", headers=trial).json()["locked"] is True
    assert client.post("/player/training", headers=trial).status_code == 402

    h = signup(client, email="coach@example.com", plan="coach")
    assert client.post("/player/training", headers=h).status_code == 409  # no video yet
    analysed(client, worker, h)
    plan = client.post("/player/training", headers=h).json()
    assert plan["source"] == "rules"  # no Gemini key in tests
    assert [d["day"] for d in plan["days"]] == list(range(1, 8))
    assert [d["day"] for d in plan["days"] if d["rest"]] == list(training.REST_DAYS)
    names = {s["name"] for d in plan["days"] for s in d["sessions"]}
    assert names <= set(training.LIBRARY)
    assert str(plan["goal_touches"]) in plan["summary"]


def test_finishing_every_session_earns_committed(client, worker):
    h = signup(client, plan="coach")
    analysed(client, worker, h)
    plan = client.post("/player/training", headers=h).json()
    ids = [f"d{d['day']}s{i}" for d in plan["days"] for i in range(len(d["sessions"]))]
    for sid in ids[:-1]:
        assert client.post(f"/player/training/{plan['id']}/sessions", headers=h, json={"session": sid}).status_code == 200
    last = client.post(f"/player/training/{plan['id']}/sessions", headers=h, json={"session": ids[-1]}).json()
    assert "committed" in last["new_badges"]
    assert client.post(f"/player/training/{plan['id']}/sessions", headers=h, json={"session": "d9s9"}).status_code == 422


def test_training_check_rejects_invented_drills_numbers_and_shape():
    f = {"latest_touches": 18, "best_touches": 20, "rhythm": "uneven", "control": "loose", "touches_per_minute": 70.0,
         "week_goal_touches": 25, "reaction_rating": None, "lowest_mindset_trait": None, "lowest_mindset_value": None}
    good_day = {"title": "Rhythm", "drills": [{"name": "Metronome touches", "minutes": 10, "note": "Evens out your beat."}]}
    ok = training.Week(summary="Reach 25 touches this week.", focus=["rhythm"], days=[good_day] * 5)
    assert training.check(ok, f) == []
    bad = training.Week(summary="Reach 25 touches, 87% better.", focus=[], days=[
        {"title": "x", "drills": [{"name": "Rabona sprints", "minutes": 45, "note": "n"}]}] * 4)
    problems = " | ".join(training.check(bad, f))
    assert "4 training days" in problems and "Rabona sprints" in problems and "45 minutes" in problems
    assert "87" in problems


def test_rule_based_plan_targets_the_weak_spots():
    f = {"latest_touches": 18, "best_touches": 20, "rhythm": "erratic", "control": "wild", "touches_per_minute": 70.0,
         "week_goal_touches": 25, "reaction_rating": 40, "lowest_mindset_trait": "Confidence", "lowest_mindset_value": 35}
    plan = training.rule_based(f)
    names = [s["name"] for d in plan["days"] for s in d["sessions"]]
    for drill in ("Metronome touches", "Knee-height cap", "Reaction drops", "Reset breath"):
        assert drill in names


# ---- Progress and compare ----

def test_progress_trend_and_personal_bests(client, worker):
    trial = signup(client)
    assert client.get("/insights/progress", headers=trial).json() == {"locked": True}
    h = signup(client, email="skill@example.com", plan="skill")
    for t in (10, 14, 13, 19, 22):
        analysed(client, worker, h, touches=t)
    p = client.get("/insights/progress", headers=h).json()
    assert [x["touches"] for x in p["points"]] == [10, 14, 13, 19, 22]
    assert [x["touches"] for x in p["personal_bests"]] == [10, 14, 19, 22]
    assert p["summary"]["best"] == 22 and p["trend"]["sessions"] == 5
    assert len(p["weeks"]) == 12 and p["weeks"][-1]["sessions"] == 5


def test_compare_orders_old_to_new_and_reports_changes(client, worker):
    h = signup(client)
    a = analysed(client, worker, h, touches=12)
    b = analysed(client, worker, h, touches=20)
    r = client.get(f"/insights/compare?a={b}&b={a}", headers=h).json()
    assert r["a"]["id"] == a and r["b"]["id"] == b  # swapped back to older -> newer
    assert next(c for c in r["changes"] if c["key"] == "touches")["delta"] == 8
    assert r["verdict"] == "improved"
    assert len(r["a"]["intervals"]) == len(r["a"]["touch_times"]) - 1
    assert client.get(f"/insights/compare?a={a}&b={a}", headers=h).status_code == 422


def test_compare_refuses_other_players_reports(client, worker):
    h = signup(client)
    a = analysed(client, worker, h)
    other = signup(client, email="other@example.com")
    b = analysed(client, worker, other)
    assert client.get(f"/insights/compare?a={a}&b={b}", headers=other).status_code == 404


def test_overview_has_everything_the_dashboard_needs(client, worker):
    h = signup(client)
    analysed(client, worker, h)
    o = client.get("/player/overview", headers=h).json()
    assert set(o) == {"card", "badges", "training", "tasks", "week"}
    assert o["badges"]["earned"] >= 1 and o["week"]["sessions"] == 1
