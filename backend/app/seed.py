"""Demo data. Re-runnable: `python -m app.seed` (run on every deploy).

- "Demo Player": the shared guest account behind "Try the demo". Eight past juggling sessions over eight weeks that
  show steady progress, plus one video the quality check rejected, with coaching and notifications. Anything
  visitors add to the demo account is removed after a day.
- Fictional leaderboard players for the monthly challenge (names only, no photos).

Seeded reports are synthetic but shaped exactly like real ones (analysis/report.py, schema_version 1), and are
marked source="seed" so they're never confused with real analyses.
"""

import random
from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy import delete, select

from .config import settings
from .database import Base, SessionLocal, engine
from .models import Analysis, Notification, User
from .security import hash_password
from .services.coaching import rule_based

ASSETS = Path(__file__).parent / "seed_assets"

# (weeks ago, touches, rhythm cv, arc height in ball sizes, seconds, thumbnail clip, title)
DEMO_SESSIONS = [
    (8, 11, 0.71, 3.6, 20, "42524", "First session back"),
    (7, 14, 0.66, 3.2, 22, "42524", "Evening juggling"),
    (6, 13, 0.62, 3.4, 18, "43490", "Windy pitch"),
    (5, 18, 0.55, 2.9, 25, "43490", "Both feet focus"),
    (4, 21, 0.49, 2.6, 26, "43487", "After training"),
    (3, 24, 0.44, 2.4, 28, "43490", "Knee-height drill"),
    (2, 23, 0.41, 2.3, 27, "43487", "Weak-foot work"),
    (1, 29, 0.36, 2.1, 30, "43487", "Best one yet"),
]

LEADERBOARD = [
    ("Kwame Asante", "Ghana", 64), ("Amara Nwosu", "Nigeria", 51), ("Thabo Mokoena", "South Africa", 47),
    ("Wanjiru Kamau", "Kenya", 42), ("Moussa Diallo", "Senegal", 38), ("Chipo Banda", "Zambia", 33),
    ("Tendai Moyo", "Zimbabwe", 26), ("Fatou Ndiaye", "Senegal", 22), ("Abebe Tesfaye", "Ethiopia", 17),
]


def make_report(touches: int, cv: float, arc: float, seconds: float, rng: random.Random,
                verdict: str = "ok") -> dict:
    """A report shaped like analysis/report.py's, with touch times spread evenly with jitter."""
    start, end = 0.8, seconds - 1.0
    gaps = [max(0.3, rng.gauss(1.0, cv * 0.8)) for _ in range(touches - 1)]
    scale = (end - start) / sum(gaps) if gaps else 0
    times, t = [round(start, 2)], start
    for g in gaps:  # jittered gaps, stretched to fill the clip: exactly `touches` touches
        t += g * scale
        times.append(round(t, 2))
    active = times[-1] - times[0]
    certain = max(1, touches - rng.randint(1, 3))
    issues = []
    if verdict == "reject":
        issues = [{"code": "camera_moving", "message": "The camera moved. Prop the phone up so it stays still."}]
    return {
        "schema_version": 1, "model_version": "juggling-0.1", "skill": "juggling",
        "video": {"duration_s": float(seconds), "fps": 30.0, "width": 854, "height": 480},
        "quality": {"verdict": verdict, "issues": issues, "ball_seen_pct": rng.randint(52, 74),
                    "camera_moving_pct": 71 if verdict == "reject" else rng.randint(0, 6),
                    "ball_size_pct": round(rng.uniform(3.0, 7.0), 1)},
        "metrics": {
            "touches": touches, "touches_range": [certain, touches + rng.randint(1, 2)], "touches_certain": certain,
            "touch_times_s": times, "touches_per_minute": round(60 * (touches - 1) / active, 1) if active else None,
            "interval_s": {"mean": round(active / max(1, touches - 1), 2), "cv": cv},
            "arc_height_balls": {"mean": arc, "cv": round(rng.uniform(0.3, 0.5), 2)},
        },
        "notes": ["Touch count is measured from the ball's path; touches the camera couldn't see are covered by the "
                  "range.", "Rhythm and arc height are approximate."],
        "timing": {"analysis_s": round(seconds * 1.4, 1)},
    }


def _user(db, email: str, **fields) -> User:
    user = db.scalar(select(User).where(User.email == email))
    if user is None:
        user = User(email=email, password_hash=hash_password(f"seed-{random.random()}"), **fields)
        db.add(user)
    else:
        for k, v in fields.items():
            setattr(user, k, v)
    db.flush()
    return user


def seed():
    Base.metadata.create_all(bind=engine)
    rng = random.Random(7)  # same demo every time
    now = datetime.now(timezone.utc)
    thumbs = {p.stem.split("-")[1]: p.read_bytes() for p in ASSETS.glob("thumb-*.jpg")}
    db = SessionLocal()
    try:
        demo = _user(db, settings.demo_email, name="Demo Player", is_guest=True, plan="coach", age=16,
                     position="Midfielder", favourite_team="Lagos City Youth", country="Nigeria",
                     preferred_foot="Right")
        # Reset: seeded reports and notifications are recreated; visitors' uploads older than a day go.
        db.execute(delete(Analysis).where(Analysis.user_id == demo.id, Analysis.source == "seed"))
        db.execute(delete(Analysis).where(Analysis.user_id == demo.id, Analysis.created_at < now - timedelta(days=1)))
        db.execute(delete(Notification).where(Notification.user_id == demo.id))

        for weeks, touches, cv, arc, secs, clip, title in DEMO_SESSIONS:
            report = make_report(touches, cv, arc, secs, rng)
            when = now - timedelta(weeks=weeks, hours=rng.randint(0, 48))
            db.add(Analysis(user_id=demo.id, title=title, source="seed", status="done", stage="done",
                            report=report, coaching=rule_based(report), touches=report["metrics"]["touches"],
                            thumbnail=thumbs.get(clip), created_at=when, finished_at=when))
        rejected = make_report(9, 0.8, 3.9, 15, rng, verdict="reject")
        when = now - timedelta(weeks=5, days=3)
        db.add(Analysis(user_id=demo.id, title="Filmed while walking", source="seed", status="rejected", stage="done",
                        report=rejected, touches=rejected["metrics"]["touches"], thumbnail=thumbs.get("43513"),
                        created_at=when, finished_at=when))
        for text, link, hours in [
            ("Your report for “Best one yet” is ready: 29 touches.", "/reports", 170),
            ("New personal best! 29 touches, up 6 on last week.", "/dashboard", 169),
            (f"The {now:%B} Touch Challenge is open. Your best score this month counts.", "/events", 30),
        ]:
            db.add(Notification(user_id=demo.id, text=text, link=link, created_at=now - timedelta(hours=hours)))

        for i, (name, country, best) in enumerate(LEADERBOARD):
            email = f"player{i + 1}@seed.pitchiq.app"
            p = _user(db, email, name=name, is_seed=True, plan="events", country=country)
            db.execute(delete(Analysis).where(Analysis.user_id == p.id))
            report = make_report(best, round(rng.uniform(0.25, 0.6), 2), round(rng.uniform(1.6, 3.0), 1),
                                 max(20, best * 0.55), rng)
            when = now - timedelta(days=rng.randint(1, 20))
            db.add(Analysis(user_id=p.id, title="Challenge entry", source="seed", status="done", stage="done",
                            report=report, touches=report["metrics"]["touches"], created_at=when, finished_at=when))
        db.commit()
        print(f"Seeded demo player ({len(DEMO_SESSIONS) + 1} reports) and {len(LEADERBOARD)} leaderboard players.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
