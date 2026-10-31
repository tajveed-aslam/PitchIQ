"""The Main edition's full player card: measured skills, physical profile, mindset, reaction and logic.

Honesty rules, same as the rest of PitchIQ: a rating is only shown when something measured it. Skills the video
pipeline can't measure yet (dribbling, passing, shooting...) are listed as "not measured" instead of being guessed,
and the overall rating is the average of the measured skill ratings (the brief: "based on skill averages").
"""

from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Analysis, Assessment, PlayerProfile, User
from .assessments import TRAITS

SKILLS_LATER = [("DRI", "Dribbling"), ("PAS", "Passing"), ("SHO", "Shooting"), ("HEA", "Heading"), ("SPD", "Sprint speed")]


def done_analyses(db: Session, user: User) -> list[Analysis]:
    return list(db.scalars(select(Analysis).where(Analysis.user_id == user.id, Analysis.status == "done",
                                                  Analysis.report.is_not(None)).order_by(Analysis.created_at.desc())))


def latest_assessments(db: Session, user: User) -> dict[str, Assessment]:
    out: dict[str, Assessment] = {}
    for a in db.scalars(select(Assessment).where(Assessment.user_id == user.id).order_by(Assessment.created_at.desc())):
        out.setdefault(a.kind, a)
    return out


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


def _rating(x: float) -> int:
    return int(max(1, min(99, round(x))))


def full_card(db: Session, user: User) -> dict:
    done = done_analyses(db, user)
    simple = player_card(user, done)
    juggling = {a["key"]: a for a in simple["attributes"]}
    skills = [{"key": k, "label": juggling[k]["label"], "value": juggling[k]["value"], "measured_by": "video"}
              for k in ("TCH", "RHY", "CTL") if k in juggling]
    skills += [{"key": k, "label": label, "value": None, "measured_by": None} for k, label in SKILLS_LATER]
    measured = [s["value"] for s in skills if s["value"] is not None]

    tests = latest_assessments(db, user)
    mindset = tests.get("mindset")
    traits = [{"key": k, "label": label, "value": _rating(mindset.detail["traits"][k]) if mindset else None}
              for k, label in TRAITS.items()]
    reaction, logic = tests.get("reaction"), tests.get("logic")

    profile = db.get(PlayerProfile, user.id)
    age = (datetime.now(timezone.utc).year - profile.birth_year) if profile and profile.birth_year else user.age
    physical = {
        "height_cm": profile.height_cm if profile else None,
        "weight_kg": profile.weight_kg if profile else None,
        "age": age,
        "body_type": profile.body_type if profile else None,
        "preferred_foot": user.preferred_foot,
        "position": user.position,
        "shirt_number": profile.shirt_number if profile else None,
    }

    sections = {
        "skills": bool(measured),
        "physical": bool(physical["height_cm"] and physical["weight_kg"] and age),
        "mindset": mindset is not None,
        "reaction": reaction is not None,
        "logic": logic is not None,
    }
    return {
        "name": user.name,
        "overall": round(sum(measured) / len(measured)) if measured else None,
        "skills": skills,
        "activity": juggling.get("ACT", {}).get("value"),
        "sessions": simple["sessions"],
        "best": simple.get("best"),
        "mindset": {"traits": traits, "score": mindset.score if mindset else None,
                    "taken_at": mindset.created_at.isoformat() if mindset else None},
        "reaction": {"rating": reaction.score, **reaction.detail, "taken_at": reaction.created_at.isoformat()} if reaction else None,
        "logic": {"rating": logic.score, **logic.detail, "taken_at": logic.created_at.isoformat()} if logic else None,
        "physical": physical,
        "complete": round(100 * sum(sections.values()) / len(sections)),
        "sections": sections,
    }


def readiness(card: dict) -> dict | None:
    """Competition readiness (the brief's player-interface index): the average of the parts we have, each 0-100:
    overall skill, recent activity, mindset and reaction. Shown with its parts, never as a single magic number."""
    parts = [("Skill", card["overall"]), ("Activity", card["activity"]), ("Mindset", card["mindset"]["score"]),
             ("Reaction", card["reaction"]["rating"] if card["reaction"] else None)]
    have = [(k, v) for k, v in parts if v is not None]
    if len(have) < 2:
        return None
    return {"value": round(sum(v for _, v in have) / len(have)), "parts": [{"label": k, "value": v} for k, v in parts]}
