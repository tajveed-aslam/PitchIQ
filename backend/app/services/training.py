"""AI weekly training plans (Main edition), written from the player's measured numbers.

Same contract as the report coaching (services/coaching.py): the week's goal is computed here, Gemini only arranges
drills from the library across the training days and explains them, and a reply that invents a number or a drill,
or breaks the shape (5 training days, 1-3 drills a day, 5-20 minutes each), is replaced by the rule-based plan.
"""

import json
from concurrent.futures import TimeoutError as FutureTimeout
from datetime import date, timedelta

from pydantic import BaseModel, Field

from ..config import settings
from . import gemini
from .coaching import DRILLS, _NUMBER, facts, goal_touches, run_with_timeout

# Drills for the non-video parts of the card, in the same form as the juggling library.
EXTRA_DRILLS: dict[str, dict] = {
    "Reaction drops": {
        "how": "A partner holds a ball at shoulder height and lets go without warning. Control it with your foot "
               "before the second bounce.", "reps": "3 × 10 drops", "for": "reaction"},
    "Scan and call": {
        "how": "While juggling, look up between touches and call out how many fingers a partner is holding up.",
        "reps": "3 × 1 minute", "for": "awareness"},
    "Reset breath": {
        "how": "Set a touch target. When the ball drops, take three slow breaths before you start again, and say "
               "one thing you did well.", "reps": "5 rounds", "for": "emotional control"},
}
LIBRARY = {**DRILLS, **EXTRA_DRILLS}
TRAINING_DAYS, REST_DAYS = 5, (4, 7)  # day numbers 1-7; rest on Thursday-ish and Sunday-ish


class DayDrill(BaseModel):
    name: str = Field(max_length=60)
    minutes: int
    note: str = Field(max_length=200)


class Day(BaseModel):
    title: str = Field(max_length=40)
    drills: list[DayDrill]


class Week(BaseModel):
    summary: str = Field(max_length=400)
    focus: list[str] = Field(max_length=3)
    days: list[Day]


def plan_facts(report: dict, best: int, card: dict) -> dict:
    f = facts(report)
    reaction = card.get("reaction")
    traits = [t for t in card["mindset"]["traits"] if t["value"] is not None]
    lowest = min(traits, key=lambda t: t["value"]) if traits else None
    return {
        "latest_touches": f["touches"],
        "best_touches": best,
        "rhythm": f["rhythm"],
        "control": f["control"],
        "touches_per_minute": f["touches_per_minute"],
        "week_goal_touches": goal_touches(best),
        "reaction_rating": reaction["rating"] if reaction else None,
        "lowest_mindset_trait": lowest["label"] if lowest else None,
        "lowest_mindset_value": lowest["value"] if lowest else None,
    }


def _priorities(f: dict) -> list[tuple[str, str]]:
    """Drills in order of need, with a one-line reason built from the facts."""
    out: list[tuple[str, str]] = []
    if f["rhythm"] in ("uneven", "erratic"):
        out.append(("Metronome touches", f"Your rhythm was {f['rhythm']}: one beat, one touch."))
    if f["control"] in ("loose", "wild"):
        out += [("Knee-height cap", f"Control was {f['control']}: keep every touch below the knee."),
                ("Soft-landing cushions", "Teaches a soft foot so the ball stays close.")]
    out.append(("Count-up challenge", f"Builds towards this week's goal of {f['week_goal_touches']} touches."))
    out.append(("Weak-foot ladder", "Makes both feet reliable."))
    if f["reaction_rating"] is None or f["reaction_rating"] < 60:
        out.append(("Reaction drops", "Sharpens how fast you react to a moving ball."))
    if f["lowest_mindset_trait"]:
        out.append(("Reset breath", f"Works on {f['lowest_mindset_trait'].lower()}, your lowest self-rated trait."))
    out += [("Thigh-foot combo", "Adds variety once your feet are steady."),
            ("Scan and call", "Keeps your head up while the ball is moving."),
            ("Wall rebounds", "Trains a steady rhythm against a moving ball.")]
    seen, unique = set(), []
    for name, why in out:
        if name not in seen:
            seen.add(name)
            unique.append((name, why))
    return unique


def _with_rest(days: list[dict]) -> list[dict]:
    out, it = [], iter(days)
    for n in range(1, 8):
        out.append({"day": n, "title": "Rest and recover", "rest": True, "sessions": []} if n in REST_DAYS
                   else {**next(it), "day": n, "rest": False})
    return out


def _drill(name: str, minutes: int, note: str) -> dict:
    d = LIBRARY[name]
    return {"name": name, "minutes": minutes, "note": note, "how": d["how"], "reps": d["reps"]}


