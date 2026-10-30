"""The analysis report: everything measured from one video, as plain JSON.

This is the contract between the analysis worker, the API (stores it) and the coaching step (Gemini writes feedback
FROM these numbers and must not invent others). Bump SCHEMA_VERSION on any breaking change.

Run on a file:  python -u -m analysis.report data/raw/mixkit-43490.mp4
"""

import json
import sys
import time
from collections.abc import Callable
from pathlib import Path

import cv2
import numpy as np

from analysis.camera import camera_motion
from analysis.juggling import JugglingResult, count_touches
from analysis.tracking import track_video

SCHEMA_VERSION = 1
MODEL_VERSION = "juggling-0.1"
EVERY = 2  # track every 2nd frame: same accuracy as every frame on the ground-truth clips, half the time (spike 2f)


def _video_info(path: Path) -> dict:
    cap = cv2.VideoCapture(str(path))
    try:
        fps = cap.get(cv2.CAP_PROP_FPS) or 0.0
        frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        return {"duration_s": round(frames / fps, 2) if fps else 0.0, "fps": round(fps, 2),
                "width": int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), "height": int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))}
    finally:
        cap.release()


def _spread(values: list[float]) -> dict | None:
    """Mean and coefficient of variation (spread relative to the mean: lower = more consistent)."""
    if len(values) < 2:
        return None
    mean = float(np.mean(values))
    return {"mean": round(mean, 2), "cv": round(float(np.std(values) / mean), 2) if mean else None}


def _arc_heights(result: JugglingResult, points, ball: float) -> list[float]:
    """How high the ball went between consecutive touches, in ball diameters (the highest seen point between them)."""
    heights = []
    for a, b in zip(result.touches, result.touches[1:]):
        ys = [p.y for p in points[a.frame:b.frame + 1] if p is not None]
        if ys:
            heights.append((max(a.y, b.y) - min(ys)) / ball)
    return heights


def quality(points, cam_still: bool, cam_moving: float, info: dict, every: int) -> dict:
    tracked_frames = max(1, len(points[::every]))
    seen = sum(p is not None for p in points[::every]) / tracked_frames
    sizes = [p.size for p in points if p is not None]
    ball_pct = 100 * float(np.median(sizes)) / info["width"] if sizes and info["width"] else 0.0
    issues = []
    if not cam_still:
        issues.append({"code": "camera_moving", "message": "The camera moved. Prop the phone up so it stays still."})
    if seen < 0.2:
        issues.append({"code": "ball_not_found", "message": "The ball was hard to find. Film in good light, with "
                       "the whole ball and your feet in the picture."})
    elif seen < 0.4:
        issues.append({"code": "ball_hard_to_see", "message": "The ball was only seen part of the time, so the count "
                       "is less certain. Better light or a plainer background helps."})
    if sizes and ball_pct < 1.5:
        issues.append({"code": "too_far", "message": "You're far from the camera. Stand closer so the ball looks "
                       "bigger (whole body still in the picture)."})
    if not cam_still or seen < 0.2:
        verdict = "reject"
    else:
        verdict = "warn" if issues else "ok"
    return {"verdict": verdict, "issues": issues, "ball_seen_pct": round(100 * seen),
            "camera_moving_pct": round(100 * cam_moving), "ball_size_pct": round(ball_pct, 1)}


def analyse_juggling(path: Path, every: int = EVERY, on_stage: Callable[[str], None] | None = None) -> dict:
    """Full analysis of one juggling video. on_stage(name) is called as each stage starts ("quality", "tracking",
    "counting") so a job can report progress."""
    stage = on_stage or (lambda _name: None)
    started = time.perf_counter()
    info = _video_info(path)
    stage("quality")
    cam = camera_motion(path)
    stage("tracking")
    points, fps, _ = track_video(path, every=every)
    stage("counting")
    result = count_touches(points, fps)
    sizes = [p.size for p in points if p is not None]
    ball = float(np.median(sizes)) if sizes else 1.0
    times = [round(t.time, 2) for t in result.touches]
    intervals = [b - a for a, b in zip(times, times[1:])]
    active = (times[-1] - times[0]) if len(times) > 1 else 0.0
    return {
        "schema_version": SCHEMA_VERSION,
        "model_version": MODEL_VERSION,
        "skill": "juggling",
        "video": info,
        "quality": quality(points, cam.still, cam.moving_fraction, info, every),
        "metrics": {
            "touches": result.count,
            "touches_range": list(result.range),
            "touches_certain": result.certain,
            "touch_times_s": times,
            "touches_per_minute": round(60 * (result.count - 1) / active, 1) if active else None,
            "interval_s": _spread(intervals),  # rhythm: cv near 0 = even rhythm
            "arc_height_balls": _spread(_arc_heights(result, points, ball)),  # control: lower, steadier = tighter
        },
        "notes": [
            "Touch count is measured from the ball's path; touches the camera couldn't see are covered by the range.",
            "Rhythm and arc height are approximate.",
        ],
        "timing": {"analysis_s": round(time.perf_counter() - started, 1)},
    }


if __name__ == "__main__":
    print(json.dumps(analyse_juggling(Path(sys.argv[1])), indent=2))
