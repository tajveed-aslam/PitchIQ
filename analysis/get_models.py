"""Download the vision models into models/ (they're not in git), checking each file's SHA-256 so every machine,
CI run and the worker image use exactly the files the accuracy tests were run with.

Run:  python -m analysis.get_models          (skips files that are already present and correct)
"""

import hashlib
import sys
import urllib.request
from pathlib import Path

MODELS = Path(__file__).resolve().parents[1] / "models"
BASE = "https://storage.googleapis.com/mediapipe-models"

# name: (url, sha256). Apache 2.0, by Google (MediaPipe). The float32 detectors are the ones tested in the spikes.
FILES = {
    "efficientdet_lite0.tflite": (f"{BASE}/object_detector/efficientdet_lite0/float32/latest/efficientdet_lite0.tflite",
                                  "40338edf5ec70d43e318b0a716a84d4564cd1802759a7a07170c7e43796dbf58"),
    "efficientdet_lite2.tflite": (f"{BASE}/object_detector/efficientdet_lite2/float32/latest/efficientdet_lite2.tflite",
                                  "ad2abbf2b4e10585e15176fd7b5ef03c28dda959ae26fc142549fdd1814db91d"),
    # 8-bit versions: less memory on the free server (spike 3), PITCHIQ_MODELS=int8.
    "efficientdet_lite0_int8.tflite": (f"{BASE}/object_detector/efficientdet_lite0/int8/latest/efficientdet_lite0.tflite",
                                       "0720bf247bd76e6594ea28fa9c6f7c5242be774818997dbbeffc4da460c723bb"),
    "efficientdet_lite2_int8.tflite": (f"{BASE}/object_detector/efficientdet_lite2/int8/latest/efficientdet_lite2.tflite",
                                       "b3f50554cb0ea559e90328845f7d9ba4d13c8bff372914d24e06bc8bb72fa896"),
    "pose_landmarker_full.task": (f"{BASE}/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task",
                                  "4eaa5eb7a98365221087693fcc286334cf0858e2eb6e15b506aa4a7ecdcec4ad"),
}


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()


def main(names: list[str]) -> int:
    MODELS.mkdir(exist_ok=True)
    for name in names or list(FILES):
        url, expected = FILES[name]
        path = MODELS / name
        if path.exists() and sha256(path) == expected:
            print(f"ok      {name}")
            continue
        print(f"get     {name}")
        tmp = path.with_suffix(".part")
        urllib.request.urlretrieve(url, tmp)
        if sha256(tmp) != expected:
            tmp.unlink()
            print(f"FAILED  {name}: checksum mismatch (the published model changed?)", file=sys.stderr)
            return 1
        tmp.replace(path)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
