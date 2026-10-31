"""Camera motion: is the phone held still?

Touch counting reads the ball's height in the picture, which only means height above the ground if the camera
doesn't move. A pan or zoom moves the ball in the picture without the ball moving (clip 43513 zooms out the whole
time; the dribbling clips follow the player). Moving-camera videos get a quality-gate warning and a request to
re-film with the phone propped up.

Method: track corner points from one frame to the next (Lucas-Kanade optical flow) and fit a single shift+zoom
(similarity transform) with RANSAC. The background is most of the picture, so the fit follows the background; the
player and ball move differently and are rejected as outliers. A frame is "moving" when that fit shows a real shift
or zoom, smoothed over a few frames so one noisy estimate doesn't count.
"""

from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np
from analysis.video import open_video

WIDTH = 320  # analyse a small copy: plenty for background motion, and fast


@dataclass
class CameraMotion:
    shift: np.ndarray  # per frame: background shift since the previous frame, in % of frame width
    zoom: np.ndarray  # per frame: |scale - 1| since the previous frame, in %
    moving: np.ndarray  # per frame: True where the camera is moving

    @property
    def moving_fraction(self) -> float:
        return float(self.moving.mean()) if len(self.moving) else 0.0

    @property
    def still(self) -> bool:
        """Quality-gate verdict. Spike 2d: still clips measured 0-6% moving, moving ones 54-93%."""
        return self.moving_fraction <= 0.3


def camera_motion(path: Path, shift_pct: float = 0.4, zoom_pct: float = 0.4, smooth: int = 7) -> CameraMotion:
    """Per-frame camera motion. Defaults: moving if the background shifts by more than 0.4% of the frame width
    (about 5 px at 1280) or zooms by more than 0.4% between frames, as a running median over `smooth` frames."""
    cap = open_video(path)
    prev, shifts, zooms = None, [0.0], [0.0]
    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            h, w = frame.shape[:2]
            gray = cv2.cvtColor(cv2.resize(frame, (WIDTH, int(h * WIDTH / w))), cv2.COLOR_BGR2GRAY)
            if prev is not None:
                s, z = _step(prev, gray)
                shifts.append(s)
                zooms.append(z)
            prev = gray
    finally:
        cap.release()
    shift, zoom = np.array(shifts), np.array(zooms)
    moving = (_running_median(shift, smooth) > shift_pct) | (_running_median(zoom, smooth) > zoom_pct)
    return CameraMotion(shift, zoom, moving)


def _step(a: np.ndarray, b: np.ndarray) -> tuple[float, float]:
    pts = cv2.goodFeaturesToTrack(a, maxCorners=200, qualityLevel=0.01, minDistance=8)
    if pts is None or len(pts) < 8:
        return 0.0, 0.0  # nothing to track (a blank, dark frame): assume still rather than invent motion
    nxt, status, _ = cv2.calcOpticalFlowPyrLK(a, b, pts, None)
    good = status.ravel() == 1
    if good.sum() < 8:
        return 0.0, 0.0
    m, _ = cv2.estimateAffinePartial2D(pts[good], nxt[good], method=cv2.RANSAC, ransacReprojThreshold=1.0)
    if m is None:
        return 0.0, 0.0
    scale = float(np.hypot(m[0, 0], m[1, 0]))
    shift = float(np.hypot(m[0, 2], m[1, 2]))
    return 100 * shift / WIDTH, 100 * abs(scale - 1)


def _running_median(x: np.ndarray, n: int) -> np.ndarray:
    half = n // 2
    return np.array([np.median(x[max(0, i - half):i + half + 1]) for i in range(len(x))])
