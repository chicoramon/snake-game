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

## Tap Turn Control — Implemented

Implemented locally on 2026-07-23 as **Tap Turn**, with the compact in-game and leaderboard label **TAP**.

- Split the fixed game board into invisible left and right input zones.
- A tap on the left half turns counter-clockwise; a tap on the right half turns clockwise.
- Keep the zones completely invisible so they never cover, resize, or distract from the board.
- Hide both D-PAD and TURN buttons while TAP is selected.
- Exclude TAP from control-layout customization because it has no movable controls.
- Persist TAP as a normal control preference and identify TAP runs separately in results and leaderboards.
- Support Classic, Sprint, and verified Daily Run replay capture with the same deterministic movement rules.

Supabase activation requires running `supabase-tap-control-method.sql` and redeploying the updated `submit-daily-attempt` Edge Function before ranked TAP submissions are enabled in production.

## In-Game Release Notes — Implemented

Implemented locally on 2026-07-23 as a permanent **WHAT'S NEW** main-menu bulletin.

- Show a **NEW!** badge whenever the current release has not been acknowledged on that device.
- Open the pixel-art release bulletin once after a newly deployed release, only while the main menu is idle.
- Keep the complete recent update history available from the main menu after the badge is cleared.
- Store the acknowledged release ID locally, requiring no Supabase schema or network request.
- Define release notes in one data-driven catalog so future deployments only need a new release entry and current release ID.
- Allow release QA at any time with the `?whatsnew=1` preview query.
- Never open over an active run or repeatedly interrupt a player who already viewed that release.

## Arcade Onboarding — Implemented (2026-07-28)

- A device that has not yet acknowledged the tour receives a five-step, skippable pixel-arcade orientation covering controls, modes, leaderboards, and saving a player by email.
- The controls step includes a two-turn practice drill and applies the chosen control method immediately.
- A **How to Play** main-menu entry replays the tour at any time.
- Completion is stored locally so the automatic tour appears only once per device; `?onboarding=1` forces it open for QA.
- The leaderboard theme filter was removed to free space. Theme information remains visible on each non-Daily leaderboard score.

## Arcade Career Stats & Autonomous Announcer — Foundation Implemented (2026-08-01)

The first backend-safe implementation slice is complete locally:

- Track idempotent per-run career events: foods, active play time, successful movement, accepted turns, longest snake, run mode, theme, control method, finish reason, and collision type.
- Aggregate lifetime stats in Supabase without trusting browser-supplied lifetime totals.
- Queue a completed run locally when its submission fails and retry it after connectivity or player identity returns.
- Generate playful commentary locally from composable message families, with deterministic selection and repetition avoidance; the game remains entertaining even when AI generation is unavailable.
- Store versioned announcer packs and per-player impression history in Supabase.
- Generate fresh content automatically with a private scheduled Gemini/Vertex AI Cloud Run Job, guarded by deterministic validation and a second structured quality review.
- Keep Gemini and the Supabase service role completely outside the static GitHub Pages client.

Remaining product passes:

- Add the retro player Stats screen and surface the first set of career records and playful comparisons.
- Load published remote announcer packs with a bundled-content fallback and record impressions.
- Enrich career records from authoritative Daily Run and Vs verification where those server-owned facts are available.
- Deploy and schedule the generator using `GOOGLE-CLOUD-ANNOUNCER-SETUP.md`, then tune cadence and quality gates from observed results.

## Junior Mode

Planned as an inviting, clearly separate mode for children and first-time players. It must preserve the fixed board dimensions and should never weaken or contaminate the existing competitive leaderboards.

Recommended first version:

- Start substantially slower than Classic and accelerate more gently.
- Allow wall wrapping instead of ending the run at the board edge.
- Give the player three hearts; a self-collision consumes one heart and resumes from a safe state.
- Add a subtle, optional food-direction hint that does not obscure the board.
- Keep the same controls and themes, including TAP, so children can choose the simplest input method.
- Explain the rules once in a short 8-bit onboarding dialog.
- Store a separate local Junior best and launch without ranked Supabase submissions.
- Keep Daily Run, Classic, Sprint, records, and their leaderboards unchanged.

Before implementation, finalize how much snake length is lost after a self-collision, whether score is preserved, and whether Junior eventually receives its own participation-focused leaderboard.

