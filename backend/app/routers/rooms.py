"""Coach rooms (Main edition, the brief's Coach plan): a coach creates a team or academy-trial room, players join
with a code that expires, the coach sets video tasks with deadlines, players hand in analysed videos, the coach
scores them with a note. Roles: the coach sees everything in the room; a player sees their own tasks, the
leaderboard and the team's milestones, never other players' reports."""

import secrets
from collections import defaultdict
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..dependencies import get_current_user, get_db
from ..models import Analysis, Notification, Room, RoomMember, Submission, Task, User
from ..plans import plan_of
from ..schemas import JoinIn, ReviewIn, RoomIn, ScoutIn, SubmitIn, TaskIn
from ..services.analyses import notify, wants
from ..services.badges import award
from ..services.card import full_card
from .analyses import detail, summary

router = APIRouter()

CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"  # no 0/O, 1/I/L: codes are read aloud and typed on phones
CODE_DAYS = 7
REMIND_HOURS = 48
MAX_ROOMS = 10


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _new_code(db: Session) -> str:
    while True:
        code = "".join(secrets.choice(CODE_ALPHABET) for _ in range(6))
        if not db.scalar(select(Room.id).where(Room.join_code == code)):
            return code


def _room(db: Session, room_id: int) -> Room:
    r = db.get(Room, room_id)
    if r is None:
        raise HTTPException(status_code=404, detail="Room not found")
    return r


def _member(db: Session, room: Room, user_id: int) -> RoomMember | None:
    return db.scalar(select(RoomMember).where(RoomMember.room_id == room.id, RoomMember.user_id == user_id))


def _as_coach(db: Session, room_id: int, user: User) -> Room:
    r = _room(db, room_id)
    if r.coach_id != user.id:
        raise HTTPException(status_code=403, detail="Only the room's coach can do that.")
    return r


def _display(u: User) -> str:
    parts = u.name.split()
    return f"{parts[0]} {parts[-1][0]}." if len(parts) > 1 else parts[0]


def _tasks_for(room: Room, user_id: int) -> list[Task]:
    return [t for t in room.tasks if t.assignee_id in (None, user_id)]


def _done_since(db: Session, user_ids: list[int], since: datetime | None = None) -> list[Analysis]:
    if not user_ids:
        return []
    q = select(Analysis).where(Analysis.user_id.in_(user_ids), Analysis.status == "done", Analysis.source != "sample")
    if since is not None:
        q = q.where(Analysis.created_at >= since)
    return list(db.scalars(q.order_by(Analysis.created_at)))


# ---- Lists, create, join ----

def _room_brief(r: Room, role: str) -> dict:
    return {"id": r.id, "name": r.name, "kind": r.kind, "description": r.description, "role": role,
            "players": len(r.members), "tasks": len(r.tasks)}


