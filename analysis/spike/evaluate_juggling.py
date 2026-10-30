"""Spike 2b: count juggling touches and compare with the ground truth.

For each clip in data/ground_truth.json: the model's count, its range, and which true touches it matched (within
0.25 s), missed, or invented. That's precision/recall for touch detection.
Run:  python -u -m analysis.spike.evaluate_juggling [clip ids...] [--contacts] [--every=2]
"""

import json
import pickle
import sys
from pathlib import Path

import numpy as np

from analysis.juggling import count_touches
from analysis.pose import find_contacts
from analysis.tracking import track_video

ROOT = Path(__file__).resolve().parents[2]
CACHE = ROOT / "reports/cache"  # tracker output per clip (gitignored): tracking is slow, counting is instant
TOLERANCE = 0.25  # seconds: a detected touch within this of a true touch counts as a match


def tracked(clip_id: str, every: int = 1):
    """Tracker output for a clip, cached. Delete reports/cache after changing the tracker."""
    path = CACHE / (f"{clip_id}.pkl" if every == 1 else f"{clip_id}-every{every}.pkl")
    if path.exists():
        return pickle.loads(path.read_bytes())
    result = track_video(ROOT / "data/raw" / f"{clip_id}.mp4", every=every)
    CACHE.mkdir(parents=True, exist_ok=True)
    path.write_bytes(pickle.dumps(result))
    return result


def match(found: list[float], truth: list[float]) -> tuple[int, list[float], list[float]]:
    remaining, hits, extra = list(truth), 0, []
    for t in found:
        best = min(remaining, key=lambda g: abs(g - t), default=None)
        if best is not None and abs(best - t) <= TOLERANCE:
            remaining.remove(best)
            hits += 1
        else:
            extra.append(t)
    return hits, remaining, extra


if __name__ == "__main__":
    gt = json.loads((ROOT / "data/ground_truth.json").read_text())["clips"]
    contacts_on = "--contacts" in sys.argv
    every = int(next((a.split("=")[1] for a in sys.argv if a.startswith("--every=")), 1))  # track every Nth frame
    ids = [a for a in sys.argv[1:] if not a.startswith("--")] or [k for k, v in gt.items() if v["skill"] == "juggling" and "touches" in v]
    for clip_id in ids:
        truth = gt[clip_id]
        points, fps, _ = tracked(clip_id, every)
        result = count_touches(points, fps)
        s = result.summary()
        hits, missed, extra = match(s["times"], truth["touch_times"])
        print(f"{clip_id}: model {s['touches']} (certain {s['certain']}, range {s['range']}) vs truth {truth['touches']}"
              f" | matched {hits} | missed {[round(m, 2) for m in missed]} | invented {extra}")
        print(f"   model times: {s['times']}")

        if not contacts_on:
            continue
        # With the body-contact check: a candidate with no body part at the ball is a bounce, not a touch.
        # Spike 2e: this does NOT work in 2D (a player lying beside a bouncing ball looks "in contact").
        ball = float(np.median([p.size for p in points if p is not None]))
        contacts = find_contacts(ROOT / "data/raw" / f"{clip_id}.mp4", result.touches, ball)
        kept = [round(t.time, 2) for t, c in zip(result.touches, contacts) if c.part]
        hits, missed, extra = match(kept, truth["touch_times"])
        print(f"   + body contact: model {len(kept)} vs truth {truth['touches']} | matched {hits}"
              f" | missed {[round(m, 2) for m in missed]} | invented {extra}")
        print("   contacts: " + ", ".join(f"{t.time:.2f} {c.part or 'NONE'} {c.distance:.1f}"
                                         for t, c in zip(result.touches, contacts)))