## Modular Source and Reproducible Build

Replace the maintained single-file application with modular source files and a reproducible production build. This must be an incremental, behavior-preserving migration rather than a rewrite: normal feature work should remain possible, and every completed phase should leave the game deployable.

Why this is needed:

- `snake-game-turn.html` currently combines the document structure, a large visual system, gameplay state, canvas rendering, controls, audio, themes, sprites, Supabase integration, competitive modes, and UI dialogs.
- Unrelated systems share mutable globals, making regressions more likely when one feature changes.
- Theme and music data make reviews noisy and obscure functional changes.
- The current source is difficult to test in focused units even though `snake-core.js` has already demonstrated the value of an isolated deterministic module.
- GitHub Pages can deploy a complete static site, so the production artifact is not limited to one HTML file.

### Target Structure

Use a small application structure along these boundaries, adjusting filenames during implementation when a clearer ownership boundary emerges:

```text
index.html
src/
  main.js
  game/
    game-controller.js
    canvas-renderer.js
    snake-core.js
  controls/
    control-manager.js
    layout-editor.js
  audio/
    audio-engine.js
  themes/
    catalog.js
    sprites.js
    music.js
    validator.js
  modes/
    sprint.js
    daily-run.js
  services/
    supabase-client.js
    player-identity.js
    leaderboard.js
  ui/
    menu.js
    dialogs.js
    whats-new.js
  styles/
    game.css
public/
  assets/
  manifest.webmanifest
  sw.js
tests/
dist/
```

`main.js` should become a thin composition root: it creates the application services, passes explicit dependencies and callbacks to each module, and starts the game. New modules should not recreate the current shared-global architecture.

### Migration Sequence

1. **Protect existing behavior with browser smoke tests.**
   - Cover initial menu startup, Play, pause/resume, each control method, theme selection, Random selection, game over, and leaderboard opening.
   - Cover a graceful Supabase initialization failure so an unavailable backend can never leave the main menu dead.
   - Add focused deterministic tests for `snake-core.js` and seeded Daily Run reproduction.
2. **Introduce the build system.**
   - Use Vite for the local development server, ES-module bundling, production asset hashing, and generation of a deployable `dist` directory.
   - Add documented development, test, build, preview, and deployment commands.
   - Keep the application dependency-light; Vite is a build tool, not a reason to introduce a UI framework.
3. **Perform the first behavior-neutral extraction.**
   - Move the complete inline stylesheet to `src/styles/game.css`.
   - Move the complete inline application script to `src/main.js`.
   - Keep the existing HTML markup and runtime behavior unchanged.
   - Compare a local production build with the pre-extraction game before proceeding.
4. **Extract inert data before behavior.**
   - Move theme definitions, food sprites, theme-picker artwork, and music arrangements into dedicated theme modules.
   - Add a theme validator that checks required colors, sprites, audio layers, progression stages, and sequence lengths before a theme can start.
5. **Extract one functional system at a time.**
   - Audio engine and AudioContext lifecycle.
   - Touch, keyboard, TAP, and layout-customization controls.
   - Canvas renderer and visual effects.
   - Game lifecycle, state transitions, countdown, pause, and result handling.
   - Sprint and Daily Run mode rules.
   - Player identity and Supabase client.
   - Standard, Daily, and historical leaderboards.
   - Main menu, dialogs, onboarding, and release notes.
6. **Make module contracts explicit.**
   - Pass state and dependencies through function arguments or small interfaces.
   - Keep gameplay-affecting randomness inside the versioned core.
   - Keep UI, audio, and cosmetic effects unable to mutate competitive simulation state.
7. **Update production packaging and offline behavior.**
   - Deploy the complete contents of `dist`, recursively, to `gh-pages`.
   - Generate or update the service-worker asset list from the production build.
   - Preserve network-first navigation so Safari cannot be pinned to an obsolete HTML shell.
   - Cache hashed JS, CSS, and local assets for offline launches without intercepting Supabase or authentication traffic.

### Safeguards

- Do not combine a module extraction with a gameplay feature or balancing change.
- Keep every extraction small enough to review and revert independently.
- Preserve `snake-core.js` determinism across browser play, local tests, replay verification, and the Daily Run Edge Function.
- Retain the current working HTML as a reference until the modular build passes parity checks; do not maintain two production implementations.
- Never resize or overlay the fixed gameplay board as part of the refactor.
- Do not expose Supabase secrets in the bundle; only public client configuration belongs in browser code.
- If a portable single-file edition remains useful, generate it from the modular production build instead of maintaining it as source.

