"""The analysis worker over HTTP, with the real pipeline on the built-in sample clips (needs the models:
python -m analysis.get_models). Slow-ish (a few real analyses), so it runs as its own CI job."""

import os
import time
from pathlib import Path

import pytest

os.environ["WORKER_KEY"] = "test-key"

from fastapi.testclient import TestClient  # noqa: E402

from worker.app import app  # noqa: E402
from worker.jobs import video_seconds  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
SAMPLES = ROOT / "frontend/public/samples"
KEY = {"X-Worker-Key": "test-key"}
client = TestClient(app)


def wait(job_id: str, timeout: float = 240) -> dict:
    end = time.time() + timeout
    while time.time() < end:
        r = client.get(f"/jobs/{job_id}", headers=KEY).json()
        if r["status"] in ("done", "failed"):
            return r
        time.sleep(0.5)
    raise TimeoutError(job_id)


def test_health_and_key():
    assert client.get("/").json()["status"] == "ok"
    assert client.post("/jobs/sample/juggling-43490").status_code == 401
    assert client.post("/jobs/sample/juggling-43490", headers={"X-Worker-Key": "wrong"}).status_code == 401


def test_rejects_bad_inputs():
    assert client.post("/jobs/sample/..%2F..%2Fetc", headers=KEY).status_code == 404
    assert client.post("/jobs/sample/nope", headers=KEY).status_code == 404
    assert client.post("/jobs", headers=KEY, files={"file": ("x.exe", b"MZ" * 100)}).status_code == 415
    assert client.get("/jobs/unknown", headers=KEY).status_code == 404


def test_unreadable_video_fails_cleanly(tmp_path):
    broken = tmp_path / "broken.mp4"
    broken.write_bytes(b"\x00" * 5000)
    assert video_seconds(broken) == 0.0
    job = client.post("/jobs", headers=KEY, files={"file": ("broken.mp4", broken.read_bytes())}).json()
    r = wait(job["id"])
    assert r["status"] == "failed" and "couldn't be read" in r["error"]


@pytest.mark.parametrize("sample,low,high", [("juggling-43490", 15, 21), ("juggling-42524", 12, 18)])
def test_sample_counts_stay_near_the_hand_count(sample, low, high):
    """Regression guard: hand counts are 19 and 16; the model gave 17 and 14 when this test was written."""
    job = client.post(f"/jobs/sample/{sample}", headers=KEY).json()
    r = wait(job["id"])
    assert r["status"] == "done", r["error"]
    m = r["report"]["metrics"]
    assert low <= m["touches"] <= high
    assert m["touches_range"][0] <= m["touches"] <= m["touches_range"][1]
    assert r["thumbnail_b64"]


def test_upload_is_deleted_after_analysis():
    data = (SAMPLES / "juggling-42524.mp4").read_bytes()
    job = client.post("/jobs", headers=KEY, files={"file": ("clip.mp4", data)}).json()
    wait(job["id"])
    from worker.app import store
    assert not any(store._tmp.iterdir())  # the temporary copy is gone: videos aren't kept


def test_oversized_video_is_refused(tmp_path, monkeypatch):
    """4K needs more memory than the free server has: refused with a clear message (live crash, BUG-14)."""
    import worker.jobs as jobs
    monkeypatch.setattr(jobs, "MAX_SIDE", 400)  # the samples are 854 px wide: pretend that's too big
    data = (SAMPLES / "juggling-42524.mp4").read_bytes()
    job = client.post("/jobs", headers=KEY, files={"file": ("big.mp4", data)}).json()
    r = wait(job["id"])
    assert r["status"] == "failed" and "data saver" in r["error"]
