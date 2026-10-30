"""Coaching feedback written FROM the measured numbers.

Gemini writes the words; everything factual comes from the analysis report or from this file:
- numbers: every number in the summary, strengths, focus and goal must be a measured value (or the goal we computed),
  otherwise the model invented a statistic (`ungrounded_numbers`);
- judgements: the measured rhythm and control are given as words, and a reply that contradicts them (calling an
  "uneven" rhythm "steady") is rejected (`contradictions`);
- drills: Gemini only picks drills from DRILLS by name and says why they suit the player; how to do them and how
  many reps come from the library, so it can't invent unsafe or nonsensical drills.
A reply that fails any check is replaced by rule-based coaching, which is also used with no API key, on errors and
on timeouts, so a report always has coaching. Spike notes: gemini-flash-latest spent 20+ s "thinking" (timeouts);
gemini-flash-lite-latest answers in 2-3 s.
"""

import json
import re
from concurrent.futures import ThreadPoolExecutor
from concurrent.futures import TimeoutError as FutureTimeout

from pydantic import BaseModel, Field

from ..config import settings

TIMEOUT_S = 25

DRILLS: dict[str, dict] = {
    "Metronome touches": {
        "how": "Set a phone metronome (or clap) to a slow, steady beat and touch the ball on every beat, alternating "
               "feet.", "reps": "3 × 1 minute", "for": "rhythm"},
    "Knee-height cap": {
        "how": "Juggle with one rule: the ball never goes above your knee. If it does, catch it and start again.",
        "reps": "5 × 20 touches", "for": "control"},
    "Soft-landing cushions": {
        "how": "Pop the ball to head height once, then cushion it on your foot so it drops only a few centimetres. "
               "Go back to normal juggling.", "reps": "5 × 10 cushions", "for": "control"},
    "Drop-kick-catch": {
        "how": "Drop the ball from your hands, kick it straight back up once with your laces and catch it. Then two "
               "touches before the catch, then three.", "reps": "3 × 10 catches", "for": "beginners"},
    "Weak-foot ladder": {
        "how": "Strong foot, weak foot; then two weak-foot touches in a row; then three. Restart the ladder when the "
               "ball drops.", "reps": "3 rounds", "for": "balance"},
    "Thigh-foot combo": {
        "how": "Alternate thigh, foot, thigh, foot. The thigh touch should pop the ball to about waist height.",
        "reps": "4 × 1 minute", "for": "variety"},
    "Wall rebounds": {
        "how": "Stand two big steps from a wall, volley the ball against it with your instep and control the "
               "rebound with one touch before the next volley.", "reps": "3 × 20 volleys", "for": "rhythm"},
    "Count-up challenge": {
        "how": "Set a target a few touches above your best. When the ball drops, start the count again. Stop after "
               "ten minutes.", "reps": "10 minutes", "for": "endurance"},
}


class DrillPick(BaseModel):
    name: str = Field(max_length=60)
    why: str = Field(max_length=200)


class Coaching(BaseModel):
    """What Gemini returns."""
    summary: str = Field(max_length=400)
    strengths: list[str] = Field(max_length=3)
    focus: list[str] = Field(max_length=3)
    drills: list[DrillPick] = Field(max_length=3)
    next_goal: str = Field(max_length=160)


# ---- Words for the numbers (same thresholds as frontend/lib/samples.ts) ----

def rhythm_label(cv: float | None) -> str:
    if cv is None:
        return "not enough touches"
    return "very even" if cv < 0.25 else "steady" if cv < 0.45 else "uneven" if cv < 0.65 else "erratic"


def control_label(arc: float | None) -> str:
    if arc is None:
        return "not enough touches"
    return "tight" if arc < 1.5 else "controlled" if arc < 2.5 else "loose" if arc < 4 else "wild"


def goal_touches(touches: int) -> int:
    """Next target: about 20% more, at least 3 more, rounded to a friendly number."""
    target = max(touches + 3, round(touches * 1.2))
    return target if target < 20 else int(round(target / 5) * 5)


