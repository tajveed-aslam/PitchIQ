"""The full player card's non-video tests (Main edition).

- mindset: a 12-statement self-assessment, two per trait (one reversed so agreeing with everything doesn't score
  100). It is the player's own view of themselves and is labelled that way; it is not a psychological diagnosis.
- reaction: the browser measures five taps after a random delay; the server checks the timings are humanly
  possible and scores the median.
- logic: pattern puzzles the server generates from a seed and grades itself. The seed travels inside a signed,
  short-lived token, so the answers never reach the browser and a client can't award itself a score.
"""

import random
import statistics
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

from ..config import settings

TRAITS = {
    "motivation": "Motivation",
    "confidence": "Confidence",
    "team_spirit": "Team spirit",
    "leadership": "Leadership",
    "communication": "Communication",
    "emotional_control": "Emotional control",
}

# (id, trait, statement, reversed)
QUESTIONS: list[tuple[str, str, str, bool]] = [
    ("q1", "motivation", "I train on my own even when nobody asks me to.", False),
    ("q2", "motivation", "I lose interest in training when I don't see quick progress.", True),
    ("q3", "confidence", "I want the ball when the game is tight.", False),
    ("q4", "confidence", "After a mistake I avoid taking risks for the rest of the game.", True),
    ("q5", "team_spirit", "I'm happy when a teammate scores, even if I played badly.", False),
    ("q6", "team_spirit", "I care more about my own stats than the team's result.", True),
    ("q7", "leadership", "When the team is struggling, I try to lift the others.", False),
    ("q8", "leadership", "I wait for someone else to organise the team.", True),
    ("q9", "communication", "I call for the ball and tell teammates what I see.", False),
    ("q10", "communication", "I find it hard to talk to the coach about my game.", True),
    ("q11", "emotional_control", "I stay calm when the referee makes a decision I don't like.", False),
    ("q12", "emotional_control", "A bad touch can ruin my mood for the whole session.", True),
]


def questionnaire() -> list[dict]:
    return [{"id": q, "trait": t, "text": text} for q, t, text, _ in QUESTIONS]


def score_mindset(answers: dict[str, int]) -> dict:
    """answers: question id -> 1 (strongly disagree) .. 5 (strongly agree), all 12 required."""
    missing = [q for q, *_ in QUESTIONS if q not in answers]
    if missing:
        raise ValueError(f"Answer every statement ({len(missing)} missing).")
    if any(not isinstance(v, int) or not 1 <= v <= 5 for v in answers.values()):
        raise ValueError("Answers must be 1 to 5.")
    per_trait: dict[str, list[float]] = {t: [] for t in TRAITS}
    for q, trait, _, reverse in QUESTIONS:
        v = answers[q]
        per_trait[trait].append(6 - v if reverse else v)
    traits = {t: round((statistics.mean(vs) - 1) / 4 * 100) for t, vs in per_trait.items()}
    return {"score": round(statistics.mean(traits.values())), "detail": {"traits": traits}}


# ---- Reaction ----

REACTION_TRIALS = 5
FASTEST_HUMAN_MS = 100  # anything quicker is a tap before the light changed
SLOWEST_MS = 1500


def reaction_rating(median_ms: float) -> int:
    """220 ms or faster = 99, 520 ms or slower = 30, linear in between (phone screens add ~30-60 ms of lag, so
    these bands are slower than lab reaction times)."""
    x = (520 - median_ms) / 300
    return round(30 + 69 * max(0.0, min(1.0, x)))


def score_reaction(times_ms: list[int], false_starts: int) -> dict:
    if len(times_ms) != REACTION_TRIALS:
        raise ValueError(f"Expected {REACTION_TRIALS} taps.")
    if any(not FASTEST_HUMAN_MS <= t <= SLOWEST_MS for t in times_ms):
        raise ValueError("A tap was too fast or too slow to be a reaction. Try again.")
    if not 0 <= false_starts <= 20:
        raise ValueError("Invalid false-start count.")
    median = statistics.median(times_ms)
    return {"score": reaction_rating(median),
            "detail": {"median_ms": round(median), "best_ms": min(times_ms), "times_ms": times_ms,
                       "false_starts": false_starts}}


# ---- Logic ----

LOGIC_QUESTIONS = 8
LOGIC_MINUTES = 15


def _sequence(rng: random.Random, kind: int) -> tuple[list[int], int]:
    if kind == 0:  # arithmetic
        a, d = rng.randint(1, 20), rng.choice([2, 3, 4, 5, 6, 7, 9, 11])
        seq = [a + d * i for i in range(5)]
    elif kind == 1:  # geometric
        a, r = rng.randint(1, 4), rng.choice([2, 3])
        seq = [a * r ** i for i in range(5)]
    elif kind == 2:  # growing step (+1, +2, +3...)
        a, d = rng.randint(1, 10), rng.randint(1, 3)
        seq = [a]
        for i in range(4):
            seq.append(seq[-1] + d + i)
    elif kind == 3:  # two interleaved sequences
        a, b, d, e = rng.randint(1, 9), rng.randint(20, 40), rng.randint(2, 5), -rng.randint(1, 4)
        seq = [a, b, a + d, b + e, a + 2 * d]
    elif kind == 4:  # each = sum of the previous two
        a, b = rng.randint(1, 5), rng.randint(2, 7)
        seq = [a, b]
        while len(seq) < 5:
            seq.append(seq[-1] + seq[-2])
    else:  # squares, shifted
        s = rng.randint(1, 4)
        seq = [(s + i) ** 2 for i in range(5)]
    return seq[:4], seq[4]


def logic_questions(seed: int) -> tuple[list[dict], list[int]]:
    """The questions (sequence + 4 options) and the index of each correct option. Same seed, same test."""
    rng = random.Random(seed)
    kinds = [0, 1, 2, 3, 4, 5, rng.randint(0, 5), rng.randint(0, 5)]
    rng.shuffle(kinds)
    questions, answers = [], []
    for kind in kinds:
        shown, right = _sequence(rng, kind)
        wrong: set[int] = set()
        while len(wrong) < 3:
            w = right + rng.choice([-1, 1]) * rng.randint(1, max(3, abs(right) // 4))
            if w != right and w >= 0:
                wrong.add(w)
        options = [right, *wrong]
        rng.shuffle(options)
        questions.append({"sequence": shown, "options": options})
        answers.append(options.index(right))
    return questions, answers


def new_logic_test() -> dict:
    seed = random.SystemRandom().randint(1, 2**31)
    exp = datetime.now(timezone.utc) + timedelta(minutes=LOGIC_MINUTES)
    token = jwt.encode({"kind": "logic", "seed": seed, "exp": exp}, settings.secret_key, algorithm=settings.algorithm)
    questions, _ = logic_questions(seed)
    return {"token": token, "minutes": LOGIC_MINUTES, "questions": questions}


def score_logic(token: str, answers: list[int], seconds: int) -> dict:
    try:
        claims = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except JWTError:
        raise ValueError("This test has expired. Start a new one.") from None
    if claims.get("kind") != "logic":
        raise ValueError("Invalid test.")
    _, right = logic_questions(int(claims["seed"]))
    if len(answers) != len(right):
        raise ValueError(f"Answer all {len(right)} puzzles.")
    correct = sum(a == r for a, r in zip(answers, right))
    return {"score": round(100 * correct / len(right)),
            "detail": {"correct": correct, "total": len(right), "seconds": max(0, min(seconds, LOGIC_MINUTES * 60))}}
