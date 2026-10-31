# Bug reports

Real defects found while building and testing PitchIQ (Lite, then Global). Each was reproduced, fixed, and covered by a test so it
can't come back. (Model accuracy findings are in [MODEL_ACCURACY.md](MODEL_ACCURACY.md).)

| ID | Severity | Area | Found by | Status |
|---|---|---|---|---|
| BUG-01 | High | Samples / data saver | Regenerating sample reports | Fixed |
| BUG-02 | High | Worker | Clean-environment worker test | Fixed |
| BUG-03 | Critical | Worker deploy | CI on Linux | Fixed |
| BUG-04 | High | Support page | Browser flow test | Fixed |
| BUG-05 | Medium | Plans | API tests | Fixed |
| BUG-06 | Low | Help chat | API tests | Fixed |
| BUG-07 | High | AI coaching / chat | Manual test with the real Gemini API | Fixed |
| BUG-08 | Medium | AI coaching | Manual review of Gemini output | Fixed |
| BUG-09 | Medium | Help chat | Code review after BUG-07 | Fixed |
| BUG-10 | Low | AI coaching | E2E (TC-AUTH-05) | Fixed |
| BUG-11 | Medium | Accessibility | E2E axe checks | Fixed |
| BUG-12 | Low | Performance | Lighthouse mobile | Fixed |
| BUG-13 | Critical | Deployment | Owner, on the live site | Fixed |
| BUG-14 | Critical | Analysis on the free server | Owner, on the live site | Fixed |
| BUG-15 | High | AI coaching on the free server | Live E2E run (server uptime reset mid-run) | Fixed |
| BUG-16 | Medium | Global: coach task reminders | API test (test_due_soon_tasks_send_one_reminder) | Fixed |
| BUG-17 | Medium | Seed / local database | Re-running the seed | Fixed |
| BUG-18 | High | Global on phones | Screenshot review at 390 px | Fixed |
| BUG-19 | Low | Global landing hero | Screenshot review | Fixed |
| BUG-20 | Medium | Global coach insights | Screenshot review of the demo coach | Fixed |
| BUG-21 | High | AI training plans | E2E with the real Gemini API (TC-MAIN-10 page snapshot) | Fixed |
| BUG-22 | Medium | Global accessibility | E2E axe checks | Fixed |
| BUG-23 | Low | Rule-based training plan | Screenshot review | Fixed |
| BUG-24 | Medium | Global reaction test | Three-run E2E check (run 6, iPhone) | Fixed |

---

### BUG-01: Compressed sample videos lose a third of the touches
- **Steps:** encode a sample to 480p with ffmpeg CRF 30; run the analysis.
- **Expected:** about the same count as the original (19 by hand on 43490).
- **Actual:** 13 on 43490, 12 instead of 16 on 42524. Heavy compression blurs the ball and the detector misses it.
- **Fix:** samples re-encoded at CRF 20 (counts match the originals); the browser data saver encodes at 1.5 Mbit/s.
- **Guard:** worker regression test on the served files (`worker/tests/test_worker.py`).

### BUG-02: An unreadable file is reported as analysed, with 0 touches
- **Steps:** upload a file of zeros named `broken.mp4`.
- **Expected:** "This file couldn't be read as a video."
- **Actual:** status `done`, 0 touches. OpenCV reports fps = −1 and frames = −1 for files it can't open, and
  −1/−1 = +1 s passed the length check.
- **Fix:** require the file to open, report positive fps and frames, and give a first frame.
- **Guard:** `test_unreadable_video_fails_cleanly`.

### BUG-03: Analysis crashes on Linux: `libEGL.so.1: cannot open shared object file`
- **Steps:** run the worker tests on Ubuntu (GitHub Actions).
- **Expected:** analyses complete as on Windows.
- **Actual:** every analysis failed: MediaPipe's task runtime loads EGL/GLES even on CPU.
- **Fix:** install `libegl1 libgles2` in CI and in the worker image. Would have broken the deployed worker.
- **Guard:** the CI worker job.

### BUG-04: Support page crashes ("destroy is not a function")
- **Steps:** open /support in a current Chromium.
- **Expected:** FAQ and chat load.
- **Actual:** React error; the page stops working. An effect returned `scrollIntoView()`, which now returns a
  Promise in new browsers, and React treats a returned value as a cleanup function.
- **Fix:** effects never return expressions (all effect bodies use braces).
- **Guard:** TC-SUP-01.

### BUG-05: Running a built-in sample used up the free trial
- **Steps:** trial user (3 analyses) analyses a sample from the dashboard.
- **Expected:** samples are free; allowance stays 3.
- **Actual:** allowance dropped to 2.
- **Fix:** only the user's own uploads count. **Guard:** `test_sample_analysis_does_not_use_allowance`.

