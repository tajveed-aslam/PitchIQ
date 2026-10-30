# Test plan: PitchIQ Lite

## Scope

**In scope (Lite edition, web):** landing page, sample library, accounts (sign-up, login, demo), profile and player
card, upload with the data saver, analysis jobs and reports, AI coaching, plans and gating (test mode), monthly
challenge, support (FAQ, contact, help chat), the analysis worker and the touch-counting model.

**Out of scope for this release:** the Main edition (player card questionnaire, comparisons, coach rooms), native
mobile apps, real payments, dribbling and other skills.

## Risks and how they're covered

| Risk | Impact | Coverage |
|---|---|---|
| Wrong touch counts | The product's core claim | Hand-counted ground truth, blind test clip, regression band in CI ([MODEL_ACCURACY](MODEL_ACCURACY.md)) |
| AI coaching invents numbers or contradicts the measurement | Misleading feedback | Groundedness, contradiction and drill-library checks with rule-based fallback; unit tests with recorded replies |
| Bad videos analysed as if fine | Confidently wrong reports | Quality gate (camera motion, ball visibility); moving-camera sample must be rejected (TC-SMP-03) |
| Upload failures on slow or expensive data | Users give up | Data saver, size/type/length limits, clear errors; upload tested on desktop and phone profiles |
| Plan gating leaks (or blocks paying users) | Trust | API tests for every allowance rule; E2E plan switching |
| Private data exposed | Trust, legal | Ownership checks, signed thumbnail URLs, videos deleted after analysis |
| Slow pages on mid-range phones | Lite's promise | First-load JS budget (≤ 120 kB per page), Lighthouse mobile on the live site |
| Inaccessible UI | Excludes users | axe WCAG 2 A/AA checks on every page, keyboard focus styles |
| Third-party outages (Gemini, worker asleep) | Broken pages | Fallbacks: rule-based coaching, FAQ chat, stored sample results; tests for each |

## Levels

| Level | Tool | Where | What |
|---|---|---|---|
| Unit + API | pytest (43 tests) | `backend/tests` | Auth, profile, plans/allowances, job flow with a fake worker fed real reports, coaching checks, samples, leaderboard, support |
| Worker + model regression | pytest, real pipeline (6 tests) | `worker/tests` | HTTP contract, bad inputs, corrupt files, sample counts within bands, videos deleted |
| Model accuracy | evaluation scripts | `analysis/spike/evaluate_juggling.py` | Precision/recall/count error against ground truth |
| End to end | Playwright (25 cases × 3 devices) | `e2e/` | User journeys on desktop Chrome, Pixel 7 (Chromium) and iPhone 14 (WebKit) against the real stack |
| Accessibility | axe-core in Playwright | `e2e/tests/a11y.spec.ts` | WCAG 2 A/AA, serious and critical violations fail |
| Performance | Next.js build output, Lighthouse | build log, live site | First-load JS per page; Lighthouse mobile scores |
| CI | GitHub Actions | `.github/workflows/ci.yml` | API tests, frontend lint and build, worker + model regression on Linux, on every push |

## Environments

- **Local:** API with the in-process worker (`WORKER_URL` empty), Next.js production build on port 3100, SQLite.
- **CI:** Ubuntu, Python 3.12, Node 20.
- **Live:** Vercel (two editions), Render (API), Hugging Face Space (worker), Neon Postgres.

## Entry and exit criteria

- Entry: the build compiles, API and worker tests pass in CI.
- Exit: all automated tests pass in **three consecutive full runs** with retries off (any flake is reported, not
  hidden), no open critical/high bugs, every requirement in the [RTM](RTM.md) covered by at least one passing test.

## Defects

Logged in [BUG_REPORTS.md](BUG_REPORTS.md) with steps, expected/actual, fix and the test that guards it. Only real,
reproduced defects are listed.
