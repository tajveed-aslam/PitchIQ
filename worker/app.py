"""PitchIQ analysis worker: a small HTTP service around the analysis package (deployed as a Hugging Face Space).

Only the PitchIQ API talks to it, with a shared key (X-Worker-Key). The API sends a video (or names a built-in
sample), gets a job id back at once, and polls for the result while the video is analysed.

Run locally:  uvicorn worker.app:app --port 7860   (from the repo root, with WORKER_KEY set)
"""

import os
from pathlib import Path

from fastapi import Depends, FastAPI, Header, HTTPException, UploadFile

from worker.jobs import JobStore

ROOT = Path(__file__).resolve().parents[1]
SAMPLES = ROOT / "frontend/public/samples"
MAX_BYTES = 40 * 1024 * 1024
ALLOWED = {".mp4", ".mov", ".webm", ".m4v", ".3gp", ".mkv"}

app = FastAPI(title="PitchIQ analysis worker", version="1.0")
store = JobStore()


def require_key(x_worker_key: str = Header(default="")):
    expected = os.environ.get("WORKER_KEY", "")
    if not expected or x_worker_key != expected:
        raise HTTPException(status_code=401, detail="Bad worker key")


@app.get("/")
def health():
    return {"status": "ok", "service": "pitchiq-worker"}


@app.post("/jobs", dependencies=[Depends(require_key)], status_code=202)
async def create_job(file: UploadFile):
    suffix = Path(file.filename or "video.mp4").suffix.lower() or ".mp4"
    if suffix not in ALLOWED:
        raise HTTPException(status_code=415, detail=f"Unsupported file type {suffix}")
    data = await file.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="Video too large")
    return store.submit_file(data, suffix).public()


@app.post("/jobs/sample/{sample_id}", dependencies=[Depends(require_key)], status_code=202)
def create_sample_job(sample_id: str):
    path = SAMPLES / f"{sample_id}.mp4"
    if not sample_id.replace("-", "").isalnum() or not path.exists():
        raise HTTPException(status_code=404, detail="Unknown sample")
    return store.submit_path(path).public()


@app.get("/jobs/{job_id}", dependencies=[Depends(require_key)])
def get_job(job_id: str):
    job = store.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Unknown job (the worker may have restarted)")
    return job.public()
