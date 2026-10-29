"""Spike 2a: does zoomed tracking find the ball in more frames than plain detection, and how fast is it?

Also saves a plot of the ball's height over time per clip (to scratch/out dir), which is the signal touches are
counted from: in image coordinates y grows downwards, so every "bounce" (a touch) is a local maximum of y.
Run:  python -u -m analysis.spike.tracking_coverage OUT_DIR data/raw/mixkit-43487.mp4 ...
"""

import sys
import time
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

from analysis.tracking import interpolate, track_video  # noqa: E402

if __name__ == "__main__":
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    for clip in map(Path, sys.argv[2:]):
        t = time.perf_counter()
        points, fps, size = track_video(clip)
        took = time.perf_counter() - t
        filled = interpolate(points)
        n = len(points)
        raw = sum(p is not None for p in points)
        fil = sum(p is not None for p in filled)
        crop = sum(p is not None and p.source == "crop" for p in points)
        print(f"{clip.stem}: {n} frames | found {100*raw/n:.0f}% (zoom {100*crop/n:.0f}%) | after gap-fill "
              f"{100*fil/n:.0f}% | {1000*took/n:.0f} ms/frame | {took/(n/fps):.1f}x real time")

        ts = [i / fps for i, p in enumerate(filled) if p is not None]
        ys = [size[1] - p.y for p in filled if p is not None]  # flip so "up" is up on the plot
        plt.figure(figsize=(14, 3))
        plt.plot(ts, ys, ".", markersize=2)
        plt.title(f"{clip.stem}: ball height over time (px from bottom)")
        plt.xlabel("seconds")
        plt.tight_layout()
        plt.savefig(out / f"{clip.stem}-height.png", dpi=90)
        plt.close()
