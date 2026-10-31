# Requirements traceability matrix: PitchIQ Lite

Requirements come from the Lite brief and the approved plan. "Result" is from the local full-stack runs on
2026-10-30: three consecutive E2E runs (74 passed, 1 skipped by design, 0 failed, 0 flaky, retries off), API tests
(43 passed), worker tests (6 passed, real pipeline), CI green on Linux, Lighthouse mobile. The live-site run
(2026-10-31) passed too, with the server's uptime unbroken and peak memory 372 of 512 MB.

| ID | Requirement | Tests | Result |
|---|---|---|---|
| R-01 | Landing page: value, how it works, sample testimonials, pricing, call to action | TC-WEB-01, TC-WEB-02, TC-WEB-03 | Pass |
| R-02 | Mobile-first, works on phones | All E2E on Pixel 7 + iPhone 14; TC-WEB-04 | Pass |
| R-03 | Sign-up, login, guest demo | TC-AUTH-01–04; test_signup_login_and_me, test_duplicate_signup_and_wrong_password, test_signup_validation, test_demo_login_needs_seed_and_is_read_only | Pass |
| R-04 | Short profile and simple player card | TC-AUTH-01; test_profile_update; test_demo_dashboard_has_card_stats_and_history | Pass |
| R-05 | Upload with size/type/length limits and data saving | TC-UPL-01, TC-UPL-02; test_upload_validation; test_rejects_bad_inputs; test_unreadable_video_fails_cleanly | Pass |
| R-06 | Progress states while analysing | TC-UPL-01, TC-SMP-02; test_upload_poll_done_with_report_and_coaching | Pass |
| R-07 | Single-skill report: touches, range, pace, rhythm, control, timeline | TC-UPL-01, TC-SMP-02, TC-AUTH-05 | Pass |
| R-08 | AI coaching grounded in the measurements | test_coaching.py (15); TC-AUTH-05; TC-UPL-01 | Pass |
| R-09 | Quality check rejects bad videos; rejections don't use the allowance | TC-SMP-03; test_quality_gate_rejection_is_stored_without_coaching; test_trial_allowance_counts_only_usable_analyses | Pass |
| R-10 | Dashboard: recent analyses, progress, quick actions, notifications | TC-AUTH-01, TC-AUTH-04, TC-PLN-01; test_demo_dashboard_has_card_stats_and_history; test_notifications_welcome_and_mark_read | Pass |
| R-11 | My videos / reports list; delete | TC-A11Y (reports); test_delete_and_list | Pass |
| R-12 | Plans with gating: trial, Skill Analysis, AI Coach, Events (test mode) | TC-WEB-02, TC-PLN-01, TC-PLN-02; test_expired_trial_blocks_uploads_until_a_plan_is_chosen; test_skill_plan_has_no_coaching_but_has_progress; test_progress_locked_on_trial | Pass |
| R-13 | Events: monthly challenge and leaderboard | TC-EVT-01, TC-PLN-02; test_leaderboard_ranks_seeded_players_and_hides_non_entrants | Pass |
| R-14 | Support: FAQ, contact, AI help chat | TC-SUP-01; test_faq_contact_and_chat_fallback | Pass |
| R-15 | Sample videos for testing without own footage (analyse, download, ground truth) | TC-SMP-01–03; test_public_sample_run_with_coaching; test_public_sample_rejected_has_no_coaching | Pass |
| R-16 | Touch count accurate against hand counts; regression guarded | MODEL_ACCURACY (production: 67/74 found, ±3, truth in range); test_sample_counts_stay_near_the_hand_count ×2 (CI) | Pass |
| R-17 | Privacy: videos deleted after analysis; reports private | test_upload_is_deleted_after_analysis; test_reports_are_private; test_thumbnail_needs_the_signature | Pass |
| R-18 | Accessibility (WCAG 2 A/AA, no serious/critical issues) | TC-A11Y ×7 on 3 devices; Lighthouse accessibility 100 | Pass |
| R-19 | Fast on slow connections (Lite budget) | Build: ≤ 118 kB first-load JS per page; Lighthouse mobile: performance 88–97, page weight 258–358 KB, CLS ≤ 0.04 | Pass |
| R-21 | One site, region switch: Africa (Lite) default, Global (Main) coming soon | TC-REG-01, TC-REG-02 | Pass |
| R-20 | Security: login required, ownership, worker key, rate limits | TC-AUTH-03; test_protected_routes_need_a_valid_token; test_reports_are_private; test_health_and_key; test_public_sample_rate_limit_and_unknowns | Pass |

## Run log

| Run | Date | Suite | Passed | Failed | Skipped | Flaky | Duration |
|---|---|---|---|---|---|---|---|
| E2E 1 | 2026-10-30 | 25 cases × 3 devices | 74 | 0 | 1 | 0 | 5.0 min |
| E2E 2 | 2026-10-30 | same | 74 | 0 | 1 | 0 | 4.7 min |
| E2E 3 | 2026-10-30 | same | 74 | 0 | 1 | 0 | 4.6 min |
| API | 2026-10-30 | pytest | 43 | 0 | 0 | – | 26 s |
| Worker | 2026-10-30 | pytest, real pipeline | 6 | 0 | 0 | – | 57 s |
| CI | 2026-10-30 | GitHub Actions (Linux) | 3 jobs | 0 | – | – | – |
| **E2E live** | 2026-10-31 | 27 cases × 3 devices against https://pitch-iq-psi.vercel.app + Render API | 80 | 0 | 1 | 0 | 6.5 min |

Before the passing runs, the first E2E run found 9 failures (3 cases × 3 devices): BUG-10 (two drills) and BUG-11
(contrast). Lighthouse then found a layout shift on login (BUG-12). All fixed; see [BUG_REPORTS](BUG_REPORTS.md).

| Lighthouse (mobile, local production build) | Performance | Accessibility | Best practices | SEO | LCP | CLS |
|---|---|---|---|---|---|---|
| `/` | 90 | 100 | 100 | 100 | 3.3 s | 0 |
| `/samples` | 88 | 100 | 100 | 100 | 3.7 s | 0.041 |
| `/login` (after BUG-12 fix) | 97 | 100 | 100 | 100 | – | 0.009 |
| `/signup` | 95 | – | – | – | – | 0 |

Live runs before the final one found BUG-13 (reports pages missing from git), BUG-14 (out-of-memory restarts:
threads, 32-bit models, GUI OpenCV) and BUG-15 (the Gemini SDK loading at the memory peak). The final live run was
clean.
