"""Coaching must be grounded in the measured numbers: these tests pin the groundedness check and the fallbacks."""

import json
from pathlib import Path

import pytest

from conftest import GOOD_REPORT

from app.services import coaching
from app.services.coaching import (Coaching, DrillPick, check, contradictions, facts, goal_touches, rule_based,
                                   ungrounded_numbers, unknown_drills)


def make(summary="Good session.", strengths=("Keeps going.",), focus=("Weak foot.",), goal="Reach the goal.",
         drills=("Weak-foot ladder",)):
    return Coaching(summary=summary, strengths=list(strengths), focus=list(focus),
                    drills=[DrillPick(name=d, why="It helps.") for d in drills], next_goal=goal)


def test_measured_numbers_pass():
    f = facts(GOOD_REPORT)
    c = make(summary=f"You hit {f['touches']} touches, about {f['seconds_between_touches']} s apart.",
             goal=f"Aim for {f['next_target_touches']} touches next time.")
    assert ungrounded_numbers(c, f) == []


def test_invented_numbers_are_caught():
    f = facts(GOOD_REPORT)
    c = make(summary="You used your left foot 73% of the time.", strengths=["Top 5% for your age group."])
    assert set(ungrounded_numbers(c, f)) == {"73", "5"}


def test_drills_must_come_from_the_library():
    assert unknown_drills(make(drills=("weak-foot LADDER", "Metronome touches"))) == []  # case-insensitive
    assert unknown_drills(make(drills=("Backflip juggles",))) == ["Backflip juggles"]


def test_contradicting_the_measured_rhythm_or_control_is_caught():
    f = facts(GOOD_REPORT)  # this sample: uneven rhythm, controlled
    assert f["rhythm"] == "uneven" and f["control"] == "controlled"
    assert contradictions(make(strengths=["You kept a steady rhythm."]), f)
    assert contradictions(make(strengths=["You kept a steady pace."]), f)
    assert contradictions(make(focus=["Your loose control lets the ball fly."]), f)
    assert contradictions(make(summary="Uneven rhythm, but good control."), f) == []


def test_check_lists_every_problem():
    f = facts(GOOD_REPORT)
    bad = make(summary="You hit 99 touches with a steady rhythm.", drills=("Moon kicks",))
    problems = check(bad, f)
    assert any("99" in p for p in problems) and any("rhythm" in p for p in problems)
    assert any("Moon kicks" in p for p in problems)


def test_goal_is_ambitious_but_reachable():
    assert goal_touches(5) == 8
    assert goal_touches(16) == 19
    assert goal_touches(38) == 45


def test_rule_based_shape_and_grounded():
    r = rule_based(GOOD_REPORT)
    assert r["source"] == "rules" and r["strengths"] and r["focus"] and len(r["drills"]) == 3
    assert all(d["how"] and d["reps"] and d["why"] for d in r["drills"])
    c = Coaching(**{k: r[k] for k in ("summary", "strengths", "focus", "next_goal")},
                 drills=[DrillPick(name=d["name"], why=d["why"]) for d in r["drills"]])
    assert check(c, facts(GOOD_REPORT)) == []  # our own fallback passes the same checks


def test_no_key_uses_rules(monkeypatch):
    monkeypatch.setattr(coaching.settings, "gemini_api_key", "")
    assert coaching.generate(GOOD_REPORT)["source"] == "rules"


def test_grounded_ai_reply_is_used(monkeypatch):
    monkeypatch.setattr(coaching.settings, "gemini_api_key", "test-key")
    f = facts(GOOD_REPORT)
    monkeypatch.setattr(coaching, "_ask_gemini", lambda f_, p: make(summary=f"{f['touches']} touches, great.",
                                                                     drills=("Metronome touches",)))
    out = coaching.generate(GOOD_REPORT)
    assert out["source"] == "ai" and out["summary"].startswith(str(f["touches"]))
    assert out["drills"][0]["reps"] == coaching.DRILLS["Metronome touches"]["reps"]  # filled from the library


def test_hallucinating_ai_reply_falls_back(monkeypatch):
    monkeypatch.setattr(coaching.settings, "gemini_api_key", "test-key")
    monkeypatch.setattr(coaching, "_ask_gemini", lambda f, p: make(summary="Your kicks reach 41 km/h."))
    out = coaching.generate(GOOD_REPORT)
    assert out["source"] == "rules" and "41" in out["note"] and out["drills"]


def test_ai_error_falls_back(monkeypatch):
    monkeypatch.setattr(coaching.settings, "gemini_api_key", "test-key")

    def boom(f, p):
        raise RuntimeError("quota exceeded")

    monkeypatch.setattr(coaching, "_ask_gemini", boom)
    assert coaching.generate(GOOD_REPORT)["note"] == "AI coach unavailable"


@pytest.mark.parametrize("sample", json.loads((Path(__file__).resolve().parents[2] / "frontend/data/samples.json")
                                              .read_text(encoding="utf-8")), ids=lambda s: s["id"])
def test_every_sample_report_fits_the_contract(sample):
    """The frontend's sample reports come from analysis/report.py: coaching must accept every one of them."""
    r = sample["report"]
    assert r["schema_version"] == 1 and r["quality"]["verdict"] in ("ok", "warn", "reject")
    lo, hi = r["metrics"]["touches_range"]
    assert lo <= r["metrics"]["touches"] <= hi
    assert rule_based(r)["summary"]
