"""The monthly juggling challenge. Everyone can see the leaderboard; scores count for players whose plan includes
events. A score is a player's best juggling count this month from a video the quality check accepted."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..dependencies import bearer_scheme, get_db
from ..models import Analysis, User
from ..plans import plan_of
from ..security import decode_token

router = APIRouter()


def _display_name(u: User) -> str:
    parts = u.name.split()
    return f"{parts[0]} {parts[-1][0]}." if len(parts) > 1 else parts[0]


@router.get("/current")
def current(db: Session = Depends(get_db), credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme)):
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    me_id = decode_token(credentials.credentials) if credentials else None
    me = db.get(User, me_id) if me_id else None

    best = (select(Analysis.user_id, func.max(Analysis.touches).label("touches"))
            .where(Analysis.status == "done", Analysis.skill == "juggling", Analysis.source != "sample")
            .where((Analysis.created_at >= month_start) | (Analysis.source == "seed"))
            .group_by(Analysis.user_id).subquery())
    rows = db.execute(select(User, best.c.touches).join(best, best.c.user_id == User.id)
                      .order_by(best.c.touches.desc())).all()
    board = [(u, t) for u, t in rows if u.is_seed or plan_of(u).events or u.is_guest]
    return {
        "title": f"{now:%B} Touch Challenge",
        "rules": "Your best juggling count this month from one video. The video must pass the quality check "
                 "(still camera, ball visible). Ties go to the earlier video.",
        "ends": (month_start.replace(month=month_start.month % 12 + 1,
                                     year=month_start.year + (month_start.month == 12))).isoformat(),
        "leaderboard": [{"rank": i + 1, "name": _display_name(u), "country": u.country, "touches": t,
                         "is_you": me is not None and u.id == me.id} for i, (u, t) in enumerate(board[:20])],
        "can_enter": bool(me and (plan_of(me).events or me.is_guest)),
        "logged_in": me is not None,
    }
