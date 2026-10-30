# PitchIQ

**Film a football juggling session on your phone; PitchIQ counts your touches with computer vision, measures your
rhythm and ball control, and an AI coach turns those numbers into feedback and drills.**

Two editions from one codebase: **Lite** (built first, for players on slow and expensive mobile data) and **Main**
(the full training platform, next). A portfolio project: payments are in test mode.

- Live: Lite: _coming soon_ · Main: _coming soon_
- How to try it with the built-in sample videos: [docs/HOW_TO_TEST.md](docs/HOW_TO_TEST.md)

## How it works

```
 Phone ──(data saver: WebCodecs → 480p MP4)──► Next.js (Vercel) ──► FastAPI (Render) ──► Neon Postgres
                                                                        │   ▲ polls
                                                                        ▼   │
                                                      Analysis worker (Hugging Face Space)
                                                      MediaPipe EfficientDet + our tracking & counting
                                                                        │ report (JSON, schema v1)
                                                                        ▼
                                                      Gemini (flash-lite) writes coaching FROM the numbers,
                                                      checked; rule-based fallback
```

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
**68 of 74 touches found (92%), 92% of reported touches real, every count within ±2, every true count inside the
reported range.** Method, numbers, what was tried and dropped, and limitations: [docs/MODEL_ACCURACY.md](docs/MODEL_ACCURACY.md).

## Features (Lite)

Landing page · sample library (analyse live, download, compare with the hand count) · sign-up, login, shared demo
player · profile and player card (ratings from your own sessions) · upload with an on-device data saver · live
analysis stages · report (count, range, pace, rhythm, control, touch timeline) · AI coaching with drills · reports
list · plans with allowances (test mode) · monthly challenge leaderboard · help chat, FAQ, contact.

## Repository

| Folder | What |
|---|---|
| `analysis/` | Computer vision: tracking, touch counting, camera motion, report builder, model download, spikes |
| `worker/` | HTTP service around the analysis (jobs, limits), Dockerfile and Space deploy script |
| `backend/` | FastAPI API: auth, profile, plans, analysis jobs, coaching, events, support, seed data |
| `frontend/` | Next.js 14 + Tailwind; `NEXT_PUBLIC_EDITION=lite|main` picks the edition |
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

- **API:** Render Blueprint (`render.yaml`, Docker, Frankfurt). Env: `DATABASE_URL` (Neon), `WORKER_URL`,
  `WORKER_KEY`, `GEMINI_API_KEY`, `FRONTEND_ORIGINS`.
- **Worker:** Hugging Face Space (Docker): `HF_TOKEN=… HF_SPACE=<user>/pitchiq-worker WORKER_KEY=… python -m worker.deploy_space`.
- **Web:** two Vercel projects from `frontend/` (`NEXT_PUBLIC_EDITION=lite` and `main`, `NEXT_PUBLIC_API_URL`).

## Credits

Sample videos and site photos: Mixkit (Free License). Models: Google MediaPipe (Apache 2.0). Testimonials and
leaderboard players are fictional and labelled. Details: [docs/CREDITS.md](docs/CREDITS.md).