### BUG-06: Off-topic chat question gets a filming answer
- **Steps:** with no AI key, ask "Write me a poem about cats".
- **Expected:** the polite "I can help with PitchIQ…" reply.
- **Actual:** the filming FAQ answer, matched on the word "about" ("about 4–6 metres").
- **Fix:** common words ignored in FAQ matching. **Guard:** `test_faq_contact_and_chat_fallback`.

### BUG-07: AI coach times out; chat answers cut off mid-sentence
- **Steps:** analyse with `gemini-flash-latest`.
- **Expected:** coaching within a few seconds.
- **Actual:** 24 s to 60+ s per reply ("thinking" tokens), so the 25 s limit fell back to rule-based coaching; in
  chat, thinking used up the 300-token limit and replies were truncated ("Videos are rejected if the camera moves").
- **Fix:** `gemini-flash-lite-latest` (2–3 s, complete replies).

### BUG-08: AI coach contradicts the measurement
- **Steps:** analyse 43487 (measured rhythm: uneven).
- **Expected:** feedback consistent with "uneven".
- **Actual:** "You kept a steady pace throughout"; drills like "Single Touch Juggling (15 successful catches)".
- **Fix:** replies are checked for contradictions with the measured rhythm/control and must pick drills from a fixed
  library (how-to and reps come from the library). Failing replies fall back to rule-based coaching.
- **Guard:** `test_contradicting_the_measured_rhythm_or_control_is_caught`, `test_drills_must_come_from_the_library`.

### BUG-09: Help chat could hang a request
- **Actual:** the chat called Gemini without a time limit (coaching had one).
- **Fix:** shared `run_with_timeout`; chat falls back to the FAQ.

### BUG-10: Some reports had only two drills
- **Steps:** demo report "Best one yet" (good rhythm and control).
- **Expected:** three drills like every other report.
- **Actual:** two: the rule-based coach only added drills for weaknesses.
- **Fix:** always three distinct drills. **Guard:** TC-AUTH-05 and `test_every_sample_report_fits_the_contract`.

### BUG-11: Low-contrast small text (WCAG AA)
- **Steps:** axe on /login and the dashboard.
- **Actual:** "or log in" divider and notification dates at 40–45% opacity: contrast below 4.5:1.
- **Fix:** no body text below 60% opacity on navy. **Guard:** the axe tests on every page.

### BUG-12: Login page jumps while loading (layout shift 0.178)
- **Steps:** Lighthouse mobile on /login.
- **Expected:** cumulative layout shift below 0.1.
- **Actual:** 0.178: the form (inside a Suspense boundary for the `?next=` parameter) rendered empty first, then
  pushed the page down.
- **Fix:** fixed-height placeholders while forms load (login, sign-up, profile). After: CLS 0.009, performance 97.

### BUG-13: Live site: /reports and every report page return 404
- **Steps:** on https://pitch-iq-psi.vercel.app, sign up and open Reports.
- **Expected:** the reports list.
- **Actual:** 404. Locally everything worked and all tests passed.
- **Cause:** the root `.gitignore` rule `reports/` (meant for the analysis output folder) also matched
  `frontend/app/[edition]/reports/` after the pages moved under `[edition]`, so the new files were silently never
  committed. Local runs used the files on disk; the deployed build came from git.
- **Fix:** rule anchored to the repo root (`/reports/`); pages committed.
- **Guard:** CI runs `frontend/scripts/check-routes.mjs` after the build: every page of both editions must be in it.
- **Lesson:** tests on a working copy can't see what git leaves out; the build in CI (clean checkout) now checks routes.

### BUG-14: The server restarts in the middle of an analysis ("The analysis service restarted and lost this job")
- **Steps:** on the live site, upload a video (even a 480p sample) while other requests are running.
- **Expected:** the report after a few minutes.
- **Actual:** the API restarted, the job was lost, and pages showed "Can't reach PitchIQ" for about a minute.
- **Cause:** out of memory on Render's free plan (512 MB, shared with the API). The container sees 8 CPUs, so FFmpeg
  and OpenCV started a thread per CPU, each with frame buffers; and on Linux the 32-bit detector models and the GUI
  build of OpenCV peaked at ~520 MB for a 480p video (my Windows measurements had under-counted).
- **Fix:** one decoding thread and one OpenCV thread; 8-bit detector models (accuracy re-measured on Linux) and
  headless OpenCV; videos above 720p refused with a data-saver hint; analysis at low CPU priority. Peak at 480p on
  Linux: 522 → 401 MB. The health check now reports peak memory and uptime.
- **Guard:** `.github/workflows/memory.yml` (Linux memory per configuration), `test_oversized_video_is_refused`.

### BUG-15: The server still restarts when a trial user's report gets AI coaching
- **Steps:** live E2E: a trial user (coaching included) uploads a video.
- **Expected:** report with coaching.
- **Actual:** the server restarted during the run (health check uptime reset); memory tests on a Skill Analysis
  account (no coaching) had passed.
- **Cause:** the google-genai SDK (~46 MB on Windows, more on Linux) was imported the first time a report needed
  coaching, right after the analysis, at the memory peak.
