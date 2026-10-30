"""Talking to the analysis worker.

Production: the worker is a separate service (a Hugging Face Space, worker/app.py), reached over HTTP with a shared
key. Local development and tests: no WORKER_URL, so the same job code (worker/jobs.py) runs inside this process.
Both look the same to the rest of the API: submit a video or a sample, get a job id, poll the job.
"""

import sys
from functools import lru_cache
from pathlib import Path
from typing import Protocol

import httpx

from ..config import settings

REPO_ROOT = Path(__file__).resolve().parents[3]


class WorkerUnavailable(Exception):
    """The worker couldn't be reached (asleep, restarting, network). Jobs stay pending and are retried."""


class Worker(Protocol):
    def submit_upload(self, data: bytes, filename: str) -> dict: ...
    def submit_sample(self, sample_id: str) -> dict: ...
    def get(self, job_id: str) -> dict | None: ...


class LocalWorker:
    def __init__(self):
        if str(REPO_ROOT) not in sys.path:
            sys.path.insert(0, str(REPO_ROOT))
        from worker.jobs import JobStore  # heavy imports (OpenCV, MediaPipe) only when actually used

        self.store = JobStore()
        self.samples = REPO_ROOT / "frontend/public/samples"

    def submit_upload(self, data: bytes, filename: str) -> dict:
        return self.store.submit_file(data, Path(filename).suffix.lower() or ".mp4").public()

    def submit_sample(self, sample_id: str) -> dict:
        path = self.samples / f"{sample_id}.mp4"
        if not path.exists():
            raise KeyError(sample_id)
        return self.store.submit_path(path).public()

    def get(self, job_id: str) -> dict | None:
        job = self.store.get(job_id)
        return job.public() if job else None


class RemoteWorker:
    def __init__(self, url: str, key: str):
        self.url = url.rstrip("/")
        self.headers = {"X-Worker-Key": key}

    def _call(self, method: str, path: str, timeout: float, **kwargs) -> httpx.Response:
        try:
            return httpx.request(method, self.url + path, headers=self.headers, timeout=timeout, **kwargs)
        except httpx.HTTPError as e:
            raise WorkerUnavailable(str(e)) from e

    def submit_upload(self, data: bytes, filename: str) -> dict:
        r = self._call("POST", "/jobs", 120, files={"file": (filename, data, "application/octet-stream")})
        if r.status_code >= 500:
            raise WorkerUnavailable(f"worker answered {r.status_code}")
        r.raise_for_status()
        return r.json()

    def submit_sample(self, sample_id: str) -> dict:
        r = self._call("POST", f"/jobs/sample/{sample_id}", 30)
        if r.status_code == 404:
            raise KeyError(sample_id)
        if r.status_code >= 500:
            raise WorkerUnavailable(f"worker answered {r.status_code}")
        r.raise_for_status()
        return r.json()

    def get(self, job_id: str) -> dict | None:
        r = self._call("GET", f"/jobs/{job_id}", 15)
        if r.status_code == 404:
            return None
        if r.status_code >= 500:
            raise WorkerUnavailable(f"worker answered {r.status_code}")
        r.raise_for_status()
        return r.json()


@lru_cache(maxsize=1)
def get_worker() -> Worker:
    if settings.worker_url:
        return RemoteWorker(settings.worker_url, settings.worker_key)
    return LocalWorker()
