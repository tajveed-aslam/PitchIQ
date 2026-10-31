"""Ball tracking: find the ball in every frame of a video.

An off-the-shelf detector shrinks the whole frame to 320x320 before looking, so a ball far from the camera becomes
a few pixels and is often missed (spike 1: found in only 17–67% of frames). The tracker fixes that with a zoom:

  1. ACQUIRE: search the whole frame until the ball is found.
  2. TRACK:   on the next frame, crop a square around the last position (a few ball-widths wide) and search only
              there. In the crop the ball is large and clear, and other round things elsewhere can't be confused
              with it.
  3. If the ball isn't in the crop, widen the crop; after a few misses go back to ACQUIRE.

The result is one entry per frame: the ball's centre and size, or None for frames where it couldn't be found.
Gaps of a few frames are filled later by interpolation (see interpolate()).
"""

import os
from dataclasses import dataclass
from pathlib import Path

import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks.python import BaseOptions, vision
from analysis.video import open_video

MODELS = Path(__file__).resolve().parents[1] / "models"


@dataclass
class BallPoint:
    x: float  # centre, pixels
    y: float
    size: float  # bounding-box diameter, pixels
    score: float
    source: str  # "frame" (whole-frame search), "crop" (zoomed search) or "interp" (filled in)


def _detector(model: str, threshold: float) -> vision.ObjectDetector:
    return vision.ObjectDetector.create_from_options(
        vision.ObjectDetectorOptions(
            base_options=BaseOptions(model_asset_path=str(MODELS / model)),
            running_mode=vision.RunningMode.IMAGE,
            score_threshold=threshold,
            category_allowlist=["sports ball"],
            max_results=5,
        )
    )


class BallTracker:
    def __init__(self, crop_balls: float = 6.0, max_misses: int = 6):
        # Whole-frame search uses the bigger, more accurate model; zoomed search the small fast one.
        # PITCHIQ_MODELS=int8 uses the 8-bit versions (less memory; spike 3). PITCHIQ_FULL_DETECTOR overrides the
        # whole-frame model (tried: lite0 for both searches lost a third of the touches).
        suffix = "_int8" if os.environ.get("PITCHIQ_MODELS") == "int8" else ""
        self.full = _detector(os.environ.get("PITCHIQ_FULL_DETECTOR", f"efficientdet_lite2{suffix}.tflite"), threshold=0.25)
        self.zoom = _detector(f"efficientdet_lite0{suffix}.tflite", threshold=0.15)
        self.crop_balls = crop_balls  # crop width in ball diameters
        self.max_misses = max_misses
        self.last: BallPoint | None = None
        self.misses = 0

    def close(self):
        self.full.close()
        self.zoom.close()

    @staticmethod
    def _best(detections, offset_x=0, offset_y=0, scale=1.0, near: BallPoint | None = None) -> BallPoint | None:
        best, best_rank = None, -1.0
        for d in detections:
            b = d.bounding_box
            x = offset_x + (b.origin_x + b.width / 2) / scale
            y = offset_y + (b.origin_y + b.height / 2) / scale
            size = max(b.width, b.height) / scale
            score = d.categories[0].score
            rank = score
            if near is not None:  # prefer the candidate closest to where the ball was
                rank -= 0.5 * min(1.0, np.hypot(x - near.x, y - near.y) / (4 * near.size))
            if rank > best_rank:
                best, best_rank = BallPoint(x, y, size, score, "crop" if near else "frame"), rank
        return best

    def _search_frame(self, rgb: np.ndarray) -> BallPoint | None:
        result = self.full.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb))
        return self._best(result.detections)

    def _search_crop(self, rgb: np.ndarray, around: BallPoint, widen: float) -> BallPoint | None:
        h, w = rgb.shape[:2]
        half = max(48, around.size * self.crop_balls * widen / 2)
        x0, y0 = int(max(0, around.x - half)), int(max(0, around.y - half))
        x1, y1 = int(min(w, around.x + half)), int(min(h, around.y + half))
        crop = rgb[y0:y1, x0:x1]
        if crop.size == 0:
            return None
        scale = 320 / max(crop.shape[:2])  # the model's input size: the ball now fills a good part of it
        crop = cv2.resize(crop, None, fx=scale, fy=scale, interpolation=cv2.INTER_LINEAR)
        result = self.zoom.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(crop)))
        return self._best(result.detections, x0, y0, scale, near=around)

    def update(self, frame_bgr: np.ndarray) -> BallPoint | None:
        rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        found = None
        if self.last is not None:
            found = self._search_crop(rgb, self.last, widen=1.0 + 0.5 * self.misses)
        if found is None and (self.last is None or self.misses >= 2):
            found = self._search_frame(rgb)
        if found is not None:
            self.last, self.misses = found, 0
        else:
            self.misses += 1
            if self.misses > self.max_misses:
                self.last = None
        return found


def track_video(path: Path, every: int = 1) -> tuple[list[BallPoint | None], float, tuple[int, int]]:
    """Track the ball through a video. Returns one point (or None) per frame, the fps and the frame size."""
    cap = open_video(path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    size = (int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)))
    tracker, points, i = BallTracker(), [], 0
    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            points.append(tracker.update(frame) if i % every == 0 else None)
            i += 1
    finally:
        tracker.close()
        cap.release()
    return points, fps, size


def interpolate(points: list[BallPoint | None], max_gap: int = 6) -> list[BallPoint | None]:
    """Fill short gaps (up to max_gap frames) by straight-line interpolation; longer gaps stay empty."""
    out = list(points)
    known = [i for i, p in enumerate(points) if p is not None]
    for a, b in zip(known, known[1:]):
        if 1 < b - a <= max_gap + 1:
            pa, pb = points[a], points[b]
            for k in range(a + 1, b):
                t = (k - a) / (b - a)
                out[k] = BallPoint(pa.x + t * (pb.x - pa.x), pa.y + t * (pb.y - pa.y),
                                   pa.size + t * (pb.size - pa.size), 0.0, "interp")
    return out
