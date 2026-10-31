"""Main (Global) edition, player side: physical profile, full card, tests, badges, training plans and the
overview the command-centre dashboard opens with."""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..dependencies import get_current_user, get_db
from ..models import Assessment, PlayerProfile, TrainingPlan, User
from ..plans import plan_of
from ..schemas import LogicIn, MindsetIn, PhysicalIn, ReactionIn, SessionDoneIn
from ..services import assessments as tests
from ..services import training
from ..services.analyses import notify
from ..services.badges import award, badge_list
from ..services.card import done_analyses, full_card, readiness
from .rooms import my_open_tasks

router = APIRouter()

TRAINING_PLANS_PER_DAY = 5  # each one is a Gemini call


def _profile(db: Session, user: User) -> PlayerProfile:
    p = db.get(PlayerProfile, user.id)
    if p is None:
        p = PlayerProfile(user_id=user.id, prefs={"tasks": True, "reports": True, "badges": True})
        db.add(p)
        db.flush()
    return p


@router.get("/profile")
def get_profile(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    p = db.get(PlayerProfile, user.id)
    keys = ("height_cm", "weight_kg", "birth_year", "body_type", "shirt_number")
    return {**{k: getattr(p, k) if p else None for k in keys},
            "prefs": (p.prefs if p and p.prefs else {"tasks": True, "reports": True, "badges": True})}


@router.put("/profile")
def put_profile(body: PhysicalIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.is_guest:
        raise HTTPException(status_code=403, detail="The demo profile can't be changed. Sign up to make your own.")
    p = _profile(db, user)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(p, field, value)
    db.commit()
    return get_profile(user, db)


@router.get("/card")
def card(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = full_card(db, user)
    return {**c, "readiness": readiness(c)}


@router.get("/overview")
def overview(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Everything the Main dashboard needs beyond /me/dashboard, in one request (the free API wakes up slowly)."""
    c = full_card(db, user)
    award(db, user)
    tasks = my_open_tasks(db, user)  # may add reminder notifications
    db.commit()
    plan = db.scalars(select(TrainingPlan).where(TrainingPlan.user_id == user.id)
                      .order_by(TrainingPlan.created_at.desc())).first()
    total = sum(len(d["sessions"]) for d in plan.plan["days"]) if plan else 0
    badges = badge_list(db, user)
    done = done_analyses(db, user)
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    return {
        "card": {**c, "readiness": readiness(c)},
        "badges": {"earned": sum(1 for b in badges if b["earned_at"]), "total": len(badges),
                   "latest": sorted((b for b in badges if b["earned_at"]), key=lambda b: b["earned_at"], reverse=True)[:3]},
        "training": {"id": plan.id, "goal_touches": plan.plan.get("goal_touches"), "done": len(set(plan.done or [])),
                     "total": total, "created_at": plan.created_at.isoformat()} if plan else None,
        "tasks": tasks[:4],
        "week": {"sessions": sum(1 for a in done if (a.created_at if a.created_at.tzinfo else
                                                     a.created_at.replace(tzinfo=timezone.utc)) >= week_ago)},
    }


# ---- Tests ----

@router.get("/assessments")
def assessments(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.scalars(select(Assessment).where(Assessment.user_id == user.id).order_by(Assessment.created_at.desc()).limit(30))
    return [{"id": a.id, "kind": a.kind, "score": a.score, "detail": a.detail, "created_at": a.created_at.isoformat()}
            for a in rows]


@router.get("/assessments/mindset")
def mindset_questions():
    return {"questions": tests.questionnaire(), "scale": ["Strongly disagree", "Disagree", "Not sure", "Agree", "Strongly agree"]}


def _save(db: Session, user: User, kind: str, result: dict) -> dict:
    a = Assessment(user_id=user.id, kind=kind, score=result["score"], detail=result["detail"])
    db.add(a)
    db.flush()
    new = award(db, user)
    db.commit()
    return {"id": a.id, "kind": kind, "score": a.score, "detail": a.detail, "new_badges": new}


def _score(fn, *args) -> dict:
    try:
        return fn(*args)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e)) from None


@router.post("/assessments/mindset", status_code=201)
def submit_mindset(body: MindsetIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _save(db, user, "mindset", _score(tests.score_mindset, body.answers))


@router.post("/assessments/reaction", status_code=201)
def submit_reaction(body: ReactionIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _save(db, user, "reaction", _score(tests.score_reaction, body.times_ms, body.false_starts))


@router.get("/assessments/logic")
def logic_test(user: User = Depends(get_current_user)):
    return tests.new_logic_test()


@router.post("/assessments/logic", status_code=201)
def submit_logic(body: LogicIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _save(db, user, "logic", _score(tests.score_logic, body.token, body.answers, body.seconds))


# ---- Badges ----

@router.get("/badges")
def badges(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    award(db, user)
    db.commit()
    return badge_list(db, user)


# ---- Training plans ----

def _plan_out(p: TrainingPlan) -> dict:
    return {"id": p.id, **p.plan, "done": sorted(set(p.done or [])), "created_at": p.created_at.isoformat()}


@router.get("/training")
def current_plan(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    locked = not (plan_of(user).training or user.is_guest)
    p = db.scalars(select(TrainingPlan).where(TrainingPlan.user_id == user.id)
                   .order_by(TrainingPlan.created_at.desc())).first()
    return {"locked": locked, "plan": _plan_out(p) if p else None, "has_analysis": bool(done_analyses(db, user))}


@router.post("/training", status_code=201)
def new_plan(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not (plan_of(user).training or user.is_guest):
        raise HTTPException(status_code=402, detail="Weekly training plans come with the AI Coach and Coach plans.")
    done = done_analyses(db, user)
    if not done:
        raise HTTPException(status_code=409, detail="Analyse a video first: the plan is built from your numbers.")
    day_ago = datetime.now(timezone.utc) - timedelta(days=1)
    made = db.scalar(select(func.count(TrainingPlan.id)).where(TrainingPlan.user_id == user.id,
                                                               TrainingPlan.created_at >= day_ago)) or 0
    if made >= TRAINING_PLANS_PER_DAY and not user.is_guest:
        raise HTTPException(status_code=429, detail="You've made 5 plans today. Try again tomorrow.")
    f = training.plan_facts(done[0].report, max(a.touches or 0 for a in done), full_card(db, user))
    p = TrainingPlan(user_id=user.id, plan={**training.generate(f), "week_of": training.week_of(), "facts": f}, done=[])
    db.add(p)
    notify(db, user, f"Your training week is ready. Goal: {f['week_goal_touches']} touches.", "/training")
    db.commit()
    db.refresh(p)
    return _plan_out(p)


@router.post("/training/{plan_id}/sessions")
def mark_session(plan_id: int, body: SessionDoneIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    p = db.get(TrainingPlan, plan_id)
    if p is None or p.user_id != user.id:
        raise HTTPException(status_code=404, detail="Plan not found")
    valid = {f"d{d['day']}s{i}" for d in p.plan["days"] for i in range(len(d["sessions"]))}
    if body.session not in valid:
        raise HTTPException(status_code=422, detail="Unknown session")
    done = set(p.done or [])
    done.add(body.session) if body.done else done.discard(body.session)
    p.done = sorted(done)  # a new list, so SQLAlchemy sees the JSON change
    new = award(db, user)
    db.commit()
    return {**_plan_out(p), "new_badges": new}

