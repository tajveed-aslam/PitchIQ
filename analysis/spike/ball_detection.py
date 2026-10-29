"""Spike 1: how reliably can an off-the-shelf detector find the ball, and how fast on a CPU?

For each clip and each detector model: the share of frames where a "sports ball" is found, the average confidence,
and the time per frame.  Run:  python -m analysis.spike.ball_detection data/raw/mixkit-43487.mp4 ...
"""

import sys
import time
from pathlib import Path

import cv2
import mediapipe as mp
from mediapipe.tasks.python import BaseOptions, vision

MODELS = Path(__file__).resolve().parents[2] / "models"


def detector(model_file: str, threshold: float = 0.2) -> vision.ObjectDetector:
    options = vision.ObjectDetectorOptions(
        base_options=BaseOptions(model_asset_path=str(MODELS / model_file)),
        running_mode=vision.RunningMode.VIDEO,
        score_threshold=threshold,
        category_allowlist=["sports ball"],
        max_results=3,
    )
    return vision.ObjectDetector.create_from_options(options)


def measure(clip: Path, model_file: str) -> dict:
    cap = cv2.VideoCapture(str(clip))
    fps = cap.get(cv2.CAP_PROP_FPS)
    found, scores, frames, elapsed = 0, [], 0, 0.0
    with detector(model_file) as det:
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            image = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            t = time.perf_counter()
            result = det.detect_for_video(image, int(frames * 1000 / fps))
            elapsed += time.perf_counter() - t
            frames += 1
            if result.detections:
                found += 1
                scores.append(max(d.categories[0].score for d in result.detections))
    return {
        "frames": frames,
        "ball_found_pct": round(100 * found / frames, 1),
        "avg_score": round(sum(scores) / len(scores), 2) if scores else 0,
        "ms_per_frame": round(1000 * elapsed / frames, 1),
    }


if __name__ == "__main__":
    for path in sys.argv[1:]:
        for model in ("efficientdet_lite0.tflite", "efficientdet_lite2.tflite"):
            print(Path(path).stem, model.split(".")[0], measure(Path(path), model))
