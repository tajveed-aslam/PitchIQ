"""Opening videos with a small, predictable memory footprint.

On the free server (0.1 CPU, 512 MB shared with the API) a phone video crashed the server: by default FFmpeg decodes
with one thread per CPU core it can see (many, on a shared host) and each keeps its own full-size frame buffers, and
OpenCV starts its own thread pool too. Measured on a 4K clip: 669 MB peak with ~30 threads. One decoding thread and
one OpenCV thread cost nothing at 0.1 CPU and keep memory near the 480p figure.
"""

from pathlib import Path

import cv2

cv2.setNumThreads(1)


def open_video(path: Path | str) -> cv2.VideoCapture:
    params = [cv2.CAP_PROP_N_THREADS, 1] if hasattr(cv2, "CAP_PROP_N_THREADS") else []
    cap = cv2.VideoCapture(str(path), cv2.CAP_FFMPEG, params)
    if not cap.isOpened():  # a backend that doesn't take the parameter: fall back to the default open
        cap = cv2.VideoCapture(str(path))
    return cap
