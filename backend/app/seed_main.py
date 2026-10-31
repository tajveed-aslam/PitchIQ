"""Main (Global) edition demo data, run by app/seed.py after the Lite demo.

- Demo Player gets a physical profile, the three tests, a training week with some sessions ticked and badges.
- "Demo Coach" (the second shared guest account, POST /auth/demo-coach) runs two rooms:
  a team squad of six fictional players plus the Demo Player, with tasks, hand-ins and reviews;
  and an academy trial with applicants checked against a touch bar, with scouting notes.
Fictional players are is_seed accounts (names only, no photos, can't log in). Everything is recreated on each run.
"""

import random
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select

from .models import (Analysis, Assessment, Badge, PlayerProfile, Room, RoomMember, Submission, Task,
                     TrainingPlan, User)
from .services import assessments as tests
from .services import training
from .services.badges import earned_codes
from .services.card import full_card
from .services.coaching import rule_based

DEMO_COACH_EMAIL = "demo-coach@pitchiq.app"

# name, country, position, weekly touch counts (oldest first; None = no video that week)
SQUAD = [
    ("Lucas Moreira", "Brazil", "Forward", [18, 22, 21, 26, 29, 33]),
    ("Sofia Lindqvist", "Sweden", "Midfielder", [15, 17, None, 20, 24, 25]),
    ("Daniel Okafor", "Nigeria", "Defender", [12, 12, 15, 14, 17, 19]),
    ("Mei Tanaka", "Japan", "Midfielder", [20, 24, 23, 27, None, 30]),
    ("Omar Haddad", "Jordan", "Forward", [9, 11, 14, None, None, None]),
    ("Ella Brennan", "Ireland", "Goalkeeper", [8, 10, 9, 13, 12, 16]),
]
APPLICANTS = [
    ("Mateo Rossi", "Italy", "Midfielder", 31, "Clean touch on both feet, keeps the ball below the knee. Invite to trial day."),
    ("Aisha Rahman", "UAE", "Forward", 27, "Quick feet, rhythm a little rushed. Second look in a month."),
    ("Noah Fischer", "Germany", "Defender", 18, None),
    ("Yuki Sato", "Japan", "Midfielder", 22, None),
]
THUMB_CLIPS = ["43487", "43490", "42524"]


def _seed_user(db, email: str, **fields) -> User:
    from .seed import _user
    return _user(db, email, **fields)


def _analysis(db, user: User, touches: int, when: datetime, rng: random.Random, thumbs: dict, title: str) -> Analysis:
    from .seed import make_report
    cv = round(max(0.22, 0.75 - touches * 0.012 + rng.uniform(-0.05, 0.05)), 2)
    arc = round(max(1.4, 3.8 - touches * 0.05 + rng.uniform(-0.2, 0.2)), 1)
    report = make_report(touches, cv, arc, max(15, round(touches * 0.75)), rng)
    a = Analysis(user_id=user.id, title=title, source="seed", status="done", stage="done", report=report,
                 coaching=rule_based(report), touches=touches, thumbnail=thumbs.get(rng.choice(THUMB_CLIPS)),
                 created_at=when, finished_at=when)
    db.add(a)
    db.flush()
    return a


