"""Main (Global) edition analytics: progress over time and two sessions side by side. Everything here is computed
from stored reports; the trend line is a straight-line fit over the player's own sessions, shown as a trend and
not as a prediction of what they will reach."""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..dependencies import get_current_user, get_db
from ..models import Analysis, Assessment, User
from ..plans import plan_of
from ..services.coaching import control_label, rhythm_label
from .analyses import summary

router = APIRouter()

MIN_FOR_TREND = 4


def _aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _point(a: Analysis) -> dict:
    m = a.report["metrics"]
    interval, arc = m.get("interval_s") or {}, m.get("arc_height_balls") or {}
    return {
        "id": a.id, "date": _aware(a.created_at).isoformat(), "title": a.title, "touches": m["touches"],
        "range": m["touches_range"], "certain": m["touches_certain"], "per_minute": m.get("touches_per_minute"),
        "interval": interval.get("mean"), "rhythm_cv": interval.get("cv"), "arc": arc.get("mean"),
        "rhythm": rhythm_label(interval.get("cv")), "control": control_label(arc.get("mean")),
        "duration": a.report["video"]["duration_s"],
    }


def _fit(points: list[dict]) -> dict | None:
    """Least-squares line of touches against days since the first session."""
    if len(points) < MIN_FOR_TREND:
        return None
    t0 = datetime.fromisoformat(points[0]["date"])
    xs = [(datetime.fromisoformat(p["date"]) - t0).total_seconds() / 86400 for p in points]
    ys = [p["touches"] for p in points]
    n, mx, my = len(xs), sum(xs) / len(xs), sum(ys) / len(ys)
    sxx = sum((x - mx) ** 2 for x in xs)
    if sxx == 0:
        return None
    slope = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sxx
    intercept = my - slope * mx
    span = xs[-1]
    ahead = [span + d for d in (7, 14, 21, 28)]
    return {"per_week": round(slope * 7, 1), "intercept": round(intercept, 2), "slope_per_day": round(slope, 4),
            "start": points[0]["date"], "line": [{"day": round(x, 1), "touches": round(intercept + slope * x, 1)} for x in (0, span)],
            "ahead": [{"day": round(x, 1), "touches": round(max(0.0, intercept + slope * x), 1)} for x in ahead],
            "sessions": n}


@router.get("/progress")
def progress(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not (plan_of(user).progress or user.is_guest):
        return {"locked": True}
    rows = list(db.scalars(select(Analysis).where(Analysis.user_id == user.id, Analysis.status == "done",
                                                  Analysis.report.is_not(None)).order_by(Analysis.created_at)))
    points = [_point(a) for a in rows]
    bests, best = [], 0
    for p in points:
        if p["touches"] > best:
            best = p["touches"]
            bests.append({"id": p["id"], "date": p["date"], "touches": best})
    first5, last5 = points[:5], points[-5:]
    avg = lambda ps: round(sum(p["touches"] for p in ps) / len(ps), 1) if ps else None  # noqa: E731
    cvs = [p["rhythm_cv"] for p in last5 if p["rhythm_cv"] is not None]

    week0 = (datetime.now(timezone.utc) - timedelta(days=datetime.now(timezone.utc).weekday())).replace(
        hour=0, minute=0, second=0, microsecond=0)
    weeks = []
    for w in range(11, -1, -1):
        lo, hi = week0 - timedelta(weeks=w), week0 - timedelta(weeks=w - 1)
        weeks.append({"week": lo.date().isoformat(),
                      "sessions": sum(1 for p in points if lo <= datetime.fromisoformat(p["date"]) < hi)})

    tests = db.scalars(select(Assessment).where(Assessment.user_id == user.id).order_by(Assessment.created_at))
    return {
        "locked": False,
        "points": points,
        "personal_bests": bests,
        "summary": {"sessions": len(points), "best": best or None, "first_avg": avg(first5), "recent_avg": avg(last5),
                    "change": round(avg(last5) - avg(first5), 1) if len(points) >= 2 else None,
                    "recent_rhythm": rhythm_label(sum(cvs) / len(cvs)) if cvs else None},
        "trend": _fit(points),
        "weeks": weeks,
        "assessments": [{"kind": a.kind, "score": a.score, "date": _aware(a.created_at).isoformat()} for a in tests],
    }


def _side(db: Session, user: User, analysis_id: int) -> dict:
    a = db.get(Analysis, analysis_id)
    if a is None or a.user_id != user.id:
        raise HTTPException(status_code=404, detail="Report not found")
    if a.status != "done" or not a.report:
        raise HTTPException(status_code=422, detail="Only finished reports can be compared.")
    times = a.report["metrics"].get("touch_times_s") or []
    return {**summary(a), **_point(a), "touch_times": times,
            "intervals": [round(b - x, 2) for x, b in zip(times, times[1:])]}


@router.get("/compare")
def compare(a: int, b: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Two of the player's sessions side by side, with the change in each metric (b minus a)."""
    if a == b:
        raise HTTPException(status_code=422, detail="Pick two different sessions.")
    left, right = _side(db, user, a), _side(db, user, b)
    if left["date"] > right["date"]:
        left, right = right, left  # always older -> newer, so "change" reads as progress

    def delta(key: str):
        x, y = left.get(key), right.get(key)
        return round(y - x, 2) if isinstance(x, (int, float)) and isinstance(y, (int, float)) else None

    better = {"touches": "up", "per_minute": "up", "rhythm_cv": "down", "arc": "down", "certain": "up"}
    changes = [{"key": k, "delta": delta(k), "better": better[k]} for k in better]
    return {"a": left, "b": right, "changes": changes,
            "verdict": ("improved" if (delta("touches") or 0) > 0 else "dropped" if (delta("touches") or 0) < 0 else "level")}