### Acceptance Criteria

- A clean checkout can install dependencies, run locally, execute tests, and generate the same deployable site through documented commands.
- The production `dist` build works from the GitHub Pages repository subpath, online and after a successful offline cache warm-up.
- Existing local-storage preferences and saved player sessions survive the migration.
- Classic, Sprint, Daily Run, themes, audio, controls, leaderboards, identity, and release notes retain behavioral parity.
- Supabase or network failure never blocks local game startup or leaves menu controls unresponsive.
- Theme data can be added or revised without editing the gameplay controller or audio engine.
- Functional systems can be tested independently without loading the complete application.
- The maintained HTML becomes primarily semantic markup and application mount points rather than the source of the whole game.

### Recommended First Implementation Slice

Start with the smoke-test harness and the behavior-neutral CSS/JavaScript extraction. Do not split gameplay systems until that modular shell builds, deploys, updates through `sw.js`, and matches the current game on desktop and mobile Safari.

### Implementation Status

- **Source/build shell — implemented locally (2026-07-26).** The modular entry point now uses Vite, with extracted CSS and application JavaScript, reproducible hashed `dist/` output, asset packaging, and a generated asset-aware service-worker precache. The legacy `snake-game-turn.html` remains untouched as the behavioral reference.
- **Automated checks — implemented locally.** Existing contract tests now target the modular application source, and Playwright smoke tests cover the main menu, play/pause, theme selection, controls, and leaderboard flows. Final browser/Safari parity validation and production deployment remain pending.
- **Theme catalog extraction — implemented locally (2026-07-27).** Theme definitions, food sprites, picker artwork, and music arrangements now live in `src/themes/catalog.js`. The app validates the complete theme catalog, four-stage music progression, and matching sprites before a game can start; focused contract tests protect the catalog without loading gameplay.
- **Audio engine extraction — implemented locally (2026-07-27).** The complete Web Audio, native-track/MIDI fallback, mobile recovery, record-heartbeat, and fanfare system now lives in `src/audio/audio-engine.js`. `main.js` supplies explicit theme and game-state callbacks, allowing the engine to remain independent of gameplay globals.
- **Controls extraction — implemented locally (2026-07-27).** Keyboard, swipe, D-PAD, TURN, TAP, fade behavior, persisted control choice, and layout editing now live in `src/controls/control-manager.js`. `main.js` retains competitive run state and provides explicit direction, turn, pause, and input-recording callbacks.
- **Canvas renderer and visual-effects extraction — implemented locally (2026-07-27).** Canvas drawing, theme board treatments, sprites, interpolation, trails, particles, death effects, screen shake, and FPS display now live behind `src/rendering/canvas-renderer.js`. `main.js` provides a read-only game-state snapshot and explicit move, food, collision, and reset events.
- **Game timing and animation lifecycle extraction — implemented locally (2026-07-27).** `src/game/game-controller.js` now owns requestAnimationFrame lifetime, cancellation, clamped frame deltas, and accumulator resets. `main.js` supplies the gameplay callback while preserving existing countdown, Sprint, Daily Run, pause, and game-over behavior.
- **Unified live gameplay rules — implemented locally (2026-07-27).** The live movement tick now delegates wall/self collision, growth, food spawning, score, and speed progression to the same `SnakeCore.advanceState` rules used by replay verification. Daily Run retains deterministic free-cell food placement while Classic and Sprint retain their existing placement behavior.
- **Run lifecycle coordination — implemented locally (2026-07-27).** `src/game/run-lifecycle.js` now owns ordered run start/finish boundaries: cancelling a prior frame, resetting, starting the next frame, and delaying the result handoff. `main.js` supplies existing UI, audio, Daily replay verification, and result callbacks.
- **Competitive-mode rules and Daily Run service — implemented locally (2026-07-28).** `src/game/run-modes.js` owns timed-mode labels, countdowns, Sprint/Daily timer accounting, and Daily simulation-time clamping. `src/daily/daily-run-service.js` owns authoritative challenge loading, attempt reservation, challenge validation, and verified replay submission through explicit Supabase dependencies; `main.js` retains UI state and local-preview fallback behavior.
- **Supabase player and leaderboard services — implemented locally (2026-07-28).** Safe public-client creation, anonymous/session bootstrap transport, email-code transport, player-profile reads and writes, score submission, mode-wide record lookup, standard and Daily leaderboard pages, historical Daily archive statistics, and public player-card requests now live behind independently tested service modules. The remaining visible controllers were extracted on the same migration track.
- **Leaderboard/archive and player-identity controllers — implemented locally (2026-07-28).** `src/ui/leaderboard-controller.js` now owns leaderboard filters, paging, Daily archive/Legends presentation, and public player cards. `src/player/player-identity-controller.js` owns session reconciliation, profile presentation, initials/display-name updates, email-code flows, and player-panel behavior. `main.js` now composes those controllers through explicit state and service callbacks.
- **Live session coordinator and shared render assets — implemented locally (2026-07-28).** The requestAnimationFrame frame choreography for countdowns, Classic/Sprint/Daily clocks, simulation ticks, visual-effects updates, interpolation, and FPS updates now lives in `src/game/live-game-session.js`. The obsolete inline renderer was removed from `main.js`; live play and theme-picker previews now share `src/rendering/food-sprite.js`.
- **Expanded browser smoke coverage — implemented locally (2026-07-28).** Playwright now covers offline/Supabase-SDK failure, Daily Run’s first-run dialog, Random mode, every control mode, player/menu dialogs, leaderboard opening, and normal playable launch in addition to the baseline startup and pause/resume checks. Email-code transport and game-over submission decisions remain covered by focused deterministic service/lifecycle tests because they require real authentication or a completed run rather than a reliable browser-only fixture.
- **GitHub Pages preview deployment — implemented locally (2026-07-27).** `deploy-preview.ps1` builds the same Vite artifact and replaces only `preview/` on `gh-pages`, leaving production at the branch root intact for mobile testing at `/snake-game/preview/`.