def seed_main(db, demo: User, thumbs: dict, now: datetime):
    rng = random.Random(11)

    # ---- Demo Player: profile, tests, training week, badges ----
    profile = db.get(PlayerProfile, demo.id) or PlayerProfile(user_id=demo.id)
    profile.height_cm, profile.weight_kg, profile.birth_year = 174, 63, now.year - 16
    profile.body_type, profile.shirt_number = "Athletic", 8
    profile.prefs = {"tasks": True, "reports": True, "badges": True}
    db.merge(profile)
    for table in (Assessment, TrainingPlan, Badge):
        db.execute(delete(table).where(table.user_id == demo.id))
    answers = {"q1": 5, "q2": 2, "q3": 4, "q4": 2, "q5": 5, "q6": 1, "q7": 3, "q8": 3, "q9": 4, "q10": 3, "q11": 3, "q12": 3}
    m = tests.score_mindset(answers)
    db.add(Assessment(user_id=demo.id, kind="mindset", score=m["score"], detail=m["detail"], created_at=now - timedelta(days=12)))
    r = tests.score_reaction([291, 274, 318, 262, 287], 1)
    db.add(Assessment(user_id=demo.id, kind="reaction", score=r["score"], detail=r["detail"], created_at=now - timedelta(days=11)))
    db.add(Assessment(user_id=demo.id, kind="logic", score=75, detail={"correct": 6, "total": 8, "seconds": 142},
                      created_at=now - timedelta(days=11)))
    db.flush()
    done = list(db.scalars(select(Analysis).where(Analysis.user_id == demo.id, Analysis.status == "done")
                           .order_by(Analysis.created_at.desc())))
    f = training.plan_facts(done[0].report, max(a.touches or 0 for a in done), full_card(db, demo))
    plan = {**training.rule_based(f), "week_of": training.week_of(), "facts": f}
    db.add(TrainingPlan(user_id=demo.id, plan=plan, done=["d1s0", "d1s1", "d2s0", "d2s1", "d3s0"],
                        created_at=now - timedelta(days=2)))

    # ---- Demo Coach and rooms ----
    coach = _seed_user(db, DEMO_COACH_EMAIL, name="Demo Coach", is_guest=True, plan="team", country="United Kingdom",
                       edition="main")
    for old in db.scalars(select(Room).where(Room.coach_id == coach.id)):
        db.delete(old)  # ORM delete: members, tasks and hand-ins go with the room
    db.flush()

    team = Room(coach_id=coach.id, name="Riverside U16", kind="team", join_code="RIVER16",
                description="Under-16 squad. Two video tasks a week; hand in your best attempt.",
                code_expires_at=now + timedelta(days=7), created_at=now - timedelta(weeks=6))
    academy = Room(coach_id=coach.id, name="Northside Academy Trials", kind="academy", join_code="TRIAL26",
                   description="Open trial for the 2027 intake. Bar: 25 touches in one video.",
                   criteria={"min_touches": 25}, code_expires_at=now + timedelta(days=5),
                   created_at=now - timedelta(weeks=3))
    db.add_all([team, academy])
    db.flush()

    players: list[tuple[User, list[Analysis]]] = []
    for i, (name, country, position, weekly) in enumerate(SQUAD):
        u = _seed_user(db, f"squad{i + 1}@seed.pitchiq.app", name=name, is_seed=True, plan="trial", country=country,
                       position=position, edition="main")
        db.execute(delete(Analysis).where(Analysis.user_id == u.id))
        rows = []
        for w, touches in enumerate(weekly):
            if touches is not None:
                when = now - timedelta(weeks=len(weekly) - w, hours=-rng.randint(0, 72))
                rows.append(_analysis(db, u, touches, when, rng, thumbs, f"Week {w + 1} session"))
        db.add(RoomMember(room_id=team.id, user_id=u.id, joined_at=team.created_at + timedelta(days=i % 3)))
        players.append((u, rows))
    db.add(RoomMember(room_id=team.id, user_id=demo.id, joined_at=now - timedelta(weeks=5)))

    for i, (name, country, position, touches, note) in enumerate(APPLICANTS):
        u = _seed_user(db, f"trial{i + 1}@seed.pitchiq.app", name=name, is_seed=True, plan="trial", country=country,
                       position=position, edition="main")
        db.execute(delete(Analysis).where(Analysis.user_id == u.id))
        _analysis(db, u, touches, now - timedelta(days=rng.randint(2, 12)), rng, thumbs, "Trial video")
        db.add(RoomMember(room_id=academy.id, user_id=u.id, joined_at=now - timedelta(days=14), scouting_note=note))
    db.flush()

    # Tasks: one finished and reviewed, one open with some hand-ins, one due within two days.
    past = Task(room_id=team.id, title="Both feet: 20 touches", skill="juggling", target_touches=20,
                notes="Alternate feet every touch. Film from the side, whole body in frame.",
                due_at=now - timedelta(days=9), created_at=now - timedelta(days=16))
    current = Task(room_id=team.id, title="Knee-height control", skill="juggling", target_touches=25,
                   notes="Nothing above the knee. Quality over quantity.",
                   due_at=now + timedelta(days=4), created_at=now - timedelta(days=3))
    soon = Task(room_id=team.id, title="Weak-foot ladder, best run", skill="juggling", target_touches=15,
                notes="Hand in your longest run.", due_at=now + timedelta(hours=30), created_at=now - timedelta(days=1))
    db.add_all([past, current, soon])
    db.flush()
    reviews = [(85, "Great rhythm, keep the ball lower."), (70, "Good effort. Left foot needs more reps."),
               (60, "Rushed the last ten touches."), (90, "Excellent. Use this as your warm-up."), (None, None)]
    for (u, rows), (score, note) in zip(players, reviews):
        if rows:
            a = rows[-2] if len(rows) > 1 else rows[-1]
            db.add(Submission(task_id=past.id, user_id=u.id, analysis_id=a.id, coach_score=score, coach_note=note,
                              created_at=now - timedelta(days=10), reviewed_at=(now - timedelta(days=8)) if score else None))
    for u, rows in players[:3]:
        db.add(Submission(task_id=current.id, user_id=u.id, analysis_id=rows[-1].id, created_at=now - timedelta(days=1)))
    demo_best = max(done, key=lambda a: a.touches or 0)
    db.add(Submission(task_id=past.id, user_id=demo.id, analysis_id=demo_best.id, coach_score=80,
                      coach_note="Big jump from last month. Work on the weaker foot next.",
                      created_at=now - timedelta(days=10), reviewed_at=now - timedelta(days=8)))
    db.flush()
    # Badges without a notification each (the demo shouldn't open on a wall of "badge earned").
    for i, code in enumerate(sorted(earned_codes(db, demo))):
        db.add(Badge(user_id=demo.id, code=code, earned_at=now - timedelta(days=30 - 3 * i)))
    return coach

