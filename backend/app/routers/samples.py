"""Public samples.

- GET /samples/{id}/coaching: AI coaching for the sample's stored report (the report the same pipeline produced for
  that exact file: frontend/data/samples.json). This is what the samples page uses on the free server, where a live
  run would take minutes. Cached: one Gemini call per sample per process.
- POST /samples/{id}/analyse + GET /samples/jobs/{job}: a live run through the real pipeline (nothing stored).
  Rate-limited per visitor because analysis is expensive.
"""

import json
import time
from collections import defaultdict, deque
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request

from ..config import settings
from ..services import coaching
from ..services.worker_client import WorkerUnavailable, get_worker
from .analyses import SAMPLE_TITLES

router = APIRouter()

_runs: dict[str, deque] = defaultdict(deque)
_coaching_cache: dict[str, dict] = {}  # the pipeline is deterministic: one coaching per sample + model version
_job_sample: dict[str, str] = {}

_STORED = Path(__file__).resolve().parents[3] / "frontend/data/samples.json"


def _stored_reports() -> dict[str, dict]:
    try:
        return {s["id"]: s["report"] for s in json.loads(_STORED.read_text(encoding="utf-8"))}
    except (OSError, ValueError, KeyError):
        return {}


STORED_REPORTS = _stored_reports()


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    return forwarded.split(",")[0].strip() or (request.client.host if request.client else "unknown")


def _rate_limit(ip: str):
    now, runs = time.time(), _runs[ip]
    while runs and runs[0] < now - 3600:
        runs.popleft()
    if len(runs) >= settings.sample_runs_per_hour:
        raise HTTPException(status_code=429, detail="You've run a lot of samples this hour. Try again later, "
                            "or sign up to analyse your own videos.")
    runs.append(now)


@router.post("/{sample_id}/analyse", status_code=202)
def analyse(sample_id: str, request: Request):
    if sample_id not in SAMPLE_TITLES:
        raise HTTPException(status_code=404, detail="Unknown sample")
    _rate_limit(client_ip(request))
    try:
        job = get_worker().submit_sample(sample_id)
    except WorkerUnavailable:
        raise HTTPException(status_code=503, detail="The analysis service is waking up. Try again in a minute.")
    _job_sample[job["id"]] = sample_id
    return {"job_id": job["id"], "status": job["status"], "stage": job["stage"]}


@router.get("/jobs/{job_id}")
def job(job_id: str):
    sample_id = _job_sample.get(job_id)
    if sample_id is None:
        raise HTTPException(status_code=404, detail="Unknown job")
    try:
        j = get_worker().get(job_id)
    except WorkerUnavailable:
        return {"status": "processing", "stage": "waiting", "report": None, "coaching": None}
    if j is None:
        raise HTTPException(status_code=404, detail="The analysis service restarted. Please run it again.")
    out = {"status": j["status"], "stage": j["stage"], "error": j.get("error"), "report": j.get("report"),
           "coaching": None}
    report = j.get("report")
    if j["status"] == "done" and report and report["quality"]["verdict"] != "reject":
        key = f"{sample_id}:{report['model_version']}"
        if key not in _coaching_cache:
            _coaching_cache[key] = coaching.generate(report)
        out["coaching"] = _coaching_cache[key]
    return out


@router.get("/{sample_id}/coaching")
def stored_coaching(sample_id: str):
    report = STORED_REPORTS.get(sample_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Unknown sample")
    if report["quality"]["verdict"] == "reject":
        return {"coaching": None}
    key = f"stored:{sample_id}:{report['model_version']}"
    if key not in _coaching_cache:
        _coaching_cache[key] = coaching.generate(report)
    return {"coaching": _coaching_cache[key]}
