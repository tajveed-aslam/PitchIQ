"""Analysis jobs: run analyse_juggling on a video in the background and keep the result for a while.

Used two ways: by the worker service (worker/app.py, deployed to a Hugging Face Space) and, in local development and
tests, directly inside the API process (backend/app/services/worker_client.py) so no second service is needed.

One job runs at a time: tracking is CPU-bound, so parallel jobs would only slow each other down.
"""

import base64
import shutil
import tempfile
import threading
import time
import traceback
import uuid
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from pathlib import Path

import cv2

from analysis.report import analyse_juggling

MAX_SECONDS = 90  # longer videos are refused: they'd hold the single worker for minutes
KEEP_SECONDS = 3600  # finished jobs are forgotten after an hour (the API stores what it needs)


@dataclass
class Job:
    id: str
    status: str = "queued"  # queued | processing | done | failed
    stage: str = "queued"  # queued | quality | tracking | counting | done
    report: dict | None = None
    thumbnail_b64: str | None = None
    error: str | None = None
    finished_at: float | None = None
    created_at: float = field(default_factory=time.time)

    def public(self) -> dict:
        return {"id": self.id, "status": self.status, "stage": self.stage, "report": self.report,
                "thumbnail_b64": self.thumbnail_b64, "error": self.error}


def thumbnail(path: Path, at_s: float = 1.0, width: int = 320) -> str | None:
    """A small JPEG from about a second in, base64-encoded, for the report list."""
    cap = cv2.VideoCapture(str(path))
    try:
        cap.set(cv2.CAP_PROP_POS_MSEC, at_s * 1000)
        ok, frame = cap.read()
        if not ok:
            return None
        h, w = frame.shape[:2]
        small = cv2.resize(frame, (width, int(h * width / w)), interpolation=cv2.INTER_AREA)
        ok, buf = cv2.imencode(".jpg", small, [cv2.IMWRITE_JPEG_QUALITY, 75])
        return base64.b64encode(buf.tobytes()).decode() if ok else None
    finally:
        cap.release()


def video_seconds(path: Path) -> float:
    cap = cv2.VideoCapture(str(path))
    try:
        fps = cap.get(cv2.CAP_PROP_FPS)
        frames = cap.get(cv2.CAP_PROP_FRAME_COUNT)
        return frames / fps if fps else 0.0
    finally:
        cap.release()


class JobStore:
    def __init__(self):
        self._jobs: dict[str, Job] = {}
        self._lock = threading.Lock()
        self._pool = ThreadPoolExecutor(max_workers=1)
        self._tmp = Path(tempfile.mkdtemp(prefix="pitchiq-jobs-"))

    def submit_file(self, data: bytes, suffix: str = ".mp4") -> Job:
        """Queue a video given as bytes. The temporary copy is deleted when the job ends (videos aren't kept)."""
        job = self._new()
        path = self._tmp / f"{job.id}{suffix}"
        path.write_bytes(data)
        self._pool.submit(self._run, job, path, True)
        return job

    def submit_path(self, path: Path) -> Job:
        """Queue a video already on disk (the built-in samples). The file is left in place."""
        job = self._new()
        self._pool.submit(self._run, job, path, False)
        return job

    def get(self, job_id: str) -> Job | None:
        self._forget_old()
        return self._jobs.get(job_id)

    def _new(self) -> Job:
        job = Job(id=uuid.uuid4().hex)
        with self._lock:
            self._jobs[job.id] = job
        return job

    def _run(self, job: Job, path: Path, delete: bool):
        try:
            job.status = "processing"
            seconds = video_seconds(path)
            if seconds <= 0:
                raise ValueError("This file couldn't be read as a video.")
            if seconds > MAX_SECONDS:
                raise ValueError(f"The video is {seconds:.0f} s long; the limit is {MAX_SECONDS} s. Trim it and try again.")

            def stage(name: str):
                job.stage = name

            job.report = analyse_juggling(path, on_stage=stage)
            job.thumbnail_b64 = thumbnail(path)
            job.stage, job.status = "done", "done"
        except ValueError as e:
            job.status, job.error = "failed", str(e)
        except Exception:  # noqa: BLE001 - any analysis crash becomes a failed job, not a dead worker
            traceback.print_exc()
            job.status, job.error = "failed", "The analysis failed on this video. Please try another one."
        finally:
            job.finished_at = time.time()
            if delete:
                path.unlink(missing_ok=True)

    def _forget_old(self):
        cutoff = time.time() - KEEP_SECONDS
        with self._lock:
            for k in [k for k, j in self._jobs.items() if j.finished_at and j.finished_at < cutoff]:
                del self._jobs[k]

    def close(self):
        self._pool.shutdown(wait=False, cancel_futures=True)
        shutil.rmtree(self._tmp, ignore_errors=True)
