"""Spike 2b: count juggling touches and compare with the ground truth.

For each clip in data/ground_truth.json: the model's count, its range, and which true touches it matched (within
0.25 s), missed, or invented. That's precision/recall for touch detection.
Run:  python -u -m analysis.spike.evaluate_juggling [clip ids...]
"""

import json
import sys
from pathlib import Path

from analysis.juggling import count_touches
from analysis.tracking import interpolate, track_video

ROOT = Path(__file__).resolve().parents[2]
TOLERANCE = 0.25  # seconds: a detected touch within this of a true touch counts as a match


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
    ids = sys.argv[1:] or [k for k, v in gt.items() if v["skill"] == "juggling"]
    for clip_id in ids:
        truth = gt[clip_id]
        points, fps, _ = track_video(ROOT / "data/raw" / f"{clip_id}.mp4")
        result = count_touches(interpolate(points), fps)
        s = result.summary()
        hits, missed, extra = match(s["times"], truth["touch_times"])
        print(f"{clip_id}: model {s['touches']} (certain {s['certain']}, range {s['range']}) vs truth {truth['touches']}"
              f" | matched {hits} | missed {[round(m, 2) for m in missed]} | invented {extra}")
        print(f"   model times: {s['times']}")
