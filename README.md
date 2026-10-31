# PitchIQ

**Film a football juggling session on your phone; PitchIQ counts your touches with computer vision, measures your
rhythm and ball control, and an AI coach turns those numbers into feedback and drills.**

Two editions on one site, picked with the **region switch** in the header: **Africa** = PitchIQ Lite (built first,
for players on slow and expensive mobile data; the default) and **Global** = the full platform (next phase: shows a
coming-soon page in its own design for now). One API and database serve both. A portfolio project: payments are in
test mode.

- Live: Lite: _coming soon_ · Main: _coming soon_
- How to try it with the built-in sample videos: [docs/HOW_TO_TEST.md](docs/HOW_TO_TEST.md)

## How it works

```
 Phone ──(data saver: WebCodecs → 480p MP4)──► Next.js (Vercel) ──► FastAPI (Render) ──► Neon Postgres
                                                                        │
                                                       analysis in the API process, one job at a time:
                                                       MediaPipe EfficientDet + our tracking & counting
                                                                        │ report (JSON, schema v1)
                                                                        ▼
                                                       Gemini (flash-lite) writes coaching FROM the numbers,
                                                       checked; rule-based fallback
```

On the free Render plan (0.1 CPU) an analysis takes about 12× the video's length (about 3 minutes for a 15 s clip), so
videos are limited to 60 s and the sample library shows pre-computed results. The analysis can also run as a
separate service (`worker/`, set `WORKER_URL`) on a host with more CPU.

1. **Quality check:** background optical flow + RANSAC detects a moving camera; the video is rejected rather than
   miscounted.
2. **Ball tracking:** an off-the-shelf detector finds the ball in only 17–67% of frames, so the tracker zooms into a
   crop around the last position (and runs on every 2nd frame: same accuracy, half the time).
3. **Touch counting:** turning points in the ball's height. The foot hides the ball exactly at contact, so gaps are
   filled with **ballistics**: gravity in pixels from the ball's known size, the flight parabolas before and after
   the gap intersected. The result is a count, a likely range and the time of every touch.
4. **Coaching:** Gemini gets only the measured facts and picks drills from a fixed library. Replies with numbers that
   weren't measured, or that contradict the measured rhythm/control, are rejected and replaced by rule-based coaching.

## Accuracy

Hand-counted ground truth, with a tuning clip, a development clip and a **blind** test clip:
on the production server (Linux, 8-bit models, the 480p files the site serves): **67 of 74 touches found (90%),
96% of reported touches real, every count within ±3, every true count inside the reported range.** Method, numbers, what was tried and dropped, and limitations: [docs/MODEL_ACCURACY.md](docs/MODEL_ACCURACY.md).

## Features (Lite)

Landing page · sample library (analyse live, download, compare with the hand count) · sign-up, login, shared demo
player · profile and player card (ratings from your own sessions) · upload with an on-device data saver · live
analysis stages · report (count, range, pace, rhythm, control, touch timeline) · AI coaching with drills · reports
list · plans with allowances (test mode) · monthly challenge leaderboard · help chat, FAQ, contact.

## Repository

| Folder | What |
|---|---|
| `analysis/` | Computer vision: tracking, touch counting, camera motion, report builder, model download, spikes |
| `worker/` | Analysis jobs (one at a time, limits); runs inside the API, or as its own HTTP service |
| `backend/` | FastAPI API: auth, profile, plans, analysis jobs, coaching, events, support, seed data |
| `frontend/` | Next.js 14 + Tailwind; `app/[edition]/` pages, per-edition themes (CSS variables) and region switch |
| `e2e/` | Playwright end-to-end and accessibility tests |
| `data/ground_truth.json` | Hand-counted touches for the accuracy clips |
| `docs/` | Test plan, test cases, RTM, bug reports, model accuracy, how to test, credits |

## Run it locally

Requires Python 3.12+ and Node 20+.

```bash
python -m venv .venv && .venv/Scripts/activate        # macOS/Linux: source .venv/bin/activate
pip install -r backend/requirements-dev.txt -r worker/requirements.txt
python -m analysis.get_models                          # MediaPipe models, checked by SHA-256

cd backend && cp .env.example .env                     # add GEMINI_API_KEY for AI coaching (optional)
python -m app.seed                                     # demo player + leaderboard
uvicorn app.main:app --port 8010                       # analysis runs in-process when WORKER_URL is empty

cd ../frontend && cp .env.example .env.local && npm install && npm run dev   # http://localhost:3000
```

## Tests

```bash
cd backend && python -m pytest                         # API (fast, fake worker fed real reports)
python -m pytest worker/tests                          # worker + accuracy regression (real pipeline)
cd e2e && npm install && npx playwright test           # E2E on desktop Chrome, Pixel 7, iPhone 14 + axe
```

CI (GitHub Actions) runs the API tests, frontend lint and build, and the worker/accuracy tests on Linux on every push.
Test plan, cases, traceability and results: [docs/TEST_PLAN.md](docs/TEST_PLAN.md), [docs/RTM.md](docs/RTM.md).

## Deploy

- **API + analysis:** Render Blueprint (`render.yaml`, root `Dockerfile`, Frankfurt, free plan). Env:
  `DATABASE_URL` (Neon), `GEMINI_API_KEY`, `FRONTEND_ORIGINS`; limits `MAX_UPLOAD_MB=25`, `MAX_VIDEO_SECONDS=60`.
  Measured peak memory during an analysis: ~410 MB of the 512 MB.
- **Web:** one Vercel project from `frontend/` (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SAMPLE_MODE=stored`). The region
  switch sets a cookie; `middleware.ts` serves `app/[edition]/…` (both editions prerendered). Later the default can
  come from the visitor's country (Vercel's `x-vercel-ip-country`).
- **Optional separate worker:** `worker/Dockerfile` + `python -m worker.deploy_space` (Hugging Face Docker Spaces
  now need a paid plan).

## Credits

Sample videos and site photos: Mixkit (Free License). Models: Google MediaPipe (Apache 2.0). Testimonials and
leaderboard players are fictional and labelled. Details: [docs/CREDITS.md](docs/CREDITS.md).
