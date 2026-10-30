import hmac
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..dependencies import get_current_user, get_db
from ..models import Analysis, User
from ..plans import allowance, plan_of
from ..schemas import AnalysisOut, AnalysisSummary
from ..services import analyses as svc
from ..services.worker_client import WorkerUnavailable

router = APIRouter()

VIDEO_TYPES = {".mp4", ".mov", ".webm", ".m4v", ".3gp", ".mkv"}
SAMPLE_TITLES = {  # the samples built into the worker (frontend/public/samples)
    "juggling-43490": "Sample: Floodlit freestyle",
    "juggling-43487": "Sample: Long session, full body",
    "juggling-42524": "Sample: Street pitch rhythm",
    "juggling-43513": "Sample: Garage session (moving camera)",
}


def summary(a: Analysis) -> dict:
    return AnalysisSummary(
        id=a.id, title=a.title, skill=a.skill, source=a.source, sample_id=a.sample_id, status=a.status,
        stage=a.stage, touches=a.touches, verdict=(a.report or {}).get("quality", {}).get("verdict"),
        created_at=a.created_at, has_thumbnail=a.thumbnail is not None,
    ).model_dump() | {"thumbnail_url": f"/analyses/{a.id}/thumbnail?sig={svc.thumbnail_sig(a.id)}" if a.thumbnail else None}


def detail(a: Analysis) -> dict:
    s = summary(a)
    return AnalysisOut(**{k: v for k, v in s.items() if k != "thumbnail_url"}, error=a.error, report=a.report,
                       coaching=a.coaching,
                       coaching_locked=not (plan_of(a.user).coaching or a.user.is_guest)).model_dump() | {
        "thumbnail_url": s["thumbnail_url"]}


def _own(db: Session, user: User, analysis_id: int) -> Analysis:
    a = db.get(Analysis, analysis_id)
    if a is None or a.user_id != user.id:
        raise HTTPException(status_code=404, detail="Report not found")
    return a


def _check_allowance(db: Session, user: User):
    left = allowance(db, user)
    if left["trial_expired"]:
        raise HTTPException(status_code=402, detail="Your free trial has ended. Pick a plan to keep analysing.")
    if left["remaining"] <= 0:
        raise HTTPException(status_code=402, detail=f"You've used all {left['limit']} analyses for this "
                            f"{'trial' if left['period'] == 'trial' else left['period']}. Upgrade or wait for the next one.")


@router.post("", status_code=202)
async def upload(file: UploadFile = File(...), title: str | None = Form(default=None),
                 user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _check_allowance(db, user)
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in VIDEO_TYPES:
        raise HTTPException(status_code=415, detail="Please upload a video (MP4, MOV or WebM).")
    limit = settings.max_upload_mb * 1024 * 1024
    data = await file.read(limit + 1)
    if len(data) > limit:
        raise HTTPException(status_code=413, detail=f"That video is over {settings.max_upload_mb} MB. "
                            "Turn on the data saver or trim it.")
    if len(data) < 1024:
        raise HTTPException(status_code=422, detail="That file is empty.")
    try:
        a = svc.start_upload(db, user, data, file.filename or f"video{suffix}", title)
    except WorkerUnavailable:
        raise HTTPException(status_code=503, detail="The analysis service is waking up. Try again in a minute.")
    return detail(a)


@router.post("/sample/{sample_id}", status_code=202)
def analyse_sample(sample_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Run a built-in sample through the real pipeline as one of your own reports (doesn't use your allowance)."""
    if sample_id not in SAMPLE_TITLES:
        raise HTTPException(status_code=404, detail="Unknown sample")
    try:
        a = svc.start_sample(db, user, sample_id, SAMPLE_TITLES[sample_id])
    except WorkerUnavailable:
        raise HTTPException(status_code=503, detail="The analysis service is waking up. Try again in a minute.")
    return detail(a)


@router.get("")
def list_analyses(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.scalars(select(Analysis).where(Analysis.user_id == user.id).order_by(Analysis.created_at.desc()))
    return [summary(svc.refresh(db, a)) for a in rows]


@router.get("/progress")
def progress(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Touches over time for the progress chart (plans with progress tracking; the demo has it)."""
    if not (plan_of(user).progress or user.is_guest):
        return {"locked": True, "points": []}
    rows = db.scalars(select(Analysis).where(Analysis.user_id == user.id, Analysis.status == "done")
                      .order_by(Analysis.created_at))
    return {"locked": False, "points": [
        {"id": a.id, "date": a.created_at.isoformat(), "touches": a.touches,
         "rhythm_cv": ((a.report or {}).get("metrics", {}).get("interval_s") or {}).get("cv")} for a in rows]}


@router.get("/{analysis_id}")
def get_analysis(analysis_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return detail(svc.refresh(db, _own(db, user, analysis_id)))


@router.delete("/{analysis_id}", status_code=204)
def delete_analysis(analysis_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    a = _own(db, user, analysis_id)
    if user.is_guest and a.source == "seed":
        raise HTTPException(status_code=403, detail="The demo's example reports can't be deleted.")
    db.delete(a)
    db.commit()
    return Response(status_code=204)


@router.get("/{analysis_id}/thumbnail")
def thumbnail(analysis_id: int, sig: str, db: Session = Depends(get_db)):
    a = db.get(Analysis, analysis_id)
    if a is None or a.thumbnail is None or not hmac.compare_digest(sig, svc.thumbnail_sig(analysis_id)):
        raise HTTPException(status_code=404, detail="Not found")
    return Response(a.thumbnail, media_type="image/jpeg", headers={"Cache-Control": "private, max-age=86400"})
