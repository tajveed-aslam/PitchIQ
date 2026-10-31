# Model accuracy: juggling touch counter

How accurate PitchIQ's touch count is, how that was measured, and where it fails. Numbers here come from
`analysis/spike/evaluate_juggling.py` (originals) and `analysis/samples.py` (the 480p files the site serves).

## Ground truth

- Clips: Mixkit stock footage (see [CREDITS](CREDITS.md)). Each was reviewed frame by frame (every second frame,
  12 fps, plus every frame around unclear moments) and every touch time written to
  [`data/ground_truth.json`](../data/ground_truth.json).
- Counting rule: every contact that sends the ball up counts, including the first lift and re-lifts after a drop.
  Ground bounces, "around the world" circles (foot goes round the ball without touching it) and the final trap
  don't count.
- A detected touch "matches" a true one if it is within 0.25 s. From that: recall (true touches found), precision
  (reported touches that are real) and count error.

## Discipline: tune, develop, then test blind

| Clip | Role | Why |
|---|---|---|
| 42524 | Tuning | The counter's thresholds were set on this clip. |
| 43490 | Development | Used to find failure types (occlusion at contact, ball resting on the ground). Fixes were general physics, not per-clip tweaks. |
| 43487 | **Blind test** | Hand-counted, then run once with the counter frozen. One rule was added afterwards (below) and is reported separately. |
| 43513 | Quality-gate case | The camera zooms throughout: the app must reject it, not count it. |

## Production numbers (what the live site does)

Measured by `.github/workflows/accuracy.yml` on Linux (the platform the API runs on), with the 8-bit models and the
480p files the site serves, matching touch by touch against the ground truth:

| Clip | Truth | Model | Likely range | Found | Invented |
|---|---|---|---|---|---|
| 42524 | 16 | 15 | 10–17 | 15 | 0 |
| 43490 | 19 | 16 | 13–21 | 15 | 1 |
| 43487 | 39 | 39 | 38–41 | 37 | 2 |

**67 of 74 touches found (90%), 3 invented (96% of reported touches are real), every count within ±3, every true
count inside the reported range.** The site's claims use these numbers.

Why 8-bit models: on the free server (512 MB shared with the API) the original 32-bit models peaked at ~520 MB for a
480p video on Linux and crashed the server; the 8-bit versions peak at ~400 MB (spike 3, `.github/workflows/memory.yml`).
8-bit maths is not bit-identical across platforms: the same files give 19/39/16 on Windows and 16/39/15 on Linux, so
production accuracy is measured on Linux.

## Development results

### Original clips (720p, tracking every 2nd frame as in production)

| Clip | Truth | Model | Likely range | Found | Invented |
|---|---|---|---|---|---|
| 42524 (tuning) | 16 | 16 | 14–18 | 16 | 0 |
| 43490 (development) | 19 | 17 | 14–19 | 17 | 0 |
| 43487 (blind, counter frozen) | 39 | 43 | 41–45 ✗ | 35 | 8 |
| 43487 (after the size rule) | 39 | 41 | 39–44 | 35 | 6 |

All three clips after the size rule: **68 of 74 true touches found (92%), 6 invented (92% of reported touches
are real), every count within ±2, and every true count inside the reported range.**

### The 480p files served by the site

| Sample | Truth | Model | Range | Quality check |
|---|---|---|---|---|
| Floodlit freestyle (43490) | 19 | 17 | 12–20 | ok |
| Long session (43487) | 39 | 38 | 36–39 | ok |
| Street pitch (42524) | 16 | 14 | 8–18 | ok |
| Garage session (43513) | – | – | – | **rejected: camera moving** |

## What changed the numbers (and what didn't)

| Finding | Effect | Kept? |
|---|---|---|
| A median filter flattened the bottom of each bounce | missed touches | Removed: outlier-only cleaning |
| The foot hides the ball exactly at contact (2–4 frames) | straight-line gap filling cut off the touch | **Ballistic gap filling**: gravity from the ball's size (22 cm), the two flight parabolas intersected |
| Ball resting on the ground, then lifted | touch placed at the wrong moment | Back-extrapolate the rising ball to ground level |
| Ball flying at the camera (2× its usual size) | false touches after a missed bicycle kick | Ignored as out of the player's plane (added after the blind run) |
| Dropping lone detections; ignoring balls at the frame edge | deleted real bounce bottoms | Tried and dropped |
| Pose-based "body contact" check | in 2D a player lying beside a bouncing ball looks in contact | Tried and dropped |
| Video compression | 480p CRF 30 lost a third of the touches; CRF 20 matches the original | Samples and the data saver keep ~1–1.5 Mbit/s |
| Tracking every 2nd frame | same accuracy, half the time (1.37× real time instead of 2.7×) | Production setting |

## Known limitations

- A touch while the ball is out of the picture (e.g. a high kick above the frame) can't be seen: it is covered by
  the top of the range instead.
- A ground bounce right next to the foot can be counted as a touch (16.27 s in 43487).
- Low, quick kicks in dim light can be missed when the tracker loses the ball (glare from floodlights).
- Moving cameras are rejected by the quality check (0–6% "moving" on still clips vs 54–93% on moving ones).
- Only three accuracy clips. Before any real release, a fresh blind set is needed: 43487 has now been looked at.

## Regression guard

CI runs the real pipeline on two sample files on Linux and fails if a count leaves its band
(`worker/tests/test_worker.py`), so a model or library change can't silently lower accuracy.
