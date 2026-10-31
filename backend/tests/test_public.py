"""Public endpoints: sample runs (rate-limited), the challenge leaderboard and support."""

from conftest import GOOD_REPORT, REJECTED_REPORT, signup


def test_public_sample_run_with_coaching(client, worker):
    r = client.post("/samples/juggling-43487/analyse")
    assert r.status_code == 202
    job = r.json()["job_id"]
    assert client.get(f"/samples/jobs/{job}").json()["status"] == "queued"
    worker.finish(job, GOOD_REPORT)
    done = client.get(f"/samples/jobs/{job}").json()
    assert done["report"]["metrics"]["touches"] == GOOD_REPORT["metrics"]["touches"]
    assert done["coaching"]["source"] == "rules"


def test_public_sample_rejected_has_no_coaching(client, worker):
    job = client.post("/samples/juggling-43513/analyse").json()["job_id"]
    worker.finish(job, REJECTED_REPORT)
    assert client.get(f"/samples/jobs/{job}").json()["coaching"] is None


def test_public_sample_rate_limit_and_unknowns(client, worker):
    for _ in range(6):
        assert client.post("/samples/juggling-43490/analyse").status_code == 202
    assert client.post("/samples/juggling-43490/analyse").status_code == 429
    assert client.post("/samples/juggling-43490/analyse", headers={"X-Forwarded-For": "10.0.0.9"}).status_code == 202
    assert client.post("/samples/not-a-sample/analyse").status_code == 404
    assert client.get("/samples/jobs/unknown").status_code == 404


def test_leaderboard_ranks_seeded_players_and_hides_non_entrants(client, worker, seeded):
    board = client.get("/events/current").json()
    touches = [row["touches"] for row in board["leaderboard"]]
    assert touches == sorted(touches, reverse=True) and touches[0] == 64
    assert board["leaderboard"][0]["name"] == "Kwame A."  # surname initial only
    assert board["can_enter"] is False and board["logged_in"] is False

    headers = signup(client)  # trial: doesn't include events, so their score isn't on the board
    client.post("/analyses", headers=headers, files={"file": ("a.mp4", b"\x00" * 5000, "video/mp4")})
    worker.finish("job1", GOOD_REPORT)
    client.get("/analyses", headers=headers)
    board = client.get("/events/current", headers=headers).json()
    assert not any(r["is_you"] for r in board["leaderboard"]) and board["can_enter"] is False

    client.post("/me/plan", headers=headers, json={"plan": "events"})
    board = client.get("/events/current", headers=headers).json()
    mine = [r for r in board["leaderboard"] if r["is_you"]]
    assert mine and mine[0]["touches"] == GOOD_REPORT["metrics"]["touches"] and board["can_enter"] is True


def test_faq_contact_and_chat_fallback(client):
    assert len(client.get("/support/faq").json()) >= 8
    assert client.post("/support/contact", json={"name": "A", "email": "a@b.co", "message": "short"}).status_code == 422
    r = client.post("/support/contact", json={"name": "A", "email": "a@b.co", "message": "My upload keeps failing."})
    assert r.status_code == 201

    r = client.post("/support/chat", json={"message": "Why was my video rejected?"}).json()
    assert r["source"] == "faq" and "camera" in r["reply"]
    r = client.post("/support/chat", json={"message": "Write me a poem about cats"}).json()
    assert "I can help with PitchIQ" in r["reply"]


def test_stored_sample_coaching(client):
    r = client.get("/samples/juggling-43487/coaching")
    assert r.status_code == 200 and r.json()["coaching"]["source"] == "rules" and len(r.json()["coaching"]["drills"]) == 3
    assert client.get("/samples/juggling-43513/coaching").json() == {"coaching": None}  # rejected: no coaching
    assert client.get("/samples/nope/coaching").status_code == 404