@router.get("")
def my_rooms(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    coaching = list(db.scalars(select(Room).where(Room.coach_id == user.id).order_by(Room.created_at.desc())))
    member_of = list(db.scalars(select(Room).join(RoomMember).where(RoomMember.user_id == user.id)))
    out = []
    for r in coaching:
        out.append({**_room_brief(r, "coach"), "coach": user.name})
    for r in member_of:
        coach = db.get(User, r.coach_id)
        open_tasks = [t for t in _tasks_for(r, user.id)
                      if not any(s.user_id == user.id for s in t.submissions) and _aware(t.due_at) > _now()]
        out.append({**_room_brief(r, "player"), "coach": coach.name if coach else "Coach", "open_tasks": len(open_tasks)})
    return {"rooms": out, "can_create": plan_of(user).rooms}


@router.post("", status_code=201)
def create_room(body: RoomIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not plan_of(user).rooms:
        raise HTTPException(status_code=402, detail="Rooms come with the Coach plan. Switch plans in Settings (test mode).")
    if len(db.scalars(select(Room.id).where(Room.coach_id == user.id)).all()) >= MAX_ROOMS:
        raise HTTPException(status_code=409, detail=f"You can run up to {MAX_ROOMS} rooms.")
    r = Room(coach_id=user.id, name=body.name.strip(), kind=body.kind, description=body.description,
             join_code=_new_code(db), code_expires_at=_now() + timedelta(days=CODE_DAYS),
             criteria={"min_touches": body.min_touches} if body.kind == "academy" and body.min_touches else None)
    db.add(r)
    db.commit()
    return {"id": r.id, "join_code": r.join_code}


@router.post("/join")
def join(body: JoinIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    r = db.scalar(select(Room).where(Room.join_code == body.code.strip().upper()))
    if r is None:
        raise HTTPException(status_code=404, detail="No room has that code. Check it with your coach.")
    if _aware(r.code_expires_at) < _now():
        raise HTTPException(status_code=410, detail="That code has expired. Ask your coach for a new one.")
    if r.coach_id == user.id:
        raise HTTPException(status_code=409, detail="You're this room's coach.")
    if _member(db, r, user.id) is None:
        db.add(RoomMember(room_id=r.id, user_id=user.id))
        coach = db.get(User, r.coach_id)
        if coach:
            notify(db, coach, f"{user.name} joined {r.name}.", f"/rooms/{r.id}")
        db.flush()
        award(db, user)
        db.commit()
    return {"id": r.id, "name": r.name}


# ---- One room ----

def _leaderboard(db: Session, room: Room, days: int) -> list[dict]:
    ids = [m.user_id for m in room.members]
    best: dict[int, int] = {}
    for a in _done_since(db, ids, _now() - timedelta(days=days)):
        best[a.user_id] = max(best.get(a.user_id, 0), a.touches or 0)
    names = {m.user_id: _display(m.user) for m in room.members}
    rows = sorted(best.items(), key=lambda kv: -kv[1])
    return [{"rank": i + 1, "user_id": uid, "name": names[uid], "touches": t} for i, (uid, t) in enumerate(rows)]


def _milestones(db: Session, room: Room) -> list[dict]:
    """Collective goals for the month (the brief's gamification: 'goals the team reaches together')."""
    month_start = _now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    ids = [m.user_id for m in room.members]
    month = _done_since(db, ids, month_start)
    handed_in = sum(1 for t in room.tasks for s in t.submissions if _aware(s.created_at) >= month_start)
    active_week = {a.user_id for a in month if _aware(a.created_at) >= _now() - timedelta(days=7)}
    return [
        {"label": "Touches together this month", "value": sum(a.touches or 0 for a in month), "target": 500},
        {"label": "Tasks handed in this month", "value": handed_in, "target": 20},
        {"label": "Players active this week", "value": len(active_week), "target": max(1, len(ids))},
    ]


def _weekly_average(analyses: list[Analysis], weeks: int = 6) -> list[dict]:
    """Team average touches per week (each player's best that week, averaged)."""
    start = (_now() - timedelta(days=_now().weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    out = []
    for w in range(weeks - 1, -1, -1):
        lo, hi = start - timedelta(weeks=w), start - timedelta(weeks=w - 1)
        best: dict[int, int] = defaultdict(int)
        for a in analyses:
            if lo <= _aware(a.created_at) < hi:
                best[a.user_id] = max(best[a.user_id], a.touches or 0)
        out.append({"week": lo.date().isoformat(), "average": round(sum(best.values()) / len(best), 1) if best else None,
                    "players": len(best)})
    return out


def _alerts(room: Room, weekly: list[dict], last_seen: dict[int, datetime]) -> list[dict]:
    """Automatic team insights for the coach: average dropping, players gone quiet, overdue tasks."""
    out = []
    have = [w for w in weekly[:-1] if w["average"] is not None]  # complete weeks only: this week is still going
    if len(have) >= 2 and have[-1]["average"] < have[-2]["average"]:
        out.append({"level": "warn", "text": f"Team average fell from {have[-2]['average']} to {have[-1]['average']} "
                                             "touches week on week."})
    elif len(have) >= 2 and have[-1]["average"] > have[-2]["average"]:
        out.append({"level": "good", "text": f"Team average rose from {have[-2]['average']} to {have[-1]['average']} "
                                             "touches week on week."})
    quiet = [_display(m.user) for m in room.members
             if m.user_id not in last_seen or last_seen[m.user_id] < _now() - timedelta(days=14)]
    if quiet:
        names = ", ".join(quiet[:4]) + (f" and {len(quiet) - 4} more" if len(quiet) > 4 else "")
        out.append({"level": "warn", "text": f"No videos in 14 days: {names}" + ("" if names.endswith(".") else ".")})
    for t in room.tasks:
        expected = 1 if t.assignee_id else len(room.members)
        if _aware(t.due_at) < _now() and len(t.submissions) < expected:
            out.append({"level": "warn", "text": f"“{t.title}” is past its deadline with "
                                                 f"{expected - len(t.submissions)} hand-ins missing."})
    return out


def _task_out(db: Session, t: Task, room: Room, for_user: int | None) -> dict:
    subs = [s for s in t.submissions if for_user is None or s.user_id == for_user]
    assignee = db.get(User, t.assignee_id) if t.assignee_id else None
    return {
        "id": t.id, "title": t.title, "notes": t.notes, "skill": t.skill, "target_touches": t.target_touches,
        "due_at": _aware(t.due_at).isoformat(), "overdue": _aware(t.due_at) < _now(),
        "assignee": {"id": assignee.id, "name": assignee.name} if assignee else None,
        "expected": 1 if t.assignee_id else len(room.members),
        "submissions": [{
            "id": s.id, "user_id": s.user_id, "name": db.get(User, s.user_id).name,
            "analysis": summary(s.analysis) if s.analysis else None,
            "score": s.coach_score, "note": s.coach_note, "created_at": _aware(s.created_at).isoformat(),
            "reviewed": s.reviewed_at is not None,
            "met_target": bool(t.target_touches and s.analysis and (s.analysis.touches or 0) >= t.target_touches),
        } for s in subs],
    }


@router.get("/{room_id}")
def get_room(room_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    r = _room(db, room_id)
    is_coach = r.coach_id == user.id
    if not is_coach and _member(db, r, user.id) is None:
        raise HTTPException(status_code=404, detail="Room not found")
    coach = db.get(User, r.coach_id)
    base = {"id": r.id, "name": r.name, "kind": r.kind, "description": r.description, "criteria": r.criteria,
            "coach": coach.name if coach else "Coach", "role": "coach" if is_coach else "player",
            "leaderboard": {"week": _leaderboard(db, r, 7), "month": _leaderboard(db, r, 30)},
            "milestones": _milestones(db, r)}
    if not is_coach:
        tasks = sorted(_tasks_for(r, user.id), key=lambda t: _aware(t.due_at))
        return {**base, "players": [_display(m.user) for m in r.members],
                "tasks": [_task_out(db, t, r, user.id) for t in tasks]}

    ids = [m.user_id for m in r.members]
    analyses = _done_since(db, ids)
    by_player: dict[int, list[Analysis]] = defaultdict(list)
    for a in analyses:
        by_player[a.user_id].append(a)
    month_ago = _now() - timedelta(days=30)
    last_seen = {uid: _aware(rows[-1].created_at) for uid, rows in by_player.items()}
    min_touches = (r.criteria or {}).get("min_touches")
    members = []
    for m in r.members:
        rows = by_player.get(m.user_id, [])
        mine = _tasks_for(r, m.user_id)
        handed = sum(1 for t in mine if any(s.user_id == m.user_id for s in t.submissions))
        best = max((a.touches or 0 for a in rows), default=None)
        members.append({
            "user_id": m.user_id, "name": m.user.name, "position": m.user.position, "country": m.user.country,
            "joined_at": _aware(m.joined_at).isoformat(), "best": best,
            "last": rows[-1].touches if rows else None,
            "first": rows[0].touches if rows else None,
            "sessions_30d": sum(1 for a in rows if _aware(a.created_at) >= month_ago),
            "last_active": last_seen[m.user_id].isoformat() if m.user_id in last_seen else None,
            "tasks_done": handed, "tasks_total": len(mine),
            "meets_criteria": (best or 0) >= min_touches if min_touches else None,
            "scouting_note": m.scouting_note,
        })
    weekly = _weekly_average(analyses)
    expected = sum(1 if t.assignee_id else len(ids) for t in r.tasks)
    handed_in = sum(len(t.submissions) for t in r.tasks)
    bests = [m["best"] for m in members if m["best"] is not None]
    return {
        **base,
        "join_code": r.join_code, "code_expires_at": _aware(r.code_expires_at).isoformat(),
        "code_expired": _aware(r.code_expires_at) < _now(),
        "members": sorted(members, key=lambda m: -(m["best"] or 0)),
        "tasks": [_task_out(db, t, r, None) for t in sorted(r.tasks, key=lambda t: _aware(t.due_at), reverse=True)],
        "team": {
            "players": len(ids),
            "average_best": round(sum(bests) / len(bests), 1) if bests else None,
            "completion": round(100 * handed_in / expected) if expected else None,
            "weekly": weekly,
            "top": [{"name": m["name"], "best": m["best"]} for m in members if m["best"] is not None][:3],
        },
        "alerts": _alerts(r, weekly, last_seen),
    }


@router.delete("/{room_id}", status_code=204)
def delete_room(room_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.delete(_as_coach(db, room_id, user))
    db.commit()
    return Response(status_code=204)


@router.post("/{room_id}/code")
def new_code(room_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    r = _as_coach(db, room_id, user)
    r.join_code, r.code_expires_at = _new_code(db), _now() + timedelta(days=CODE_DAYS)
    db.commit()
    return {"join_code": r.join_code, "code_expires_at": _aware(r.code_expires_at).isoformat()}


@router.post("/{room_id}/leave", status_code=204)
def leave(room_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    m = _member(db, _room(db, room_id), user.id)
    if m:
        db.delete(m)
        db.commit()
    return Response(status_code=204)


@router.delete("/{room_id}/members/{user_id}", status_code=204)
def remove_member(room_id: int, user_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    m = _member(db, _as_coach(db, room_id, user), user_id)
    if m is None:
        raise HTTPException(status_code=404, detail="Player not in this room")
    db.delete(m)
    db.commit()
    return Response(status_code=204)


@router.put("/{room_id}/members/{user_id}/note")
def scouting_note(room_id: int, user_id: int, body: ScoutIn, user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    m = _member(db, _as_coach(db, room_id, user), user_id)
    if m is None:
        raise HTTPException(status_code=404, detail="Player not in this room")
    m.scouting_note = body.note.strip() or None
    db.commit()
    return {"ok": True}


@router.get("/{room_id}/players/{user_id}")
def player_profile(room_id: int, user_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """The coach's view of one player: their card and reports (joining a room shares them with its coach)."""
    r = _as_coach(db, room_id, user)
    m = _member(db, r, user_id)
    if m is None:
        raise HTTPException(status_code=404, detail="Player not in this room")
    rows = db.scalars(select(Analysis).where(Analysis.user_id == user_id, Analysis.status.in_(("done", "rejected")))
                      .order_by(Analysis.created_at.desc()).limit(20))
    return {"card": full_card(db, m.user), "reports": [summary(a) for a in rows], "scouting_note": m.scouting_note,
            "tasks": [_task_out(db, t, r, user_id) for t in _tasks_for(r, user_id)]}


@router.get("/{room_id}/reports/{analysis_id}")
def player_report(room_id: int, analysis_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    r = _as_coach(db, room_id, user)
    a = db.get(Analysis, analysis_id)
    if a is None or _member(db, r, a.user_id) is None:
        raise HTTPException(status_code=404, detail="Report not found")
    return detail(a)


# ---- Tasks ----

@router.post("/{room_id}/tasks", status_code=201)
def create_task(room_id: int, body: TaskIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    r = _as_coach(db, room_id, user)
    due = _aware(body.due_at)
    if due < _now():
        raise HTTPException(status_code=422, detail="The deadline must be in the future.")
    if body.assignee_id is not None and _member(db, r, body.assignee_id) is None:
        raise HTTPException(status_code=422, detail="That player isn't in this room.")
    t = Task(room_id=r.id, assignee_id=body.assignee_id, title=body.title.strip(), notes=body.notes,
             target_touches=body.target_touches, due_at=due)
    db.add(t)
    db.flush()
    for m in r.members:
        if body.assignee_id in (None, m.user_id) and wants(db, m.user, "tasks"):
            notify(db, m.user, f"New task from {user.name}: {t.title} (due {due:%d %b}).", f"/rooms/{r.id}")
    db.commit()
    return {"id": t.id}


@router.delete("/{room_id}/tasks/{task_id}", status_code=204)
def delete_task(room_id: int, task_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    r = _as_coach(db, room_id, user)
    t = db.get(Task, task_id)
    if t is None or t.room_id != r.id:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(t)
    db.commit()
    return Response(status_code=204)


@router.post("/tasks/{task_id}/submit", status_code=201)
def submit(task_id: int, body: SubmitIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    t = db.get(Task, task_id)
    if t is None or _member(db, t.room, user.id) is None or t.assignee_id not in (None, user.id):
        raise HTTPException(status_code=404, detail="Task not found")
    a = db.get(Analysis, body.analysis_id)
    if a is None or a.user_id != user.id:
        raise HTTPException(status_code=404, detail="Report not found")
    if a.status != "done":
        raise HTTPException(status_code=422, detail="Hand in a video the quality check accepted.")
    existing = db.scalar(select(Submission).where(Submission.task_id == t.id, Submission.user_id == user.id))
    if existing:  # hand in a better video: replaces the old one and clears the old score
        existing.analysis_id, existing.coach_score, existing.coach_note, existing.reviewed_at = a.id, None, None, None
        existing.created_at = _now()
    else:
        db.add(Submission(task_id=t.id, user_id=user.id, analysis_id=a.id))
    coach = db.get(User, t.room.coach_id)
    if coach:
        notify(db, coach, f"{user.name} handed in “{t.title}”: {a.touches} touches.", f"/rooms/{t.room_id}")
    db.flush()
    award(db, user)
    db.commit()
    return {"ok": True}


@router.post("/submissions/{submission_id}/review")
def review(submission_id: int, body: ReviewIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    s = db.get(Submission, submission_id)
    if s is None or s.task.room.coach_id != user.id:
        raise HTTPException(status_code=404, detail="Submission not found")
    s.coach_score, s.coach_note, s.reviewed_at = body.score, (body.note or "").strip() or None, _now()
    player = db.get(User, s.user_id)
    if player and wants(db, player, "tasks"):
        notify(db, player, f"Coach feedback on “{s.task.title}”: {body.score}/100.", f"/rooms/{s.task.room_id}")
    db.commit()
    return {"ok": True}


# ---- Used by the player dashboard ----

def my_open_tasks(db: Session, user: User) -> list[dict]:
    """The player's tasks not yet handed in, soonest first. Tasks due within 48 hours get one reminder
    notification (the brief's auto-reminder); the caller commits."""
    rooms = db.scalars(select(Room).join(RoomMember).where(RoomMember.user_id == user.id))
    out = []
    for r in rooms:
        for t in _tasks_for(r, user.id):
            if any(s.user_id == user.id for s in t.submissions):
                continue
            due = _aware(t.due_at)
            soon = _now() <= due <= _now() + timedelta(hours=REMIND_HOURS)
            link = f"/rooms/{r.id}?task={t.id}"
            if soon and wants(db, user, "tasks") and not db.scalar(select(Notification.id).where(
                    Notification.user_id == user.id, Notification.link == link)):
                notify(db, user, f"Reminder: “{t.title}” is due {due:%a %d %b, %H:%M} UTC.", link)
            out.append({"id": t.id, "room_id": r.id, "room": r.name, "title": t.title, "due_at": due.isoformat(),
                        "overdue": due < _now(), "due_soon": soon, "target_touches": t.target_touches})
    return sorted(out, key=lambda x: x["due_at"])
