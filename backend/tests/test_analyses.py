from datetime import datetime, timedelta, timezone

from conftest import GOOD_REPORT, REJECTED_REPORT, VIDEO, signup

from app.database import SessionLocal
from app.models import Analysis, User


def upload(client, headers, title="Monday session"):
    return client.post("/analyses", headers=headers, files={"file": VIDEO}, data={"title": title})


def test_upload_poll_done_with_report_and_coaching(client, worker):
    headers = signup(client)
    r = upload(client, headers)
    assert r.status_code == 202, r.text
    a = r.json()
    assert a["status"] == "queued" and a["report"] is None
    assert worker.uploads == [("session.mp4", len(VIDEO[1]))]

    worker.jobs["job1"]["status"], worker.jobs["job1"]["stage"] = "processing", "tracking"
    assert client.get(f"/analyses/{a['id']}", headers=headers).json()["stage"] == "tracking"

    worker.finish("job1", GOOD_REPORT)
    done = client.get(f"/analyses/{a['id']}", headers=headers).json()
    assert done["status"] == "done"
    assert done["touches"] == GOOD_REPORT["metrics"]["touches"]
    assert done["report"]["schema_version"] == 1
    assert done["coaching"]["source"] == "rules"  # no Gemini key in tests
    assert done["coaching_locked"] is False  # the trial includes coaching
    assert done["thumbnail_url"].startswith(f"/analyses/{a['id']}/thumbnail?sig=")
    notes = [n["text"] for n in client.get("/me/notifications", headers=headers).json()]
    assert any("is ready" in t for t in notes)


def test_quality_gate_rejection_is_stored_without_coaching(client, worker):
    headers = signup(client)
    a = upload(client, headers).json()
    worker.finish("job1", REJECTED_REPORT)
    r = client.get(f"/analyses/{a['id']}", headers=headers).json()
    assert r["status"] == "rejected" and r["verdict"] == "reject" and r["coaching"] is None


def test_failed_job_and_lost_job(client, worker):
    headers = signup(client)
    a1 = upload(client, headers).json()
    worker.fail("job1", "The video is 120 s long; the limit is 90 s.")
    r = client.get(f"/analyses/{a1['id']}", headers=headers).json()
    assert r["status"] == "failed" and "90 s" in r["error"]

    a2 = upload(client, headers).json()
    del worker.jobs["job2"]  # worker restarted
    r = client.get(f"/analyses/{a2['id']}", headers=headers).json()
    assert r["status"] == "failed" and "restarted" in r["error"]


def test_stale_job_gives_up(client, worker):
    headers = signup(client)
    a = upload(client, headers).json()
    with SessionLocal() as db:
        row = db.get(Analysis, a["id"])
        row.created_at = datetime.now(timezone.utc) - timedelta(minutes=30)
        db.commit()
    assert client.get(f"/analyses/{a['id']}", headers=headers).json()["status"] == "failed"


def test_reports_are_private(client, worker):
    a = upload(client, signup(client)).json()
    other = signup(client, email="other@example.com")
    assert client.get(f"/analyses/{a['id']}", headers=other).status_code == 404
    assert client.delete(f"/analyses/{a['id']}", headers=other).status_code == 404


def test_thumbnail_needs_the_signature(client, worker):
    headers = signup(client)
    a = upload(client, headers).json()
    worker.finish("job1", GOOD_REPORT)
    url = client.get(f"/analyses/{a['id']}", headers=headers).json()["thumbnail_url"]
    ok = client.get(url)
    assert ok.status_code == 200 and ok.headers["content-type"] == "image/jpeg"
    assert client.get(f"/analyses/{a['id']}/thumbnail?sig=forged").status_code == 404


def test_upload_validation(client, worker):
    headers = signup(client)
    r = client.post("/analyses", headers=headers, files={"file": ("notes.txt", b"x" * 5000, "text/plain")})
    assert r.status_code == 415
    r = client.post("/analyses", headers=headers, files={"file": ("tiny.mp4", b"x", "video/mp4")})
    assert r.status_code == 422
    assert worker.uploads == []


def test_trial_allowance_counts_only_usable_analyses(client, worker):
    headers = signup(client)
    upload(client, headers)
    worker.fail("job1", "unreadable")
    client.get("/analyses", headers=headers)  # refresh -> failed: doesn't count
    upload(client, headers)
    worker.finish("job2", REJECTED_REPORT)
    client.get("/analyses", headers=headers)  # rejected: doesn't count
    for _ in range(3):
        assert upload(client, headers).status_code == 202
    r = upload(client, headers)
    assert r.status_code == 402 and "3 analyses" in r.json()["detail"]
    assert client.get("/me", headers=headers).json()["allowance"]["remaining"] == 0


def test_expired_trial_blocks_uploads_until_a_plan_is_chosen(client, worker):
    headers = signup(client)
    with SessionLocal() as db:
        u = db.query(User).filter_by(email="player@example.com").one()
        u.plan_started_at = datetime.now(timezone.utc) - timedelta(days=8)
        db.commit()
    r = upload(client, headers)
    assert r.status_code == 402 and "trial has ended" in r.json()["detail"]
    assert client.post("/me/plan", headers=headers, json={"plan": "skill"}).json()["remaining"] == 20
    assert upload(client, headers).status_code == 202


def test_skill_plan_has_no_coaching_but_has_progress(client, worker):
    headers = signup(client, plan="skill")
    a = upload(client, headers).json()
    worker.finish("job1", GOOD_REPORT)
    r = client.get(f"/analyses/{a['id']}", headers=headers).json()
    assert r["coaching"] is None and r["coaching_locked"] is True
    prog = client.get("/analyses/progress", headers=headers).json()
    assert prog["locked"] is False and prog["points"][0]["touches"] == GOOD_REPORT["metrics"]["touches"]


def test_progress_locked_on_trial(client):
    assert client.get("/analyses/progress", headers=signup(client)).json() == {"locked": True, "points": []}


def test_sample_analysis_does_not_use_allowance(client, worker):
    headers = signup(client)
    r = client.post("/analyses/sample/juggling-43490", headers=headers)
    assert r.status_code == 202 and r.json()["source"] == "sample"
    assert client.get("/me", headers=headers).json()["allowance"]["used"] == 0
    assert client.post("/analyses/sample/nope", headers=headers).status_code == 404


def test_delete_and_list(client, worker):
    headers = signup(client)
    a = upload(client, headers).json()
    assert [x["id"] for x in client.get("/analyses", headers=headers).json()] == [a["id"]]
    assert client.delete(f"/analyses/{a['id']}", headers=headers).status_code == 204
    assert client.get("/analyses", headers=headers).json() == []


def test_demo_dashboard_has_card_stats_and_history(client, seeded):
    headers = {"Authorization": f"Bearer {client.post('/auth/demo').json()['access_token']}"}
    d = client.get("/me/dashboard", headers=headers).json()
    assert d["stats"]["analyses"] == 8 and d["stats"]["best"] == 29 and d["stats"]["change"] == 6
    assert 30 <= d["card"]["overall"] <= 99 and len(d["card"]["attributes"]) == 4
    assert len(d["recent"]) == 4 and d["notifications"]
    first = client.get("/analyses", headers=headers).json()[-1]
    assert client.delete(f"/analyses/{first['id']}", headers=headers).status_code == 403  # seeded: protected