### Transactional Email Deliverability

- **Planned.** Use a branded custom-SMTP sender aligned with SPF, DKIM, and DMARC; keep authentication mail strictly transactional; disable provider click/open tracking; and monitor real-message authentication results and spam placement.
- **Template standard.** Maintain concise OTP templates for both Restore Player and Change Email Address flows: a clear Snake Arcade sender and subject, a prominent `{{ .Token }}` code, no marketing copy or unnecessary links, and a short “ignore if you did not request this” notice.

## Competitive Play Roadmap

The competitive roadmap should build on the game's existing fixed board, persistent player identity, Supabase leaderboard, per-run game-mode freezing, and authenticated score-submission flow. The shared foundation for Daily Run and Vs mode is a deterministic, versioned gameplay core: given the same ruleset, seed, and input events, the browser and server must reproduce the same run.

### Daily Run — Backend Deployed; End-to-End Verification Pending

Implementation started on 2026-07-22. The deterministic foundation is in place: `snake-core.js` defines the permanent `snake-rules-v1` ruleset identifier, seeded gameplay PRNG, shared initial-state and food-placement operations, deterministic state advancement, and the versioned replay/input format. Classic and Sprint consume food randomness through this core while retaining native unseeded behavior. The core is packaged by the GitHub Pages deployment script, cached network-first for offline launches, and covered by deterministic reproduction tests.

The authoritative ranked implementation was staged locally and deployed to Supabase on 2026-07-22. `supabase-daily-run.sql` defines server-owned UTC challenges, atomic and idempotent run reservation, private attempt/replay storage, and a best-per-player Daily leaderboard. The deployed `submit-daily-attempt` Edge Function independently reproduces submitted runs before marking them verified. The client retrieves the authoritative challenge, reserves immediately before countdown, submits ranked replays automatically, falls back to explicitly unranked local preview when the backend is unavailable, and renders the dedicated Daily leaderboard. The live Edge endpoint passed its CORS/availability check; end-to-end ranked-run verification and website deployment remain.

Unlimited ranked Daily runs were adopted locally on 2026-07-24 to keep players invested throughout the entire UTC day. Every verified run remains stored for audit, while only the player's strongest result represents them on the leaderboard. The original 110 ms opening step interval remains unchanged pending playtesting; the proposed “30% faster” setting is deliberately deferred because reducing the interval by 30% would actually increase movement frequency by roughly 43%.

