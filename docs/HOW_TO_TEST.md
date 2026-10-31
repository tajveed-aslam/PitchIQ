# How to test PitchIQ

No football videos of your own? Everything below works with the built-in samples.

## 1. Try the AI without an account (2 minutes)

1. Open the site and click **Analyse a sample video** (or go to `/samples`).
2. On **Floodlit freestyle**, press **Analyse this sample**. You'll see the stages (quality check, tracking the ball,
   counting touches), then the report.
3. Compare the AI's count with the **hand count**: the range bar shows both, and the timeline marks each touch the
   AI found against each touch a person counted. Orange ticks didn't match.
   Expected: about 16 touches (likely 13–21) against a hand count of 19.
4. Try **Garage session (moving camera)**. Expected: "Please re-film": the camera zooms out while filming, so the
   quality check refuses to count it.

If the analysis service has been asleep, the first run can take a minute; if it can't be reached, the page shows the
stored result from the same pipeline and says so.

| Sample | Hand count | Expect the AI to say |
|---|---|---|
| Floodlit freestyle | 19 | ~16, range covering 19 |
| Long session, full body | 39 | ~39 |
| Street pitch rhythm | 16 | ~15 |
| Garage session | – | Rejected: camera moving |

## 2. The demo player (no sign-up)

Log in → **Try the demo player**. It's a shared, fictional 16-year-old midfielder with eight weeks of sessions:

- **Dashboard:** player card with ratings, progress line (11 → 29 touches), recent reports, notifications.
- **Reports:** open "Best one yet" for a full report with coaching and three drills; "Filmed while walking" shows a
  rejected video.
- **Challenge:** the monthly leaderboard (fictional players).

Anything you upload as the demo player is removed after a day.

## 3. Your own account and an upload

1. **Start free** → sign up (trial: 3 analyses in 7 days, with AI coaching).
2. On `/samples`, **Download** a sample (or film yourself: phone propped up, whole body in the picture).
3. **Upload** → choose the file → keep **Data saver** on (on most phones it shrinks the video before uploading) →
   **Analyse my session**.
4. The report page updates by itself; the report also appears in **Reports** with a notification.

## 4. Plans (test mode, nothing is charged)

Go to **Profile → Plan** and switch:

| Plan | Try this |
|---|---|
| Free trial | 3 uploads, then the upload page asks you to pick a plan. Progress chart locked. |
| Skill Analysis | Progress chart unlocked; new reports show coaching as locked. |
| AI Coach | Coaching and drills on every report. |
| Events | Your best count this month appears on the challenge leaderboard. |

Rejected videos and samples never use up your allowance.

## 5. Help

**Help** page: ask the chat things like "Why was my video rejected?" or "How much data does it use?". Off-topic
questions get a polite refusal.

## For testers

The automated suites, test cases and results are in [TEST_PLAN](TEST_PLAN.md), [TEST_CASES](TEST_CASES.md),
[RTM](RTM.md), [BUG_REPORTS](BUG_REPORTS.md) and [MODEL_ACCURACY](MODEL_ACCURACY.md).
