"""Body contact: which body part touched the ball, if any.

The ball's path alone can't tell a touch from a bounce off the ground: both send the ball back up (spike 2c: most
invented touches in clip 43487 were ground bounces and a missed bicycle kick). A real touch always has a body part
right at the ball, so for each candidate touch the player's pose is found (MediaPipe Pose Landmarker) on the frames
around it, and the body part nearest the ball is the one that touched it. If no body part is close enough, the
candidate is a bounce, not a touch.

Only the candidate frames are looked at (about two per second of video), so this adds little time.
"""

from dataclasses import dataclass
from pathlib import Path

import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks.python import BaseOptions, vision

MODEL = Path(__file__).resolve().parents[1] / "models/pose_landmarker_full.task"

# Points on the body that touch the ball, as MediaPipe landmark indices. A "thigh" is halfway from hip to knee and
# the "chest" halfway between the shoulders. https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker
PARTS: dict[str, list[tuple[int, ...]]] = {
    "foot": [(27,), (28,), (29,), (30,), (31,), (32,)],  # ankles, heels, toes
    "knee": [(25,), (26,)],
    "thigh": [(23, 25), (24, 26)],
    "chest": [(11, 12)],
    "head": [(0,), (7,), (8,)],  # nose, ears
}


@dataclass
class Contact:
    part: str | None  # None: no body part near the ball (a bounce, or the player wasn't found)
    distance: float  # from the ball's centre to that part, in ball diameters
    frame: int  # the frame the part was closest on


def _landmarker() -> vision.PoseLandmarker:
    return vision.PoseLandmarker.create_from_options(
        vision.PoseLandmarkerOptions(base_options=BaseOptions(model_asset_path=str(MODEL)),
                                     running_mode=vision.RunningMode.IMAGE, num_poses=1)
    )


def _nearest_part(landmarks, w: int, h: int, x: float, y: float) -> tuple[str | None, float]:
    best, best_d = None, np.inf
    for part, points in PARTS.items():
        for idx in points:
            lms = [landmarks[i] for i in idx]
            if min(lm.visibility for lm in lms) < 0.3:
                continue
            px = np.mean([lm.x for lm in lms]) * w
            py = np.mean([lm.y for lm in lms]) * h
            d = float(np.hypot(px - x, py - y))
            if d < best_d:
                best, best_d = part, d
    return best, best_d


def find_contacts(path: Path, touches: list, ball: float, reach: int = 2, max_dist: float = 1.6) -> list[Contact]:
    """For each touch (anything with .frame, .x, .y), the body part nearest the ball on frames within `reach` of it.
    A part counts only within `max_dist` ball diameters of the ball's centre (the ball's radius plus a foot's
    thickness and some pose error)."""
    wanted: dict[int, list[int]] = {}
    for n, t in enumerate(touches):
        for f in range(t.frame - reach, t.frame + reach + 1):
            wanted.setdefault(f, []).append(n)
    best = [Contact(None, np.inf, t.frame) for t in touches]
    cap, landmarker, i = cv2.VideoCapture(str(path)), _landmarker(), 0
    try:
        last = max(wanted, default=-1)
        while i <= last:
            ok, frame = cap.read()
            if not ok:
                break
            if i in wanted:
                h, w = frame.shape[:2]
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                result = landmarker.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb))
                if result.pose_landmarks:
                    for n in wanted[i]:
                        part, d = _nearest_part(result.pose_landmarks[0], w, h, touches[n].x, touches[n].y)
                        if d / ball < best[n].distance:
                            best[n] = Contact(part, d / ball, i)
            i += 1
    finally:
        landmarker.close()
        cap.release()
    return [c if c.distance <= max_dist else Contact(None, c.distance, c.frame) for c in best]
