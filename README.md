# PitchIQ

**Film a football juggling session on your phone; PitchIQ counts your touches with computer vision, measures your
rhythm and ball control, and an AI coach turns those numbers into feedback and drills.**

Two editions on one site, picked with the **region switch** in the header, each with its own design:

- **Africa = PitchIQ Lite** (the default): built for slow, expensive mobile data. Small pages, on-device video
  shrinking, one skill done properly.
- **Global = the full platform**: a measured player card with mindset, reaction and logic tests, comparisons and
  analytics, AI weekly training plans, challenges and badges, and coach rooms for squads and academy trials.

One API and one database serve both. A portfolio project: payments are in test mode.

- Live: https://pitch-iq-psi.vercel.app (pick **Global** top right for the full platform)
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

## Features (Global)

Its own design ("stadium gold": warm black, gold and violet, Sora display type, glass panels, real photos) and its own
pages; a command-centre layout with a sidebar on desktop and a tab bar on phones.

- **Player card:** FIFA-style gold card. Skill ratings come only from analysed videos; skills the pipeline can't
  measure yet (dribbling, passing, shooting) say "not measured". Overall = average of the measured skills. Physical
  profile, mindset self-assessment (12 statements, reversed items), reaction test (median of 5 taps, impossible
  timings refused) and logic puzzles (graded on the server from a signed seed, so answers never reach the browser).
- **Analysis:** reports library (search, sort, filter), an "analysis command centre" per report (range bar, timeline,
  gap between touches, quality check, coaching), compare any two sessions, progress analytics with a trend line,
  personal bests and consistency.
- **AI weekly training plans:** 5 training days and 2 rest days from the player's numbers. Gemini only arranges
  library drills; replies with invented drills or numbers, the wrong shape, or field names read aloud are replaced by
  a rule-based plan.
- **Challenges and badges:** the monthly challenge, 11 badges earned from real data, team milestones.
- **Coach rooms (Coach plan):** team squads or academy trials; join codes that expire after 7 days; tasks with
  deadlines, targets and notes; hand-ins scored out of 100 with feedback; reminders 2 days before a deadline; a team
  dashboard with automatic insights (average rising or falling, players gone quiet, overdue tasks); player drawers
  with cards and reports; scouting notes and a pass/fail bar for trials. Players only ever see their own tasks.
- **Everywhere:** notifications (with settings), a docked AI assistant answering from the Global FAQ, demo player and
  demo coach accounts.

## Repository

| Folder | What |
|---|---|
| `analysis/` | Computer vision: tracking, touch counting, camera motion, report builder, model download, spikes |
| `worker/` | Analysis jobs (one at a time, limits); runs inside the API, or as its own HTTP service |
| `backend/` | FastAPI API: auth, profile, plans, analysis jobs, coaching, events, support, seed data; Global: `routers/player.py` (card, tests, badges, plans), `insights.py` (progress, compare), `rooms.py` |
| `frontend/` | Next.js 14 + Tailwind. `app/lite/` and `app/main/` (its own components in `components/main/`), per-edition themes (CSS variables), `middleware.ts` serves the visitor's edition |
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
python -m app.seed                                     # demo player, demo coach, rooms, leaderboard
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

- **API + analysis:** Render Blueprint (`render.yaml`, root `Dockerfile`, free plan). Env:
  `DATABASE_URL` (Neon), `GEMINI_API_KEY`, `FRONTEND_ORIGINS`; limits `MAX_UPLOAD_MB=25`, `MAX_VIDEO_SECONDS=60`.
  Measured peak memory during an analysis: ~410 MB of the 512 MB.
- **Web:** one Vercel project from `frontend/` (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SAMPLE_MODE=stored`). The region
  switch sets a cookie; `middleware.ts` serves `app/lite/…` or `app/main/…` at the same URLs. Later the default can
  come from the visitor's country (Vercel's `x-vercel-ip-country`).
- **Database:** Global added tables only (`create_all` creates them on start), so the live database needed no
  migration; the seed adds the Global demo data on every start.
- **Optional separate worker:** `worker/Dockerfile` + `python -m worker.deploy_space` (Hugging Face Docker Spaces
  now need a paid plan).

## Credits

Sample videos and site photos: Mixkit (Free License). Models: Google MediaPipe (Apache 2.0). Testimonials and
leaderboard players are fictional and labelled. Details: [docs/CREDITS.md](docs/CREDITS.md).