def facts(report: dict) -> dict:
    m = report["metrics"]
    interval, arc = m.get("interval_s") or {}, m.get("arc_height_balls") or {}
    return {
        "touches": m["touches"],
        "likely_range": m["touches_range"],
        "touches_seen_clearly": m["touches_certain"],
        "touches_per_minute": m.get("touches_per_minute"),
        "seconds_between_touches": interval.get("mean"),
        "rhythm": rhythm_label(interval.get("cv")),
        "ball_height_in_ball_sizes": arc.get("mean"),
        "control": control_label(arc.get("mean")),
        "video_seconds": report["video"]["duration_s"],
        "next_target_touches": goal_touches(m["touches"]),
    }


# ---- Checks on a Gemini reply ----

_NUMBER = re.compile(r"(?<![\w.])\d+(?:\.\d+)?")


def _allowed_numbers(f: dict) -> list[float]:
    out: list[float] = [1, 2, 3]  # "one", "two"... written as digits ("2 things to work on")
    for v in f.values():
        for x in v if isinstance(v, list) else [v]:
            if isinstance(x, (int, float)):
                out.append(float(x))
    return out


def _claims(c: Coaching) -> str:
    return " ".join([c.summary, *c.strengths, *c.focus, c.next_goal])


def ungrounded_numbers(c: Coaching, f: dict) -> list[str]:
    """Numbers in the summary, strengths, focus and goal that don't match a measured value (within 5% or 0.1)."""
    allowed = _allowed_numbers(f)
    bad = []
    for token in _NUMBER.findall(_claims(c)):
        x = float(token)
        if not any(abs(x - a) <= max(0.1, 0.05 * abs(a)) for a in allowed):
            bad.append(token)
    return bad


_GOOD_RHYTHM = re.compile(r"\b(steady|even|consistent|smooth|regular)\s+(rhythm|timing|tempo|pace)\b", re.I)
_BAD_RHYTHM = re.compile(r"\b(uneven|erratic|irregular|inconsistent)\s+(rhythm|timing|tempo|pace)\b", re.I)
_GOOD_CONTROL = re.compile(r"\b(tight|great|good|excellent|solid)\s+(ball\s+)?control\b", re.I)
_BAD_CONTROL = re.compile(r"\b(loose|wild|poor|weak)\s+(ball\s+)?control\b", re.I)


def contradictions(c: Coaching, f: dict) -> list[str]:
    """Judgements in the strengths/summary that contradict the measured rhythm or control."""
    praise = " ".join([c.summary, *c.strengths])
    out = []
    if f["rhythm"] in ("uneven", "erratic") and _GOOD_RHYTHM.search(praise):
        out.append(f"called the rhythm good, measured {f['rhythm']}")
    if f["rhythm"] in ("very even", "steady") and _BAD_RHYTHM.search(praise):
        out.append(f"called the rhythm bad, measured {f['rhythm']}")
    if f["control"] in ("loose", "wild") and _GOOD_CONTROL.search(praise):
        out.append(f"praised control, measured {f['control']}")
    if f["control"] in ("tight", "controlled") and _BAD_CONTROL.search(" ".join([c.summary, *c.strengths, *c.focus])):
        out.append(f"criticised control, measured {f['control']}")
    return out


def unknown_drills(c: Coaching) -> list[str]:
    names = {n.lower() for n in DRILLS}
    return [d.name for d in c.drills if d.name.strip().lower() not in names]


def _with_library(picks: list[DrillPick]) -> list[dict]:
    by_lower = {n.lower(): n for n in DRILLS}
    out = []
    for p in picks:
        name = by_lower[p.name.strip().lower()]
        out.append({"name": name, "how": DRILLS[name]["how"], "reps": DRILLS[name]["reps"], "why": p.why})
    return out


# ---- Rule-based coaching (fallback, and the source of truth for tests) ----