Historical Daily leaderboards and Daily Legends were implemented locally on 2026-07-22. The leaderboard now keeps its archive date separate from today's playable challenge, provides older/newer day navigation plus a return-to-today action, and displays each challenge's winner, score, theme, and participation count. The companion `daily_leaderboard_days` and `daily_player_stats` views power all-time wins, podiums, top-ten finishes, win rate, longest/current participation streaks, and longest/current winning streaks. Daily Legends excludes the still-open current UTC challenge and remains hidden until at least one completed day has ranked results. The in-game presentation then highlights the headline record holders and top five players by daily wins. — **Implemented; Supabase archive SQL and website deployment pending**

Local gameplay preview added on 2026-07-22. The main menu now exposes **Daily Run** using a UTC-date-derived preview seed, deterministic one-value-per-food placement, a locked daily theme, local daily best, replay capture, and final-food timing. Preview results are deliberately excluded from Supabase and clearly labeled unranked until the authoritative challenge and attempt backend is implemented.

Daily Run onboarding and local replay verification added on 2026-07-22. The first run on a device now pauses before the countdown for an original cave-dialog-style 8-bit rules screen explaining the 60-second objective, shared seeded challenge, unlimited ranked runs during the UTC day, tie-break rule, and collision rule. Completed preview replays are immediately re-simulated through `snake-core.js`; forged or divergent results fail the local verification check.

Launch Daily Run first as a seeded **Sprint 60** challenge. A short, fixed-duration run is easy to understand, encourages repeat competition, and prevents one attempt from demanding an unpredictable amount of time.

Recommended rules:

- Use the same logical board, food sequence, ruleset version, and theme for every player that day.
- Define each challenge by UTC date so it changes simultaneously worldwide and cannot be changed by the device clock.
- Allow unlimited ranked runs during each UTC day so players can continuously improve their result.
- Initial launch policy: allow anonymous device-bound players with saved initials to use ranked attempts, with the allowance keyed to their current Supabase Auth UUID. This deliberately favors low-friction adoption even though clearing site data can create a new device identity.
- Future competitive hardening: require a persistent, email-restorable player for ranked attempts. Keep device-bound players eligible for unranked practice after this requirement is activated.
- Maintain one undisputed daily leaderboard regardless of control method. Continue displaying control method as metadata and optionally provide filters, but do not divide the primary ranking.
- Use score first and earliest achievement as the tie-break order.
- Lock the Daily theme to the server-provided theme so the challenge has one shared visual and musical identity.
- Keep cosmetic randomness independent; only gameplay-affecting randomness must use the seeded generator.

Competitive presentation:

- Show the daily challenge number, remaining ranked attempts, current rank, percentile, and time until the next challenge.
- Show the closest rivals immediately above and below the player instead of only the global top ten.
- Track daily participation streaks, best daily finish, podium finishes, and daily wins.
- Browse read-only past-day standings without changing or replaying the current UTC challenge. — **Implemented locally 2026-07-22**
- Adapt the existing heartbeat and border-warning experience to the daily #1 score without covering or resizing the board. — **Implemented locally 2026-07-29**
- At game over, show score, rank movement, personal daily best, and the score needed to pass the next rival.
- Provide a compact share result containing challenge number, score, rank, streak, and a challenge link without revealing a replay that could be trivially copied.

Backend model:

- Add `daily_challenges` with challenge date, seed, fixed theme, mode, duration, board dimensions, and `ruleset_version`.
- Add `daily_attempts` with challenge, player, attempt number, score, control method, run ID, replay data, verification state, and timestamps.
- Add a unique constraint for one numbered attempt per player and challenge, plus ranking indexes by challenge and score.
- Add `get_daily_challenge()` to return the authoritative current UTC challenge.
- Add `start_daily_attempt()` to atomically reserve an official attempt and issue a short-lived run token.
- Consume a ranked attempt only after the player confirms the rules and the backend authorizes the run, immediately before countdown. Use a client-generated idempotency key so retrying a lost response returns the same reservation instead of consuming another attempt. Once countdown begins, quitting, reloading, disconnecting, or colliding still consumes that attempt.
- Rank each player's best verified result from all runs that day and preserve every attempt for audit.
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

