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
| TC-REG-01 | Default region | Open `/` | Africa: Lite badge, no Global hero |
| TC-REG-02 | Region switch | Choose Global; open /samples; switch back | Global (Main) landing and samples (remembered), accessible; back to Lite |
| TC-REG-03 | Switch keeps the page | On Global /support, choose Africa | Lite's /support |
| TC-A11Y ×7 | Accessibility | axe on `/`, `/samples`, `/login`, `/signup`, `/events`, `/support`, and (demo) dashboard, reports, a report, upload | No serious or critical WCAG 2 A/AA violations |

## End to end: Global (Main) edition (`e2e/tests/main.spec.ts`)

| ID | Title | Steps | Expected |
|---|---|---|---|
| TC-MAIN-01 | Landing | Open `/` with the Global region | Tracking hero, platform, coaches, 6 plans incl. Coach and Federation; no sideways scroll; accessible |
| TC-MAIN-02 | Sample vs hand count | Analyse "Long session, full body" | Report view with the count, "hand count 39" on the range bar |
| TC-MAIN-03 | Sign-up from Global | Sign up with `?plan=skill` | Skill Analysis pre-selected; lands on the player card |
| TC-MAIN-04 | Command centre | Demo player opens `/dashboard` | Overall rating, training week, coach tasks from Riverside U16, reports; accessible |
| TC-MAIN-05 | Honest card | Demo player opens `/card` | Gold card; Dribbling etc. "not measured"; mindset traits; accessible |
| TC-MAIN-06 | Tests | New user takes mindset (12 answers), reaction (5 taps at human speed) and logic (8 puzzles) | Each result shown; card shows "ms median" and "puzzles" |
| TC-MAIN-07 | Compare | Demo: Reports, Compare two, pick 2, Compare; show table | Verdict, metric table, interval chart and its table; accessible |
| TC-MAIN-08 | Gating | Trial user opens `/progress` and `/training` | Both locked with a plan link |
| TC-MAIN-09 | Progress | Demo opens `/progress` | Trend chart; best 29; accessible |
| TC-MAIN-10 | Upload, then a plan (desktop) | AI Coach user uploads a sample file; builds a training week; ticks a session | Report with coaching; 7 days; "1/..." sessions |
| TC-MAIN-11 | Challenges and badges | Demo opens `/challenges` | Live challenge; "First touch" earned, "40 Club" not; accessible |
| TC-MAIN-12 | Settings | Turn off badge notifications; switch to Coach; reload; open `/rooms` | Choice saved; Coach current; create-room form shown |
| TC-MAIN-13 | Assistant | Ask "How do I join my coach's room?" in the docked chat | Reply mentions the code |
| TC-MAIN-14 | Phone navigation (phones) | More, then Rooms; open card, progress, training, rooms, settings | Sheet works; no page scrolls sideways |
| TC-MAIN-15 | Lite addresses | Open `/events`, `/profile` on Global | Redirected to `/challenges`, `/settings` |
| TC-MAIN-16 | Coach and player | Coach (new, Coach plan) creates a room; player tries a wrong code, then the real one (lower case); coach sets a task | "No room has that code"; player joins; task "0/1 handed in"; player's dashboard and bell show the task; accessible |
| TC-MAIN-17 | Demo coach | Open Riverside U16; open a player; score a hand-in | Team dashboard with insights; player drawer with card (Esc closes); score saved; accessible |

## API (pytest, `backend/tests`)

| File | Tests | Covers |
|---|---|---|
| test_auth_profile.py | 9 | sign-up, login (case-insensitive email), duplicates, validation, tokens, profile rules, demo login and read-only rules, seeded players can't log in, notifications |
| test_analyses.py | 14 | upload → processing → done with report, coaching and thumbnail; quality rejection; failed and lost jobs; stale jobs; privacy; signed thumbnails; upload validation; trial allowance counts only usable uploads; trial expiry; Skill plan (no coaching, progress); samples are free; delete; demo dashboard |
| test_coaching.py | 16 | measured numbers pass; invented numbers caught; field names read aloud caught; contradictions caught; drills only from the library; goal; rule-based coaching passes its own checks and always has 3 drills; AI used when grounded; falls back on hallucination, errors, no key; every sample report fits the contract |
| test_public.py | 5 | public sample runs with coaching; rejected sample has none; rate limit per visitor; leaderboard ranking and plan rules; FAQ, contact validation, chat fallback and off-topic reply |
| test_main_player.py | 23 | Global: mindset scoring (reversed items), answers required; reaction median and impossible taps; logic graded on the server, answers never sent, forged tokens refused, puzzles valid for 200 seeds; full card rates only what was measured; physical profile validation, demo read-only; badges earned once, never from rejected videos; training plans gated, need a video, 7 days with rest, library drills, goal in the summary; plan checks (invented drills, numbers, shape, field names read aloud); rule-based plan targets weak spots; progress trend and personal bests; compare order, changes, privacy; dashboard overview; Global assistant FAQ; notification settings |
| test_rooms.py | 13 | Coach plan required; join codes checked, expire, renewed; roles (player view hides codes and other players); task, hand-in, score, notifications; rejected videos can't be handed in; private tasks; future deadlines; one reminder 48 h before; task notifications respect settings; team dashboard, alerts, leaderboard, player profile and reports for the coach; academy bar and scouting notes; remove and leave; seeded demo coach and player |

## Worker (pytest, real pipeline, `worker/tests`)

| Test | Covers |
|---|---|
| test_health_and_key | health check; requests without the shared key refused |
| test_rejects_bad_inputs | unknown/traversal sample ids, wrong file types, unknown jobs |
| test_unreadable_video_fails_cleanly | corrupt file → clear failure (BUG-02) |
| test_sample_counts_stay_near_the_hand_count ×2 | accuracy regression bands on two served files |
| test_upload_is_deleted_after_analysis | the uploaded copy is gone after analysis |