- **Fix:** Gemini is called through its REST API with httpx (already loaded); the SDK is no longer installed.
- **Guard:** live memory check with a coaching plan; API tests for the coaching fallbacks.

## Global (Main) edition

### BUG-16: A coach's task reminder was never saved
- **Steps:** a task due within 48 hours; the player opens the dashboard three times.
- **Expected:** one "Reminder" notification.
- **Actual:** none.
- **Cause:** the dashboard overview committed the database session before it collected the open tasks (which is
  where reminders are created), so the reminder was discarded.
- **Fix:** collect tasks first, then commit.
- **Guard:** `test_due_soon_tasks_send_one_reminder`.

### BUG-17: Re-running the seed doubled the demo rooms' players, tasks and hand-ins (local database)
- **Steps:** `python -m app.seed` twice on SQLite.
- **Expected:** the same 2 rooms, 11 members, 3 tasks.
- **Actual:** 22 members, 6 tasks, 18 hand-ins.
- **Cause:** a bulk delete of rooms relied on ON DELETE CASCADE, which SQLite ignores unless foreign keys are turned
  on (Postgres in production does cascade, so local and live behaved differently).
- **Fix:** rooms are deleted through the ORM (cascades to members, tasks and hand-ins), and SQLite connections turn on
  foreign keys so local runs and tests match production.
- **Guard:** `test_demo_coach_and_demo_player_share_a_seeded_room` (seed runs per test); seed run twice in review.

### BUG-18: The command centre scrolled sideways on phones
- **Steps:** demo player, `/dashboard`, 390 px wide.
- **Expected:** everything fits the screen.
- **Actual:** the page was 658 px wide; the coach-task panel stuck out.
- **Cause:** grid columns default to a minimum width of their content, and the task titles (truncated with an
  ellipsis) still counted at full length.
- **Fix:** panels and that column get `min-width: 0`.
- **Guard:** a script checks all 22 Global pages at 390 px for sideways scrolling; TC-MAIN-01/04/14 assert it.

### BUG-19: The landing page's tracking box wasn't on the ball
- **Steps:** open Global `/`.
- **Expected:** the "ball · locked" box around the ball in the hero photo.
- **Actual:** the box started at the ball's centre, half off it.
- **Cause:** the box's pulse animation sets `transform`, which replaced the `translate(-50%, -50%)` that centred it.
- **Fix:** the pulse runs on an inner element; the box position was re-measured for the photo's 4:3 crop.

### BUG-20: Misleading team alert: "Team average fell from 27.0 to 24.5"
- **Steps:** demo coach, Riverside U16, mid-week.
- **Expected:** alerts that compare like with like.
- **Actual:** the current, half-finished week was compared with a full week, so the average looked like it was
  falling; a name ending in a full stop also produced "Omar H..".
- **Fix:** week-on-week alerts use complete weeks only; no double full stop.

### BUG-21: The AI training plan read a field name aloud: "reach your week_goal_touches of 19"
- **Steps:** AI Coach user with a Gemini key builds a training week (TC-MAIN-10).
- **Expected:** "reach 19 touches this week".
- **Actual:** the summary contained the JSON field name. It passed the number check because 19 was right.
- **Fix:** replies that contain a fact's field name are rejected and replaced by the rule-based plan; the same check
  now guards the report coaching (`next_target_touches`); the prompt says to write plain numbers.
- **Guard:** `test_training_check_rejects_field_names_read_aloud`, `test_field_names_read_aloud_are_caught`.

### BUG-22: Accessibility violations on Global pages
- **Steps:** axe (WCAG 2 A/AA) in TC-MAIN-04/07/09/11/17.
- **Actual:** chart columns had `aria-label` without a role (`aria-prohibited-attr`); the sidebar's group labels
  were too faint (contrast); the chart's table view scrolled but couldn't be reached by keyboard.
- **Fix:** columns are `role="img"`; labels use the standard muted text; the table region is focusable and named.

### BUG-23: Rule-based training days were named wrongly and repeated
- **Steps:** build a week without Gemini (or when its reply is rejected).
- **Actual:** "Balance" day with a breathing drill; Friday and Saturday identical to Monday and Tuesday.
- **Fix:** each day is named after what its lead drill trains, and drills are paired with an offset so every day is a
  different combination.

### BUG-24: One slow tap threw away the whole reaction test
- **Steps:** take the reaction test and, in one round, tap more than 1.5 s after the panel turns gold (seen when the
  browser was busy during a full E2E run; a distracted player does the same).
- **Expected:** that round is repeated.
- **Actual:** all five rounds finished, then the API refused the timings ("too fast or too slow") and the player had
  to start again.
- **Fix:** the page applies the API's 1.5 s limit itself: a slower tap shows "Too slow: tap to try that round again",
  like an early tap. The API still checks every timing.
- **Guard:** TC-MAIN-06 plays the rounds like a person and handles repeated rounds.

