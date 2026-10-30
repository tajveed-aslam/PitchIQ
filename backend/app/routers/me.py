from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from ..dependencies import get_current_user, get_db
from ..models import Analysis, Notification, User, now
from ..plans import PLANS, allowance
from ..schemas import NotificationOut, PlanIn, ProfileIn, UserOut
from ..services.analyses import notify
from .analyses import summary

router = APIRouter()


def _clamp(x: float) -> int:
    return int(max(30, min(99, round(x))))


def player_card(user: User, done: list[Analysis]) -> dict:
    """A simple FIFA-style card from the player's own measured sessions (Lite). Ratings 30-99:
    touches from the best count, rhythm from how even the timing is, control from how low the ball stays,
    and activity from sessions in the last 30 days."""
    if not done:
        return {"overall": None, "attributes": [], "sessions": 0}
    best = max(a.touches or 0 for a in done)
    recent = done[:5]
    cvs = [a.report["metrics"]["interval_s"]["cv"] for a in recent if (a.report["metrics"].get("interval_s") or {}).get("cv") is not None]
    arcs = [a.report["metrics"]["arc_height_balls"]["mean"] for a in recent if a.report["metrics"].get("arc_height_balls")]
    month_ago = datetime.now(timezone.utc) - timedelta(days=30)
    active = sum(1 for a in done if (a.created_at if a.created_at.tzinfo else a.created_at.replace(tzinfo=timezone.utc)) >= month_ago)
    attrs = [
        {"key": "TCH", "label": "Touches", "value": _clamp(40 + best * 1.2)},
        {"key": "RHY", "label": "Rhythm", "value": _clamp(100 - 70 * (sum(cvs) / len(cvs))) if cvs else None},
        {"key": "CTL", "label": "Control", "value": _clamp(105 - 15 * (sum(arcs) / len(arcs))) if arcs else None},
        {"key": "ACT", "label": "Activity", "value": _clamp(40 + active * 7)},
    ]
    values = [a["value"] for a in attrs if a["value"] is not None]
    return {"overall": round(sum(values) / len(values)), "attributes": attrs, "sessions": len(done), "best": best}


@router.get("")
def me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return {"user": UserOut.model_validate(user).model_dump(), "allowance": allowance(db, user)}


@router.patch("", response_model=UserOut)
def update_profile(body: ProfileIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.is_guest:
        raise HTTPException(status_code=403, detail="The demo profile can't be changed. Sign up to make your own.")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(user, field, value.strip() if isinstance(value, str) else value)
    db.commit()
    db.refresh(user)
    return user


@router.post("/plan")
def change_plan(body: PlanIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Test mode: switches the plan at once, no payment."""
    if user.is_guest:
        raise HTTPException(status_code=403, detail="The demo account's plan can't be changed. Sign up to try plans.")
    if body.plan != user.plan:
        user.plan, user.plan_started_at = body.plan, now()
        notify(db, user, f"You're now on {PLANS[body.plan].name} (test mode, nothing charged).", "/dashboard")
        db.commit()
    return allowance(db, user)


@router.get("/dashboard")
def dashboard(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    analyses = list(db.scalars(select(Analysis).where(Analysis.user_id == user.id).order_by(Analysis.created_at.desc())))
    done = [a for a in analyses if a.status == "done" and a.report]
    unread = db.scalars(select(Notification).where(Notification.user_id == user.id, Notification.read.is_(False))
                        .order_by(Notification.created_at.desc()).limit(5))
    last, prev = (done[0].touches if done else None), (done[1].touches if len(done) > 1 else None)
    return {
        "user": UserOut.model_validate(user).model_dump(),
        "allowance": allowance(db, user),
        "card": player_card(user, done),
        "stats": {"analyses": len(done), "best": max((a.touches or 0 for a in done), default=None),
                  "last": last, "change": (last - prev) if last is not None and prev is not None else None},
        "recent": [summary(a) for a in analyses[:4]],
        "notifications": [NotificationOut.model_validate(n).model_dump() for n in unread],
    }


@router.get("/notifications", response_model=list[NotificationOut])
def notifications(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.scalars(select(Notification).where(Notification.user_id == user.id)
                      .order_by(Notification.created_at.desc()).limit(30))


@router.post("/notifications/read")
def mark_read(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.execute(update(Notification).where(Notification.user_id == user.id).values(read=True))
    db.commit()
    return {"ok": True}
