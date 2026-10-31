"""Badges (Main edition gamification). Each badge is a rule over the player's own data; `award` checks them all,
stores the newly earned ones and sends a notification ("celebrate small wins", from the brief). It is cheap, so it
runs after anything that can earn one (a finished analysis, a test, a task) and when badges are listed."""

from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..models import Analysis, Assessment, Badge, RoomMember, Submission, TrainingPlan, User
from .analyses import notify

BADGES: dict[str, dict] = {
    "first_analysis": {"name": "First touch", "text": "Your first video analysed.", "icon": "play"},
    "club_20": {"name": "20 Club", "text": "20 or more touches in one video.", "icon": "flame"},
    "club_40": {"name": "40 Club", "text": "40 or more touches in one video.", "icon": "rocket"},
    "most_improved": {"name": "Most improved", "text": "Your best is 5+ touches above your first video.", "icon": "trending"},
    "regular": {"name": "Regular", "text": "5 analysed sessions in 30 days.", "icon": "calendar"},
    "full_analysis": {"name": "Full analysis", "text": "Mindset, reaction and logic tests all done.", "icon": "brain"},
    "lightning": {"name": "Lightning", "text": "Reaction test median under 300 ms.", "icon": "zap"},
    "sharp_mind": {"name": "Sharp mind", "text": "7 or more of 8 logic puzzles right.", "icon": "puzzle"},
    "squad_player": {"name": "Squad player", "text": "Joined a coach's room.", "icon": "users"},
    "task_done": {"name": "On the clock", "text": "Handed in a coach's task.", "icon": "check"},
    "committed": {"name": "Committed", "text": "Finished every session in a weekly plan.", "icon": "medal"},
}


def _aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def earned_codes(db: Session, user: User) -> set[str]:
    """Which badges the player's data qualifies for right now."""
    done = list(db.scalars(select(Analysis).where(Analysis.user_id == user.id, Analysis.status == "done")
                           .order_by(Analysis.created_at)))
    counts = [a.touches or 0 for a in done]
    out: set[str] = set()
    if done:
        out.add("first_analysis")
        if max(counts) >= 20:
            out.add("club_20")
        if max(counts) >= 40:
            out.add("club_40")
        if max(counts) - counts[0] >= 5:
            out.add("most_improved")
        month_ago = datetime.now(timezone.utc) - timedelta(days=30)
        if sum(1 for a in done if _aware(a.created_at) >= month_ago) >= 5:
            out.add("regular")

    tests = {a.kind: a for a in db.scalars(select(Assessment).where(Assessment.user_id == user.id)
                                           .order_by(Assessment.created_at))}
    if {"mindset", "reaction", "logic"} <= tests.keys():
        out.add("full_analysis")
    reactions = db.scalars(select(Assessment).where(Assessment.user_id == user.id, Assessment.kind == "reaction"))
    if any(r.detail.get("median_ms", 999) < 300 for r in reactions):
        out.add("lightning")
    logics = db.scalars(select(Assessment).where(Assessment.user_id == user.id, Assessment.kind == "logic"))
    if any(r.detail.get("correct", 0) >= 7 for r in logics):
        out.add("sharp_mind")

    if db.scalar(select(func.count(RoomMember.id)).where(RoomMember.user_id == user.id)):
        out.add("squad_player")
    if db.scalar(select(func.count(Submission.id)).where(Submission.user_id == user.id)):
        out.add("task_done")
    for plan in db.scalars(select(TrainingPlan).where(TrainingPlan.user_id == user.id)):
        total = sum(len(d["sessions"]) for d in plan.plan.get("days", []))
        if total and len(set(plan.done or [])) >= total:
            out.add("committed")
            break
    return out


def award(db: Session, user: User) -> list[str]:
    """Store newly earned badges and notify the player. Returns the new codes. The caller commits."""
    if user.is_seed:
        return []
    have = set(db.scalars(select(Badge.code).where(Badge.user_id == user.id)))
    new = sorted(earned_codes(db, user) - have)
    for code in new:
        db.add(Badge(user_id=user.id, code=code))
        notify(db, user, f"Badge earned: {BADGES[code]['name']}. {BADGES[code]['text']}", "/challenges", kind="badges")
    return new


def badge_list(db: Session, user: User) -> list[dict]:
    have = {b.code: b.earned_at for b in db.scalars(select(Badge).where(Badge.user_id == user.id))}
    return [{"code": code, **info, "earned_at": have[code].isoformat() if code in have else None}
            for code, info in BADGES.items()]
