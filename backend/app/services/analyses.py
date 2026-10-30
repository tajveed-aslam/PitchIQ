"""Analysis jobs as the API sees them: start one on the worker, then bring the stored row up to date whenever it is
read (the frontend polls GET /analyses/{id}). No callbacks into the API are needed, so the worker never has to reach
it, and a sleeping API simply catches up on the next read."""

import base64
import hashlib
import hmac
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from ..config import settings
from ..models import Analysis, Notification, User
from ..plans import plan_of
from . import coaching
from .worker_client import WorkerUnavailable, get_worker

STALE_AFTER = timedelta(minutes=20)  # a job the worker hasn't finished in this long is given up on


def _aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def thumbnail_sig(analysis_id: int) -> str:
    """Signature for the thumbnail URL: <img> tags can't send a login token, so the link itself carries proof."""
    return hmac.new(settings.secret_key.encode(), f"thumb:{analysis_id}".encode(), hashlib.sha256).hexdigest()[:24]


def notify(db: Session, user: User, text: str, link: str | None = None):
    db.add(Notification(user_id=user.id, text=text, link=link))


def start_upload(db: Session, user: User, data: bytes, filename: str, title: str | None) -> Analysis:
    job = get_worker().submit_upload(data, filename)
    a = Analysis(user_id=user.id, title=(title or "Juggling session")[:120], source="upload",
                 status="queued", stage=job.get("stage", "queued"), worker_job_id=job["id"])
    db.add(a)
    db.commit()
    db.refresh(a)
    return a


def start_sample(db: Session, user: User, sample_id: str, title: str) -> Analysis:
    job = get_worker().submit_sample(sample_id)
    a = Analysis(user_id=user.id, title=title, source="sample", sample_id=sample_id,
                 status="queued", stage=job.get("stage", "queued"), worker_job_id=job["id"])
    db.add(a)
    db.commit()
    db.refresh(a)
    return a


def profile_for_coaching(user: User) -> dict:
    return {k: v for k, v in {"age": user.age, "position": user.position,
                              "preferred_foot": user.preferred_foot}.items() if v}


def finish(db: Session, a: Analysis, report: dict, thumbnail_b64: str | None):
    """Store a finished report: quality verdict decides done vs rejected; coaching if the plan includes it."""
    a.report = report
    a.touches = report["metrics"]["touches"]
    a.thumbnail = base64.b64decode(thumbnail_b64) if thumbnail_b64 else None
    a.finished_at = datetime.now(timezone.utc)
    a.stage = "done"
    if report["quality"]["verdict"] == "reject":
        a.status = "rejected"
        notify(db, a.user, f"“{a.title}” needs re-filming: {report['quality']['issues'][0]['message']}",
               f"/reports/{a.id}")
    else:
        a.status = "done"
        if plan_of(a.user).coaching or a.user.is_guest:
            a.coaching = coaching.generate(report, profile_for_coaching(a.user))
        notify(db, a.user, f"Your report for “{a.title}” is ready: {a.touches} touches.", f"/reports/{a.id}")


def refresh(db: Session, a: Analysis) -> Analysis:
    if a.status not in ("queued", "processing") or not a.worker_job_id:
        return a
    try:
        job = get_worker().get(a.worker_job_id)
    except WorkerUnavailable:
        job = {"status": a.status, "stage": a.stage}  # try again on the next poll
    if job is None:
        a.status, a.error = "failed", "The analysis service restarted and lost this job. Please upload again."
    elif job["status"] == "done":
        finish(db, a, job["report"], job.get("thumbnail_b64"))
    elif job["status"] == "failed":
        a.status, a.error, a.stage = "failed", job.get("error") or "The analysis failed.", "done"
        notify(db, a.user, f"“{a.title}” couldn't be analysed: {a.error}", f"/reports/{a.id}")
    else:
        a.status, a.stage = job["status"], job.get("stage", a.stage)
    if a.status in ("queued", "processing") and datetime.now(timezone.utc) - _aware(a.created_at) > STALE_AFTER:
        a.status, a.error = "failed", "The analysis took too long. Please try again."
    db.commit()
    db.refresh(a)
    return a
