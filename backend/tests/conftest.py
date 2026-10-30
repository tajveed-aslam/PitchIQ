"""Test setup: a throwaway SQLite database, no Gemini key, and a fake analysis worker so the API's job flow can be
tested without running computer vision. The fake returns a REAL report (a sample clip's, from
frontend/data/samples.json), so the tests exercise the actual report schema."""

import json
import os
import tempfile
from pathlib import Path

_db = Path(tempfile.mkdtemp()) / "test.db"
os.environ["DATABASE_URL"] = f"sqlite:///{_db}"
os.environ["GEMINI_API_KEY"] = ""
os.environ["WORKER_URL"] = ""

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app import seed as seed_module  # noqa: E402
from app.database import Base, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.routers import samples as samples_router  # noqa: E402
from app.services import analyses as analyses_service  # noqa: E402

SAMPLES = json.loads((Path(__file__).resolve().parents[2] / "frontend/data/samples.json").read_text(encoding="utf-8"))
GOOD_REPORT = next(s["report"] for s in SAMPLES if s["id"] == "juggling-43487")
REJECTED_REPORT = next(s["report"] for s in SAMPLES if s["id"] == "juggling-43513")


class FakeWorker:
    """Jobs stay 'processing' until a test finishes them (or set auto=report to finish on the first poll)."""

    def __init__(self):
        self.jobs: dict[str, dict] = {}
        self.auto: dict | None = None
        self.uploads: list[tuple[str, int]] = []

    def _new(self) -> dict:
        job = {"id": f"job{len(self.jobs) + 1}", "status": "queued", "stage": "queued", "report": None,
               "thumbnail_b64": None, "error": None}
        self.jobs[job["id"]] = job
        return dict(job)

    def submit_upload(self, data: bytes, filename: str) -> dict:
        self.uploads.append((filename, len(data)))
        return self._new()

    def submit_sample(self, sample_id: str) -> dict:
        return self._new()

    def get(self, job_id: str) -> dict | None:
        job = self.jobs.get(job_id)
        if job and self.auto is not None and job["status"] != "done":
            self.finish(job_id, self.auto)
        return dict(job) if job else None

    def finish(self, job_id: str, report: dict):
        self.jobs[job_id].update(status="done", stage="done", report=report,
                                 thumbnail_b64="/9j/4AAQSkZJRgABAQAAAQABAAD/2Q==")

    def fail(self, job_id: str, error: str):
        self.jobs[job_id].update(status="failed", stage="done", error=error)


@pytest.fixture
def worker(monkeypatch):
    fake = FakeWorker()
    monkeypatch.setattr(analyses_service, "get_worker", lambda: fake)
    monkeypatch.setattr(samples_router, "get_worker", lambda: fake)
    samples_router._runs.clear()
    return fake


@pytest.fixture(autouse=True)
def fresh_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture
def client(worker):
    return TestClient(app)


@pytest.fixture
def seeded():
    seed_module.seed()


def signup(client, email="player@example.com", plan="trial", name="Test Player") -> dict:
    r = client.post("/auth/signup", json={"name": name, "email": email, "password": "goodpass123", "plan": plan})
    assert r.status_code == 201, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


VIDEO = ("session.mp4", b"\x00\x00\x00\x18ftypmp42" + b"\x00" * 4096, "video/mp4")
