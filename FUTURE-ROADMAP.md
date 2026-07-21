# Future Roadmap

Roadmap maintenance rule: when a planned feature is implemented, mark its heading with `— Implemented` and add a short dated implementation note.

## Reliable PWA Updates and Offline Cache — Implemented

Implemented on 2026-07-20 with `sw.js`, external service-worker registration in `snake-game-turn.html`, and `gh-pages` publishing support in `deploy-gh-pages.ps1`.

Replace the current inline, fixed `snake-v1` cache-first service worker with a deployable, versioned service worker that cannot pin Safari to an outdated game build.

### Implementation

- Add a real `sw.js` file beside the deployed `index.html`; do not register the worker from a temporary `blob:` URL.
- Register `./sw.js` with `updateViaCache: 'none'` and report registration failures in the console.
- Use a versioned cache name such as `snake-shell-v2`.
- Use network-first handling for page-navigation requests:
  - Return the newest online response and refresh the offline copy.
  - Fall back to the cached game page only when the network is unavailable.
- During activation, delete obsolete Snake caches, including `snake-v1`.
- Do not intercept or cache non-GET, Supabase, authentication, or other API requests.
- Update `deploy-gh-pages.ps1` so `sw.js` is published alongside `index.html` on the `gh-pages` branch.

### Acceptance criteria

- A newly deployed game version appears in normal Safari without clearing website data.
- Query-string cache busting is no longer required.
- The game still launches offline after at least one successful online visit.
- Supabase identity, OTP, and leaderboard requests continue to operate online and are never served from the service-worker cache.
- Old `snake-*` caches are removed automatically after the replacement worker activates.

### Reference

Implemented with `sw.js`, external registration in `snake-game-turn.html`, and deployment support in `deploy-gh-pages.ps1`. The generated manifest behavior remains unchanged.

## Competitive Play Roadmap

The competitive roadmap should build on the game's existing fixed board, persistent player identity, Supabase leaderboard, per-run game-mode freezing, and authenticated score-submission flow. The shared foundation for Daily Run and Vs mode is a deterministic, versioned gameplay core: given the same ruleset, seed, and input events, the browser and server must reproduce the same run.

### Daily Run

Launch Daily Run first as a seeded **Sprint 60** challenge. A short, fixed-duration run is easy to understand, encourages repeat competition, and prevents one attempt from demanding an unpredictable amount of time.

Recommended rules:

- Use the same logical board, food sequence, ruleset version, and theme for every player that day.
- Define each challenge by UTC date so it changes simultaneously worldwide and cannot be changed by the device clock.
- Give each authenticated player three ranked attempts per day; additional attempts can remain available as unranked practice.
- Maintain one undisputed daily leaderboard regardless of control method. Continue displaying control method as metadata and optionally provide filters, but do not divide the primary ranking.
- Use score first and earliest achievement as the tie-break order.
- Lock the Daily theme to the server-provided theme so the challenge has one shared visual and musical identity.
- Keep cosmetic randomness independent; only gameplay-affecting randomness must use the seeded generator.

Competitive presentation:

- Show the daily challenge number, remaining ranked attempts, current rank, percentile, and time until the next challenge.
- Show the closest rivals immediately above and below the player instead of only the global top ten.
- Track daily participation streaks, best daily finish, podium finishes, and daily wins.
- Adapt the existing heartbeat and border-warning experience to the daily #1 score without covering or resizing the board.
- At game over, show score, rank movement, personal daily best, and the score needed to pass the next rival.
- Provide a compact share result containing challenge number, score, rank, streak, and a challenge link without revealing a replay that could be trivially copied.

Backend model:

- Add `daily_challenges` with challenge date, seed, fixed theme, mode, duration, board dimensions, and `ruleset_version`.
- Add `daily_attempts` with challenge, player, attempt number, score, control method, run ID, replay data, verification state, and timestamps.
- Add a unique constraint for one numbered attempt per player and challenge, plus ranking indexes by challenge and score.
- Add `get_daily_challenge()` to return the authoritative current UTC challenge.
- Add `start_daily_attempt()` to atomically reserve an official attempt and issue a short-lived run token.
- Add a submission function or Supabase Edge Function that validates the replay, records the result, and returns authoritative rank and rival information.
- Keep Daily results separate from the existing personal-best leaderboard rows; a dated challenge is not the same entity as a permanent Classic or Sprint personal best.

Replay validation:

- Replace gameplay food placement through global `Math.random()` with a small deterministic PRNG whenever a seeded mode is active.
- Record only meaningful inputs: direction or relative turn, game-tick number, pause/resume markers where allowed, and final run metadata.
- Re-simulate the run against its seed and `ruleset_version` before accepting the score.
- Store ruleset versions permanently so an older valid replay can still be interpreted after gameplay tuning.
- Add plausibility checks for duration, tick count, movement rate, food sequence, score progression, and duplicate run IDs.
- Treat replay verification as strong practical protection rather than perfect anti-bot security; authoritative continuous server simulation is outside the current static-client architecture.

