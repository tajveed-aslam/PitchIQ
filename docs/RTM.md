# Requirements traceability matrix: PitchIQ (Lite and Global)

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
| R-21 | One site, region switch: Africa (Lite) default, Global (Main) its own edition | TC-REG-01–03, TC-MAIN-15 | Pass |
| R-20 | Security: login required, ownership, worker key, rate limits | TC-AUTH-03; test_protected_routes_need_a_valid_token; test_reports_are_private; test_health_and_key; test_public_sample_rate_limit_and_unknowns | Pass |

## Global (Main) edition

From the Main brief (player card, training plans, skill analysis, challenges, metrics, settings), the detailed brief
(dashboard, reports, coach plan and rooms, AI integration, gamification, backend needs) and the owner's decisions
(own advanced design; one site and one backend).

| ID | Requirement | Tests | Result |
|---|---|---|---|
| R-22 | Global has its own advanced design (not Lite's look), image-led, responsive | TC-MAIN-01, TC-MAIN-14; sideways-scroll check on all 22 Global pages; Lighthouse mobile | Pass |
| R-23 | Full player card: skill ratings, overall from skill averages, physical profile; unmeasured skills not guessed | TC-MAIN-05; test_full_card_only_rates_what_was_measured; test_physical_profile_validation_and_demo_is_read_only | Pass |
| R-24 | Psychological traits (motivation, confidence, team spirit, leadership, communication, emotional control) | TC-MAIN-06; test_mindset_reversed_items_stop_agree_with_everything_scoring_100; test_mindset_needs_every_answer_in_range | Pass |
| R-25 | Reaction and logic tests ("all skills analysis") that can't be faked from the browser | TC-MAIN-06; test_reaction_scores_the_median_and_refuses_impossible_taps; test_logic_is_graded_by_the_server_and_answers_never_sent; test_logic_rejects_a_forged_token; test_logic_questions_are_valid_sequences | Pass |
| R-26 | Command-centre dashboard: card, progress, quick actions, tasks, reports, badges, notifications | TC-MAIN-04; test_overview_has_everything_the_dashboard_needs | Pass |
| R-27 | Reports library: search, sort by date or score, filter; single-skill label | TC-MAIN-07 (picker); report list in TC-MAIN-04 | Pass |
| R-28 | Comparison of two sessions (split view, metric changes, rhythm overlay) | TC-MAIN-07; test_compare_orders_old_to_new_and_reports_changes; test_compare_refuses_other_players_reports | Pass |
| R-29 | Progress analytics: trend, personal bests, every metric over time, consistency | TC-MAIN-08, TC-MAIN-09; test_progress_trend_and_personal_bests | Pass |
| R-30 | AI weekly training plans from measured numbers, checked like the coaching | TC-MAIN-10; test_training_plan_is_gated_needs_a_video_and_has_rest_days; test_training_check_rejects_invented_drills_numbers_and_shape; test_training_check_rejects_field_names_read_aloud; test_rule_based_plan_targets_the_weak_spots; test_finishing_every_session_earns_committed | Pass |
| R-31 | Challenges, badges and milestones (incl. team milestones) | TC-MAIN-11; test_badges_are_earned_once_with_a_notification; test_rejected_videos_earn_nothing; test_team_dashboard_alerts_and_leaderboard | Pass |
| R-32 | Coach plan: rooms with expiring join codes, roles, tasks with deadlines and notes, hand-ins, coach scores and notes, reminders | TC-MAIN-16, TC-MAIN-17; test_rooms.py (13) | Pass |
| R-33 | Team dashboard: overview, player profiles, trends, top players, automatic alerts; academy trials with criteria and scouting notes | TC-MAIN-17; test_team_dashboard_alerts_and_leaderboard; test_academy_rooms_check_the_bar_and_keep_scouting_notes | Pass |
| R-34 | Settings: notifications, plan (test mode), language, privacy | TC-MAIN-12; test_notification_settings_are_respected; test_task_notifications_respect_the_players_settings | Pass |
| R-35 | AI assistant on every signed-in page, answering Global questions from its FAQ | TC-MAIN-13; test_main_assistant_knows_main_features_and_lite_stays_unchanged | Pass |
| R-36 | Demo data for both roles (demo player and demo coach) | TC-MAIN-04, TC-MAIN-17; test_demo_coach_and_demo_player_share_a_seeded_room | Pass |
| R-37 | Same backend for both editions; live database needs no migration | New tables only; all Lite tests still pass (TC-WEB/SMP/AUTH/UPL/PLN/EVT/SUP) | Pass |

### Global run log (local full stack, retries off; whole suite: Lite + Global + region, 45 cases × 3 devices)

| Run | Date | Passed | Failed | Skipped | Duration | Notes |
|---|---|---|---|---|---|---|
| 1 | 2026-10-31 | 131 | 0 | 4 | 8.3 min | |
| 2 | 2026-10-31 | 131 | 0 | 4 | 9.4 min | |
| 3 | 2026-10-31 | 130 | 1 | 4 | 9.4 min | TC-SMP-03 still queued at 120 s behind other live analyses; test waits now match the page's 180 s fallback; Global sample test desktop-only |
| 4 | 2026-10-31 | 129 | 0 | 6 | 8.0 min | |
| 5 | 2026-10-31 | 128 | 1 | 6 | 7.7 min | TC-MAIN-07 (iPhone) click timeout under load; not reproduced in 51 targeted repeats; no API errors in the log |
| 6 | 2026-10-31 | 129 | 0 | 6 | 6.8 min | |
| 7 | 2026-10-31 | 129 | 0 | 6 | 8.9 min | |
| 8 | 2026-10-31 | 127 | 2 | 6 | 15.0 min | TC-UPL-01 (Pixel), TC-MAIN-10: uploads still "Waiting in line" at 120 s on a slow run; local wait raised to 6 min |
| 9 | 2026-10-31 | 128 | 1 | 6 | 14.3 min | TC-MAIN-06 (iPhone): one slow tap failed the whole reaction test: BUG-24, fixed |
| 10 | 2026-10-31 | 129 | 0 | 6 | 14.1 min | |
| 11 | 2026-10-31 | 129 | 0 | 6 | 14.2 min | |
| **12** | 2026-11-01 | 129 | 0 | 6 | 14.3 min | **three consecutive clean runs on the final build (12–14)** |
| **13** | 2026-11-01 | 129 | 0 | 6 | 15.6 min | |
| **14** | 2026-11-01 | 129 | 0 | 6 | 14.9 min | |

Skipped by design: TC-WEB-04 and TC-MAIN-14 on desktop (phone layouts), TC-MAIN-02 and TC-MAIN-10 on phones (one
real analysis per run). API: 80 passed. CI (Linux): API, frontend lint + build + route check, worker + accuracy
regression: green. Lighthouse mobile (Global, local build): `/` 90, `/samples` 88, `/login` 96 performance;
accessibility, best practices and SEO 100; CLS ≤ 0.003.

Not built in this release (documented, not hidden): the federation price-quote chatbot (federations use the contact
form), multi-language content, SMS, offline analysis, 3D/biomechanics, dribbling and other skills.

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
