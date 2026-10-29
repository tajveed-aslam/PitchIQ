"""Spike 2d: which clips (and which stretches of them) have a moving camera?

Expected from watching them: 43513 zooms out throughout; the dribbling clips follow the player; 42524, 43487 and
43490 are still or nearly (hand-held). Result (spike 2d): still clips 0-6% moving, moving clips 54-93%.
Run:  python -u -m analysis.spike.camera_check [clip ids...]
"""

import sys
import time
from pathlib import Path

import cv2

from analysis.camera import camera_motion

ROOT = Path(__file__).resolve().parents[2]


def segments(moving, fps) -> list[str]:
    out, start = [], None
    for i, m in enumerate(list(moving) + [False]):
        if m and start is None:
            start = i
        elif not m and start is not None:
            out.append(f"{start / fps:.2f}-{i / fps:.2f}s")
            start = None
    return out


if __name__ == "__main__":
    clips = sys.argv[1:] or sorted(p.stem for p in (ROOT / "data/raw").glob("*.mp4"))
    for clip in clips:
        path = ROOT / "data/raw" / f"{clip}.mp4"
        fps = cv2.VideoCapture(str(path)).get(cv2.CAP_PROP_FPS)
        t = time.perf_counter()
        cam = camera_motion(path)
        took = time.perf_counter() - t
        print(f"{clip}: moving {100 * cam.moving_fraction:.0f}% | median shift {float(sorted(cam.shift)[len(cam.shift)//2]):.2f}%"
              f" zoom {float(sorted(cam.zoom)[len(cam.zoom)//2]):.2f}% | {1000 * took / len(cam.shift):.1f} ms/frame"
              f" | {'still' if cam.still else 'CAMERA MOVING'} | moving at {segments(cam.moving, fps)}")