def rule_based(f: dict) -> dict:
    """Day i leads with the i-th most needed drill and pairs it with one half the list further on, so every day is a
    different combination; each day is named after what its lead drill trains."""
    pri = _priorities(f)
    n = len(pri)
    days = []
    for i in range(TRAINING_DAYS):
        (a, why_a), (b, why_b) = pri[i % n], pri[(i + max(1, n // 2)) % n]
        sessions = [_drill(a, 10, why_a)] + ([_drill(b, 10, why_b)] if b != a else [])
        days.append({"title": LIBRARY[a]["for"].capitalize(), "sessions": sessions})
    focus = [why for _, why in pri[:2]]
    return {"summary": f"A week built from your last video: {f['latest_touches']} touches, rhythm {f['rhythm']}, "
                       f"ball control {f['control']}. Goal: {f['week_goal_touches']} touches by the end of the week.",
            "focus": focus, "goal_touches": f["week_goal_touches"], "days": _with_rest(days), "source": "rules"}


# ---- Gemini ----

SYSTEM = (
    "You are PitchIQ's football coach planning one training week for a young player from MEASURED facts. Use only "
    "drills from the library, by exact name. Write exactly 5 training days (rest days are added for you), each with "
    "a short title and 1-3 drills of 5-20 minutes, each drill with a one-sentence note on why it suits this player. "
    "Describe rhythm and control only with the words in the facts. Never write a number that isn't in the facts, "
    "except drill minutes. The summary must mention week_goal_touches. Plain English for a young teenager."
)

_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "summary": {"type": "STRING"},
        "focus": {"type": "ARRAY", "items": {"type": "STRING"}},
        "days": {"type": "ARRAY", "items": {"type": "OBJECT", "properties": {
            "title": {"type": "STRING"},
            "drills": {"type": "ARRAY", "items": {"type": "OBJECT", "properties": {
                "name": {"type": "STRING"}, "minutes": {"type": "INTEGER"}, "note": {"type": "STRING"}},
                "required": ["name", "minutes", "note"]}}},
            "required": ["title", "drills"]}},
    },
    "required": ["summary", "focus", "days"],
}


def check(w: Week, f: dict) -> list[str]:
    problems = []
    if len(w.days) != TRAINING_DAYS:
        problems.append(f"{len(w.days)} training days, expected {TRAINING_DAYS}")
    names = {n.lower() for n in LIBRARY}
    allowed = [float(v) for v in f.values() if isinstance(v, (int, float))] + [float(x) for x in range(1, 8)]
    for d in w.days:
        if not 1 <= len(d.drills) <= 3:
            problems.append(f"day '{d.title}' has {len(d.drills)} drills")
        for x in d.drills:
            if x.name.strip().lower() not in names:
                problems.append(f"drill not in library: {x.name}")
            if not 5 <= x.minutes <= 20:
                problems.append(f"{x.minutes} minutes for {x.name}")
    minutes = [float(x.minutes) for d in w.days for x in d.drills]
    text = " ".join([w.summary, *w.focus, *(x.note for d in w.days for x in d.drills)])
    for token in _NUMBER.findall(text):
        v = float(token)
        if not any(abs(v - a) <= max(0.1, 0.05 * abs(a)) for a in allowed + minutes):
            problems.append(f"number not measured: {token}")
    if str(f["week_goal_touches"]) not in w.summary:
        problems.append("summary doesn't state the week's goal")
    return problems


def _ask_gemini(f: dict) -> Week:
    library = {name: d["for"] for name, d in LIBRARY.items()}
    prompt = ("Measured facts (JSON):\n" + json.dumps(f) + "\nDrill library (name: what it trains): " +
              json.dumps(library) + "\nPlan the 5 training days.")
    text = gemini.generate(SYSTEM, [{"role": "user", "text": prompt}], schema=_SCHEMA, temperature=0.5, timeout=25)
    return Week.model_validate(json.loads(text))


def generate(f: dict) -> dict:
    if not settings.gemini_api_key:
        return rule_based(f)
    try:
        w = run_with_timeout(_ask_gemini, f, timeout=30)
    except FutureTimeout:
        return {**rule_based(f), "note": "AI coach timed out"}
    except Exception:  # noqa: BLE001 - quota, network, bad JSON
        return {**rule_based(f), "note": "AI coach unavailable"}
    problems = check(w, f)
    if problems:
        return {**rule_based(f), "note": "AI plan rejected: " + "; ".join(problems[:3])}
    by_lower = {n.lower(): n for n in LIBRARY}
    days = [{"title": d.title, "sessions": [_drill(by_lower[x.name.strip().lower()], x.minutes, x.note) for x in d.drills]}
            for d in w.days]
    return {"summary": w.summary, "focus": w.focus[:3], "goal_touches": f["week_goal_touches"],
            "days": _with_rest(days), "source": "ai"}


def week_of(today: date | None = None) -> str:
    today = today or date.today()
    return (today - timedelta(days=today.weekday())).isoformat()

