# Test cases

End-to-end cases run on three devices each (desktop Chrome, Pixel 7, iPhone 14) unless marked. File:
`e2e/tests/*.spec.ts`. API and worker tests are listed after them.

## End to end (Playwright)

| ID | Title | Steps | Expected |
|---|---|---|---|
| TC-WEB-01 | Hero, stats and CTA | Open `/`; click "Analyse a sample video" | Headline, hero photo with alt text, accuracy stats; lands on `/samples` |
| TC-WEB-02 | Plans in test mode | Open `/#plans`; choose Skill Analysis | 4 plans, "nothing is charged"; sign-up opens with Skill Analysis selected |
| TC-WEB-03 | Honest testimonials | Open `/` | 3 quotes, each labelled "Sample", initials only (no photos) |
| TC-WEB-04 | Phone menu (phones only) | Tap the menu; tap Samples | Menu opens; `/samples` loads |
| TC-SMP-01 | Sample library assets | Open `/samples` | 4 samples, each with a poster and a download link; files ≤ 3.1 MB |
| TC-SMP-02 | Analyse a sample | Click "Analyse this sample" on Floodlit freestyle | Live stages, then an AI count of 15–21 beside "hand count: 19", and where the result came from |
| TC-SMP-03 | Quality gate | Analyse the moving-camera sample | "Please re-film", camera-moved message |
| TC-EVT-01 | Public leaderboard | Open `/events` | ≥ 9 rows sorted by touches; "Join the challenge" |
| TC-AUTH-01 | Sign up and profile | Fill sign-up; save age 15, Forward; open dashboard | Welcome profile page; player card shows name, FOR, 15 yrs; "3 of 3 analyses left in your trial" |
| TC-AUTH-02 | Wrong password | Log in with a wrong password, then the right one | "Wrong email or password.", stays on login; then dashboard |
| TC-AUTH-03 | Protected pages | Open `/reports` logged out | Redirect to `/login?next=/reports` |
| TC-AUTH-04 | Demo player | "Try the demo player" | Dashboard with seeded reports and the demo banner; profile read-only |
| TC-AUTH-05 | Demo coaching | Open "Best one yet" | 29 touches; coaching with 3 drills |
| TC-UPL-01 | Real upload | New trial user uploads a sample file (data saver on where supported) | Report page with live stages, then 12–18 touches (hand count 16) and coaching; "2 of 3 analyses left" |
| TC-UPL-02 | Not a video | Choose a .txt file | "That isn't a video" error; submit disabled |
| TC-PLN-01 | Progress gating | Trial user; switch to Skill Analysis | Progress locked, then shown; "20 of 20 analyses left this month" |
| TC-PLN-02 | Challenge gating | Trial user on `/events`; switch to Events | "Your plan doesn't include challenges", then "You're in." |
| TC-SUP-01 | Support | Ask the chat "Why was my video rejected?"; send the contact form | FAQ (10), a reply about the camera, "Thanks!" |
| TC-REG-01 | Default region | Open `/` | Africa: Lite badge, no coming-soon page |
| TC-REG-02 | Region switch | Choose Global; open /samples, /dashboard, /upload; switch back | Coming-soon page on every page (remembered), accessible; back to Lite |
| TC-A11Y ×7 | Accessibility | axe on `/`, `/samples`, `/login`, `/signup`, `/events`, `/support`, and (demo) dashboard, reports, a report, upload | No serious or critical WCAG 2 A/AA violations |

## API (pytest, `backend/tests`)

| File | Tests | Covers |
|---|---|---|
| test_auth_profile.py | 9 | sign-up, login (case-insensitive email), duplicates, validation, tokens, profile rules, demo login and read-only rules, seeded players can't log in, notifications |
| test_analyses.py | 14 | upload → processing → done with report, coaching and thumbnail; quality rejection; failed and lost jobs; stale jobs; privacy; signed thumbnails; upload validation; trial allowance counts only usable uploads; trial expiry; Skill plan (no coaching, progress); samples are free; delete; demo dashboard |
| test_coaching.py | 15 | measured numbers pass; invented numbers caught; contradictions caught; drills only from the library; goal; rule-based coaching passes its own checks and always has 3 drills; AI used when grounded; falls back on hallucination, errors, no key; every sample report fits the contract |
| test_public.py | 5 | public sample runs with coaching; rejected sample has none; rate limit per visitor; leaderboard ranking and plan rules; FAQ, contact validation, chat fallback and off-topic reply |

## Worker (pytest, real pipeline, `worker/tests`)

| Test | Covers |
|---|---|
| test_health_and_key | health check; requests without the shared key refused |
| test_rejects_bad_inputs | unknown/traversal sample ids, wrong file types, unknown jobs |
| test_unreadable_video_fails_cleanly | corrupt file → clear failure (BUG-02) |
| test_sample_counts_stay_near_the_hand_count ×2 | accuracy regression bands on two served files |
| test_upload_is_deleted_after_analysis | the uploaded copy is gone after analysis |
