"""Spike 3: peak memory of one analysis on Linux (Render's free plan has 512 MB, shared with the API).

Runs each video in a fresh process (so peaks don't carry over) and prints its peak RSS and touch count.
Run (Linux):  python -m analysis.spike.memory_check VIDEO [VIDEO...]
Env: PITCHIQ_MODELS=int8 for the 8-bit models.
"""

import json
import os
import subprocess
import sys

CHILD = """
import json, resource, sys, time
t = time.time()
import cv2
from analysis.report import analyse_juggling
libs = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
r = analyse_juggling(sys.argv[1])
print(json.dumps({"touches": r["metrics"]["touches"], "verdict": r["quality"]["verdict"], "seconds": round(time.time() - t),
                  "after_import_mb": round(libs / 1024),
                  "peak_mb": round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024),
                  "cv2": cv2.__file__.split("site-packages/")[-1].split("/")[0]}))
"""

if __name__ == "__main__":
    detector = os.environ.get("PITCHIQ_MODELS", "float32")
    for video in sys.argv[1:]:
        out = subprocess.run([sys.executable, "-c", CHILD, video], capture_output=True, text=True)
        line = out.stdout.strip().splitlines()[-1] if out.stdout.strip() else out.stderr[-400:]
        print(f"{os.path.basename(video):28} models {detector:8} {line}", flush=True)
