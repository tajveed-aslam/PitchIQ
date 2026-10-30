"""Public sample runs: anyone can run a built-in sample through the real pipeline from the samples page, without an
account. Nothing is stored; the job lives on the worker. Rate-limited per visitor because analysis is expensive."""

import time
from collections import defaultdict, deque

from fastapi import APIRouter, HTTPException, Request

from ..services import coaching
from ..services.worker_client import WorkerUnavailable, get_worker
from .analyses import SAMPLE_TITLES

router = APIRouter()

RUNS_PER_HOUR = 6
_runs: dict[str, deque] = defaultdict(deque)
_coaching_cache: dict[str, dict] = {}  # the pipeline is deterministic: one coaching per sample + model version
_job_sample: dict[str, str] = {}


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    return forwarded.split(",")[0].strip() or (request.client.host if request.client else "unknown")


def _rate_limit(ip: str):
    now, runs = time.time(), _runs[ip]
    while runs and runs[0] < now - 3600:
        runs.popleft()
    if len(runs) >= RUNS_PER_HOUR:
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