**Persistent-session implementation completed locally 2026-07-30; upgraded Supabase SQL and Edge Function deployment plus two-device preview testing remain pending.** Live Vs rooms now survive completed rounds and act as an ongoing battle lobby. The server atomically archives each verified round, preserves both final scores and final-food times, tracks host/guest victories and draws, exposes recent battle history, and issues a fresh seed for every new synchronized round. The redesigned 8-bit lobby presents the head-to-head series, last result, compact expandable battle archive, readiness, latency diagnostics, and continuous next-round flow. Invitations now share a directly joinable `?vs=ROOMCODE` URL instead of code-only text.

**Vs Casual stage-select pass implemented locally 2026-07-30; Supabase deployment and two-device validation pending.** Before every match, both players now privately choose and lock a theme, including Random. The server expands Random choices deterministically, resolves matching choices immediately, or authoritatively chooses between different selections. Both clients use server timestamps to show the same fighting-game-style arena roulette before the synchronized countdown. A code-native pixel tombstone now appears and fades at a fallen rival's final grid cell, while remaining purely cosmetic.

- Create private room codes, invitations, ready states, and a synchronized countdown. — **Implemented locally 2026-07-30**
- Start with a same-seed Sprint 60 race on independent boards. — **Implemented locally 2026-07-30**
- Show opponent score and connection state in the HUD. — **Opponent score and connection-loss handling implemented locally 2026-07-30; compact progress meter deferred**
- Render a restrained live Rival Ghost behind food and the local snake at low opacity; it has no collision or gameplay effect and fades when updates become stale. — **Implemented locally 2026-07-30**
- Let both players select a theme before each Vs Casual round, conceal choices until both lock, resolve disagreements with a synchronized arena roulette, and permit Random as a real selection. — **Implemented locally 2026-07-30; Supabase deployment and two-device validation pending**
- Mark a fallen rival's last position with a brief, non-interactive pixel-art tombstone. — **Implemented locally 2026-07-30**
- Broadcast progress and status, but never accept a broadcast score as the final result. — **Implemented locally 2026-07-30**
- Submit both input replays after the race and let the server confirm the winner. — **Verifier and score/time tiebreak implemented locally 2026-07-30; deployment pending**
- Return both players to the same persistent lobby after verification, show both authoritative final scores, retain head-to-head records, and support repeated stage-select/ready-up rounds without leaving the room. — **Implemented locally 2026-07-30; deployment and two-device validation pending**
- Define reconnect, abandonment, timeout, and tie behavior before exposing ranked live matches. — **Initial rules implemented locally 2026-07-30:** a brief Realtime grace period protects transient drops; focus loss or a sustained disconnect forfeits an active race; pre-start departures cancel the room; exact score/time equality is a draw. Longer reconnection and abandoned-room cleanup still require preview validation.
- Do not use split-screen boards on mobile.
- Defer attacks, garbage blocks, shared obstacles, and board-to-board mutations until basic live races are proven reliable.

Implemented first-slice Vs data model:

- `live_vs_matches`: code, ruleset, seed, theme, state, creator, synchronized start, expiration, outcome, and winner.
- `live_vs_players`: match, player, seat, ready/connection state, replay, verified result, and connection timestamps.
- Replays are stored with the match participant for this first slice; reusable shared replay storage remains a later normalization option.
- Edge Functions or security-definer RPCs for room creation, joining, attempt issuance, replay submission, and winner confirmation.
- Strict row-level security so room participants can update only their permitted presence and submission records.

### Recommended Implementation Order

1. Extract deterministic gameplay operations into a versioned core shared by normal play, seeded play, replay simulation, and validation. — **Foundation implemented 2026-07-22; full browser/server integration in progress**
2. Add the Random Theme button as an isolated low-risk improvement. — **Implemented 2026-07-21**
3. Add seeded local runs and prove that identical seeds plus inputs reproduce identical scores. — **Local Daily Run preview and replay round-trip implemented 2026-07-22**
4. Implement Daily Run with authoritative challenge retrieval, unlimited ranked runs, and a dedicated leaderboard. — **Backend deployed to Supabase 2026-07-22; unlimited-run policy implemented locally 2026-07-24; end-to-end ranked-run verification and website deployment pending**
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