def rule_based(report: dict) -> dict:
    f = facts(report)
    strengths, focus, picks = [], [], []
    if f["rhythm"] in ("very even", "steady"):
        strengths.append(f"Your rhythm is {f['rhythm']}: about {f['seconds_between_touches']} seconds between touches.")
    else:
        focus.append(f"Your rhythm is {f['rhythm']}. Aim for the same height and timing on every touch.")
        picks.append(("Metronome touches", "Builds an even beat between touches."))
    if f["control"] in ("tight", "controlled"):
        strengths.append(f"Your ball control is {f['control']}: the ball rises about "
                         f"{f['ball_height_in_ball_sizes']} ball sizes per touch.")
    else:
        focus.append(f"The ball goes high ({f['ball_height_in_ball_sizes']} ball sizes). Lock your ankle and keep "
                     "touches to knee height.")
        picks.append(("Knee-height cap", "Keeps every touch low and soft."))
    if f["touches"] < 15:
        picks.append(("Drop-kick-catch", "Builds clean first touches before longer runs."))
    if not strengths:
        strengths.append(f"You kept the ball up for {f['touches']} touches in {f['video_seconds']} seconds.")
    if not focus:
        focus.append("Add your weaker foot: alternate feet every touch to build balance.")
    picks += [("Weak-foot ladder", "Makes both feet reliable."),
              ("Count-up challenge", f"Pushes you towards {f['next_target_touches']} touches."),
              ("Thigh-foot combo", "Adds variety once your feet are steady.")]  # always enough for three drills
    summary = (f"{f['touches']} touches (likely {f['likely_range'][0]}–{f['likely_range'][1]}). "
               f"Rhythm: {f['rhythm']}. Ball control: {f['control']}.")
    return {"summary": summary, "strengths": strengths[:3], "focus": focus[:3],
            "drills": _with_library([DrillPick(name=n, why=w) for n, w in picks[:3]]),
            "next_goal": f"Next session: reach {f['next_target_touches']} touches without the ball touching the ground.",
            "source": "rules"}


# ---- Gemini ----

SYSTEM = (
    "You are PitchIQ's football coach. You write short, encouraging, specific feedback for a young player about one "
    "juggling session, using ONLY the measured facts you are given. Rules: describe rhythm and control with the "
    "exact words in the facts (never call an 'uneven' rhythm steady, never praise 'loose' control); never state a "
    "number that is not in the facts (no invented percentages, speeds, ages or counts); do not mention the camera or "
    "the AI; plain English a young teenager understands. Pick exactly 3 drills by their exact name from the drill "
    "library and say in one sentence why each suits this player. Pace is just touches per minute: never call it steady or even. The next_goal must use next_target_touches."
)


def _ask_gemini(f: dict, profile: dict) -> Coaching:
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=settings.gemini_api_key)
    library = {name: d["for"] for name, d in DRILLS.items()}
    prompt = (
        "Measured facts about this juggling session (JSON):\n" + json.dumps(f) +
        "\nPlayer (may be empty): " + json.dumps(profile) +
        "\nDrill library (name: what it trains): " + json.dumps(library) +
        "\nWrite: summary (1-2 sentences), 2 strengths, 2 things to focus on, 3 drills (name, why), next_goal."
    )
    resp = client.models.generate_content(
        model=settings.gemini_model,
        contents=prompt,
        config=types.GenerateContentConfig(system_instruction=SYSTEM, temperature=0.4,
                                           response_mime_type="application/json", response_schema=Coaching),
    )
    return Coaching.model_validate(json.loads(resp.text))


_pool = ThreadPoolExecutor(max_workers=4)


def run_with_timeout(fn, *args, timeout: float = TIMEOUT_S):
    """Run a Gemini call with a hard time limit (the SDK call itself can hang on a bad connection)."""
    return _pool.submit(fn, *args).result(timeout=timeout)


def check(c: Coaching, f: dict) -> list[str]:
    """Every reason to reject a Gemini reply (empty = usable)."""
    problems = [f"number not measured: {n}" for n in ungrounded_numbers(c, f)]
    problems += contradictions(c, f)
    problems += [f"drill not in library: {n}" for n in unknown_drills(c)]
    if not c.drills or not c.strengths or not c.focus:
        problems.append("incomplete reply")
    return problems


def generate(report: dict, profile: dict | None = None) -> dict:
    """Coaching for a report the quality check accepted. Gemini if configured and it passes the checks, else rules."""
    f = facts(report)
    if not settings.gemini_api_key:
        return rule_based(report)
    try:
        c = run_with_timeout(_ask_gemini, f, profile or {})
    except FutureTimeout:
        return {**rule_based(report), "note": "AI coach timed out"}
    except Exception:  # noqa: BLE001 - quota, network, bad JSON: fall back rather than fail the report
        return {**rule_based(report), "note": "AI coach unavailable"}
    problems = check(c, f)
    if problems:
        return {**rule_based(report), "note": "AI reply rejected: " + "; ".join(problems[:3])}
    return {"summary": c.summary, "strengths": c.strengths, "focus": c.focus, "drills": _with_library(c.drills),
            "next_goal": c.next_goal, "source": "ai"}
