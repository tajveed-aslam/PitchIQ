"""Plans and what each one allows. The frontend shows the same plans (frontend/config/editions.ts); the API is the
one that enforces them. Payments are test mode: choosing a plan switches it at once, nothing is charged."""

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .models import Analysis, User


@dataclass(frozen=True)
class Plan:
    id: str
    name: str
    analyses: int  # per calendar month (the trial: in total)
    coaching: bool  # AI coaching and drills on each report
    progress: bool  # progress over time (history chart)
    events: bool  # enter the monthly challenge
    trial_days: int | None = None
    training: bool = False  # Main: AI weekly training plans
    rooms: bool = False  # Main: run group rooms as a coach (players join rooms on any plan)


PLANS: dict[str, Plan] = {
    "trial": Plan("trial", "Free trial", analyses=3, coaching=True, progress=False, events=False, trial_days=7),
    "skill": Plan("skill", "Skill Analysis", analyses=20, coaching=False, progress=True, events=False),
    "coach": Plan("coach", "AI Coach", analyses=20, coaching=True, progress=True, events=False, training=True),
    "events": Plan("events", "Events", analyses=5, coaching=False, progress=False, events=True),
    # Main (Global) only: the brief's Coach plan for teams and academies.
    "team": Plan("team", "Coach", analyses=50, coaching=True, progress=True, events=True, training=True, rooms=True),
}

GUEST_DAILY_ANALYSES = 20  # the demo account is shared by every visitor


def plan_of(user: User) -> Plan:
    return PLANS.get(user.plan, PLANS["trial"])


def _aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)  # SQLite returns naive datetimes


def trial_expired(user: User) -> bool:
    plan = plan_of(user)
    if plan.trial_days is None or user.is_guest:
        return False
    return datetime.now(timezone.utc) > _aware(user.plan_started_at) + timedelta(days=plan.trial_days)


def period_start(user: User) -> datetime:
    now = datetime.now(timezone.utc)
    if user.is_guest:
        return now.replace(hour=0, minute=0, second=0, microsecond=0)
    if plan_of(user).trial_days is not None:
        return _aware(user.plan_started_at)
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def used_analyses(db: Session, user: User) -> int:
    """Analyses that count against the allowance: your own uploads in this period that didn't fail or get rejected
    by the quality check (a video you're asked to re-film doesn't use up your allowance; samples are free)."""
    return db.scalar(
        select(func.count(Analysis.id)).where(
            Analysis.user_id == user.id,
            Analysis.source == "upload",
            Analysis.status.in_(("queued", "processing", "done")),
            Analysis.created_at >= period_start(user),
        )
    ) or 0


def allowance(db: Session, user: User) -> dict:
    plan = plan_of(user)
    limit = GUEST_DAILY_ANALYSES if user.is_guest else plan.analyses
    used = used_analyses(db, user)
    expired = trial_expired(user)
    return {
        "plan": plan.id,
        "plan_name": plan.name,
        "limit": limit,
        "used": used,
        "remaining": 0 if expired else max(0, limit - used),
        "period": "today" if user.is_guest else ("trial" if plan.trial_days else "month"),
        "trial_expired": expired,
        "features": {"coaching": plan.coaching, "progress": plan.progress, "events": plan.events,
                     "training": plan.training, "rooms": plan.rooms},
    }
