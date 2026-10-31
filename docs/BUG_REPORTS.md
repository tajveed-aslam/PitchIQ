# Bug reports

Real defects found while building and testing PitchIQ Lite. Each was reproduced, fixed, and covered by a test so it
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