### Random Theme Button — Implemented

Implemented on 2026-07-21 in `snake-game-turn.html`. The dice is a persistent theme-selection mode built from the live `THEMES` catalog. Selecting it leaves the main menu's current appearance unchanged; pressing Play rolls a different real theme for that run while the dice remains selected for the next game. The rolled theme is used for the complete run and recorded on leaderboard submissions. Cosmetic selection is independent from food placement, and the option is prepared to hide when Daily Run locks the shared theme.

Add a dice-style **RANDOM** action to the theme picker and optionally a compact action beside the main-menu theme label.

Behavior:

- Build the candidate list from the actual `THEMES` catalog so newly added themes are included automatically.
- Exclude the current theme whenever more than one theme is available, ensuring that consecutive Random-mode games use different themes.
- Persist Random as the selected theme mode while keeping it outside the `THEMES` catalog.
- Keep the current menu appearance when Random is selected, then roll and apply one real theme when each new game starts.
- Keep the dice visibly selected after rolling so the next new game rolls again.
- Record the actual rolled theme, not `random`, with the run and leaderboard score.
- Disable or hide it during Daily Run because the daily challenge supplies one shared theme.
- Random theme selection must never alter the gameplay seed, food sequence, score rules, or leaderboard category.

### Vs Mode

Build Vs mode in stages. GitHub Pages can host the complete client, while Supabase Auth, PostgreSQL, Edge Functions, and Realtime provide identity, rooms, verification, and synchronization.

#### Stage 1 — Asynchronous Duel

- Let a player create a challenge link or short duel code.
- Give both players the same seed, ruleset, duration, board, and theme.
- Allow each participant a defined number of attempts, initially one ranked attempt per duel.
- Verify both replays and declare the winner server-side.
- Support open challenges, direct friend challenges, expiration, rematches, and shareable results.
- Reuse Daily Run's deterministic core, replay format, and validator.

This is the recommended Vs MVP because it works reliably across mobile Safari, intermittent connections, different time zones, and a static GitHub Pages deployment.

#### Stage 2 — Ghost Race

- Download a completed opponent replay before the challenger starts.
- Race against the opponent's score progression or food timeline.
- Represent the rival through a compact HUD meter, milestone markers, or small progress strip.
- Do not render another full snake over the active board; gameplay clarity and the fixed board size remain non-negotiable.
- Keep the final outcome dependent on verified completed runs rather than client-side ghost playback.

#### Stage 3 — Live Race

Use Supabase Realtime Presence and Broadcast for room coordination and low-latency progress only.

- Create private room codes, invitations, ready states, and a synchronized countdown.
- Start with a same-seed Sprint 60 race on independent boards.
- Show opponent score, connection state, and a compact progress meter in the HUD.
- Broadcast progress and status, but never accept a broadcast score as the final result.
- Submit both input replays after the race and let the server confirm the winner.
- Define reconnect, abandonment, timeout, and tie behavior before exposing ranked live matches.
- Do not use split-screen boards on mobile.
- Defer attacks, garbage blocks, shared obstacles, and board-to-board mutations until basic live races are proven reliable.

Suggested Vs data model:

- `versus_rooms`: code, ruleset, seed, theme, state, creator, expiration, and winner.
- `versus_players`: room, player, seat, ready state, result, verification state, and connection timestamps.
- `run_replays`: reusable versioned replay storage referenced by Daily and Vs results.
- Edge Functions or security-definer RPCs for room creation, joining, attempt issuance, replay submission, and winner confirmation.
- Strict row-level security so room participants can update only their permitted presence and submission records.

### Recommended Implementation Order

1. Extract deterministic gameplay operations into a versioned core shared by normal play, seeded play, replay simulation, and validation.
2. Add the Random Theme button as an isolated low-risk improvement. — **Implemented 2026-07-21**
3. Add seeded local runs and prove that identical seeds plus inputs reproduce identical scores.
4. Implement Daily Sprint 60 with challenge retrieval, three ranked attempts, and a dedicated leaderboard.
5. Add server-side replay verification, streaks, nearby rivals, rank feedback, and sharing.
6. Implement asynchronous duel links using the Daily foundation.
7. Add ghost progress races.
8. Add Supabase Realtime rooms and synchronized live Sprint races.
9. Consider richer battle mechanics only after live racing, reconnection, and verification are stable.

### Acceptance Criteria

- Two clients using the same seed and input replay produce the same food sequence, state transitions, and final score.
- Device date changes cannot select a different Daily challenge or restore spent ranked attempts.
- Daily leaderboard ranks are returned authoritatively by the backend.
- A player cannot submit an arbitrary score without a replay that reproduces it.
- Random Theme always chooses a real catalog theme and does not affect competitive rules.
- Asynchronous duels work without both players being online together.
- Live race disconnects do not corrupt either player's local run or produce an unverified winner.
- No competitive feature resizes, overlays, or obscures the fixed gameplay board.
