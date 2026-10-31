"""Analysis jobs: run analyse_juggling on a video in the background and keep the result for a while.

Used two ways: by the worker service (worker/app.py, deployed to a Hugging Face Space) and, in local development and
tests, directly inside the API process (backend/app/services/worker_client.py) so no second service is needed.

One job runs at a time: tracking is CPU-bound, so parallel jobs would only slow each other down.
"""

import base64
import ctypes
import gc
import os
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
from analysis.video import open_video

# Longer videos are refused: they'd hold the single worker for minutes. 60 on the free Render server
# (~1 CPU-second per second of video, at 0.1 CPU: a 60 s clip takes ~10 min).
MAX_SECONDS = int(os.environ.get("MAX_VIDEO_SECONDS", "90"))
# Larger frames need more memory to decode (Linux, 8-bit models: 480p ~400 MB, 1080p ~453, 4K ~578) against 512 MB on the free
# server, shared with the API. Up to 720p is accepted; the data saver sends 480p.
MAX_SIDE = int(os.environ.get("MAX_VIDEO_SIDE", "1280"))
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
    cap = open_video(path)
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


def probe(path: Path) -> tuple[float, int]:
    """(length in seconds, longer side in pixels), or (0, 0) if it isn't a readable video. (OpenCV reports
    fps = frames = -1 for a file it can't open, which divides to a plausible-looking +1 s: so check it opens and
    yields a first frame.)"""
    cap = open_video(path)
    try:
        fps = cap.get(cv2.CAP_PROP_FPS)
        frames = cap.get(cv2.CAP_PROP_FRAME_COUNT)
        ok, frame = cap.read()
        if not cap.isOpened() or fps <= 0 or frames <= 0 or not ok:
            return 0.0, 0
        return frames / fps, max(frame.shape[:2])
    finally:
        cap.release()


def video_seconds(path: Path) -> float:
    return probe(path)[0]


def _release_memory():
    """Give memory freed by the analysis back to the system. Without this the server's peak crept up job by job
    (live: 430 MB after one video, 478 after the next) towards Render's 512 MB limit."""
    gc.collect()
    try:
        ctypes.CDLL("libc.so.6").malloc_trim(0)  # glibc keeps freed memory otherwise
    except OSError:  # not Linux/glibc
        pass


def _lower_priority():
    """Run the analysis at low CPU priority. When it shares a small server with the API (Render free: 0.1 CPU), API
    requests then go first instead of waiting behind the analysis (found by live E2E: a plan switch took over 15 s
    during an upload). On Linux, nice is per thread and inherited by the threads OpenCV/TFLite start from here."""
    try:
        os.setpriority(os.PRIO_PROCESS, threading.get_native_id(), 15)
    except (AttributeError, OSError):  # Windows has no setpriority; nothing to do
        pass


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
        _lower_priority()
        try:
            job.status = "processing"
            seconds, size = probe(path)
            if seconds <= 0:
                raise ValueError("This file couldn't be read as a video.")
            if size > MAX_SIDE:
                raise ValueError(f"The video is too large ({size} pixels wide). Turn on the data saver (it shrinks the "
                                 "video on your phone), or record at 720p, and upload again.")
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
            _release_memory()

    def _forget_old(self):
        cutoff = time.time() - KEEP_SECONDS
        with self._lock:
            for k in [k for k, j in self._jobs.items() if j.finished_at and j.finished_at < cutoff]:
                del self._jobs[k]

    def close(self):
        self._pool.shutdown(wait=False, cancel_futures=True)
        shutil.rmtree(self._tmp, ignore_errors=True)
