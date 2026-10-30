"""Build the sample library the website shows: the real analysis report for each sample clip, next to its
hand-counted ground truth, so visitors can see how accurate the model is.

Runs on the exact compressed files the site serves (frontend/public/samples/*.mp4, 480p), not the originals.
Writes frontend/data/samples.json. Run:  python -u -m analysis.samples
"""

import json
from pathlib import Path

from analysis.report import analyse_juggling

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "frontend/data/samples.json"

SAMPLES = [
    {"id": "juggling-43490", "clip": "mixkit-43490", "title": "Floodlit freestyle",
     "blurb": "Feet and knees under the lights, low camera. A clean test with one drop and a re-lift.",
     "level": "Intermediate"},
    {"id": "juggling-43487", "clip": "mixkit-43487", "title": "Long session, full body",
     "blurb": "39 touches in 22 seconds, with around-the-world tricks and a missed bicycle kick at the end.",
     "level": "Advanced"},
    {"id": "juggling-42524", "clip": "mixkit-42524", "title": "Street pitch rhythm",
     "blurb": "Close camera, head out of the picture. Steady foot and thigh touches.",
     "level": "Beginner"},
    {"id": "juggling-43513", "clip": "mixkit-43513", "title": "Garage session (moving camera)",
     "blurb": "The camera zooms out while filming. Try it to see the quality check ask for a re-film.",
     "level": "Quality check"},
]

if __name__ == "__main__":
    truth = json.loads((ROOT / "data/ground_truth.json").read_text())["clips"]
    out = []
    for s in SAMPLES:
        report = analyse_juggling(ROOT / "frontend/public/samples" / f"{s['id']}.mp4")
        gt = truth[s["clip"]]
        m = report["metrics"]
        print(f"{s['id']}: {m['touches']} touches (range {m['touches_range']}), truth {gt.get('touches', '-')}, "
              f"quality {report['quality']['verdict']}, {report['timing']['analysis_s']} s")
        out.append({**{k: v for k, v in s.items() if k != "clip"},
                    "video": f"/samples/{s['id']}.mp4", "poster": f"/samples/{s['id']}.jpg",
                    "credit": "Mixkit (Free License)",
                    "ground_truth": {"touches": gt.get("touches"), "touch_times_s": gt.get("touch_times"),
                                     "counted_by": "hand, frame by frame"},
                    "report": report})
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, indent=2) + "\n")
    print(f"wrote {OUT}")
