# Snake Game — Findings and Enhancement Opportunities

_Project review snapshot: July 19, 2026_

## Executive summary

The game already has a strong foundation. It is a polished, responsive arcade game rather than a minimal Snake implementation: it combines multiple game modes, theme-specific presentation and adaptive music, configurable controls, persistent player identity, fair leaderboard segmentation, mobile-focused interaction, and GitHub Pages deployment.

The main technical risk discovered during testing is update reliability on mobile Safari. The current cache-first service worker can preserve an old HTML build and make the menu appear broken until Safari website data is cleared. The permanent replacement is documented in `FUTURE-ROADMAP.md`.

## Confirmed strengths

### Core gameplay

- A consistent 20 × 32 logical board keeps runs comparable across screen sizes.
- Classic and 60-second Sprint modes maintain separate best scores and leaderboard categories.
- Movement uses a fixed simulation step with interpolated rendering for smooth high-refresh-rate animation.
- Runs pause automatically when the page loses visibility, preventing hidden-tab time advancement.
- Collision handling, particles, trails, screen shake, food animation, and death effects give the game a complete arcade feel.

### Theme system

- Themes define their own colors, board treatment, snake appearance, food sprite, sound effects, and adaptive music.
- Theme artwork is pixel-oriented and rendered without smoothing.
- The music engine increases arrangement intensity as the snake grows and adjusts tempo by theme.
- The LEGO theme extends the system with a brick/stud visual identity, minifigure-inspired food, construction-like percussion, custom icon art, and a distinct adaptive musical arrangement.
- `NEW-THEME-GUIDE.md` provides a repeatable process for future themes.

### Controls and mobile interaction

- Players can choose between D-pad and relative turn controls.
- Touch control layouts can be repositioned and saved locally.
- Keyboard, touch buttons, and swipe input are supported.
- The game records the control method used for each run.
- Runs that mix control methods are deliberately unranked, protecting leaderboard comparability.
- Touch controls now fade after 500 ms, reducing obstruction of the game board.
- Mobile audio includes recovery logic for suspended or interrupted Web Audio contexts.

### Player identity and score persistence

- Supabase authentication supports guest play and email-based restoration across devices.
- The UI now matches the delivered eight-digit email OTP.
- Players have three-character arcade initials plus a separate four-character identity code.
- Personal-best scores can auto-submit by game mode and control method.
- Failed submissions are queued locally and retried later.
- Identity initialization is deferred and error-contained so an authentication failure does not block the main menu.
- The database functions validate initials, score, theme, control method, and game mode server-side.
- Row-level security and restricted function grants are included in the player-identity migration.

### Leaderboards

- Scores can be filtered by game mode, control method, and theme.
- Pagination prevents an unbounded leaderboard response.
- Player-owned entries can be marked in the leaderboard UI.
- Database indexes cover the primary ranking combinations.
- Personal-best submission uses a unique player/mode/control key to avoid duplicate best-score rows for the same category.

### Deployment

- The local repository is connected to `chicoramon/snake-game`.
- `deploy-gh-pages.ps1` publishes `snake-game-turn.html` as `index.html` on the `gh-pages` branch.
- A dry-run mode is available before pushing.
- `DEPLOYMENT.md` records the deployment workflow and GitHub Pages configuration.

## Findings and remaining risks

### 1. Safari can retain an obsolete game build

The current inline PWA setup uses a fixed `snake-v1` cache and checks Cache Storage before the network. An old cached HTML response can therefore continue loading even when a newer deployment exists. This explains the observed behavior where Private Browsing worked but normal Safari showed a dead menu; clearing Safari cache and website data resolved it.

The worker is also generated as a `blob:` URL and registration failures are silently ignored. A service worker should instead be deployed as a same-origin HTTP(S) JavaScript file, with failures visible in the console.

Planned resolution: add a real `sw.js`, use network-first navigation with offline fallback, delete obsolete caches during activation, and publish the worker through the deployment script. See `FUTURE-ROADMAP.md`.

### 2. The single HTML file is becoming expensive to maintain

The single-file format is convenient to distribute, but gameplay, UI, theme data, audio sequences, PWA setup, Supabase integration, player identity, and leaderboard logic now live together. Large embedded SVG and music datasets make navigation and review harder and increase the chance that an unrelated change affects startup.

Recommended direction:

- Keep a generated single-file release if that format remains desirable.
- Maintain source modules separately for gameplay, audio, themes, identity, leaderboard, controls, and PWA behavior.
- Build or assemble those modules into the deployable HTML.
- Move large theme definitions into structured source files with automated validation.

### 3. Startup dependencies should remain non-blocking

The Supabase UMD client is loaded from a CDN. If it is unavailable, blocked, or slow, guest gameplay should still work. The current guarded initialization is the correct direction and should be preserved whenever identity or leaderboard code is changed.

Recommended safeguards:

- Keep core menu handlers registered independently from remote-service initialization.
- Display a clear offline/leaderboard-unavailable state instead of failing silently.
- Add a timeout around remote startup and score requests.
- Continue queueing scores locally when the backend cannot be reached.

### 4. Deployment needs explicit release identity

Query-string cache busting helped diagnose the Safari issue but is not a durable release strategy. A visible build identifier would make production debugging easier and would show whether a phone is actually running the expected deployment.

Recommended additions:

- Stamp each deployment with a short commit SHA or build timestamp.
- Expose the version in the debug overlay or an About panel.
- Include the version in diagnostic logs and service-worker cache names when appropriate.

### 5. Automated regression coverage is limited

The game has many interacting browser states: first visit, returning visit, stale cache, offline mode, guest identity, restored identity, OTP verification, queued scores, mixed controls, Sprint timeout, and audio interruption. Manual testing alone will become increasingly fragile as themes and account features grow.

High-value automated checks:

- The main menu buttons respond before and after identity initialization.
- Classic and Sprint start, pause, finish, and restart correctly.
- D-pad, turn, keyboard, and swipe controls register the expected run method.
- Mixed-control runs remain unranked.
- Eight-digit OTP input accepts and submits exactly eight digits.
- A failed score submission enters the pending queue and later retries.
- Leaderboard filters produce the intended Supabase query combinations.
- A newly deployed navigation returns fresh HTML while offline navigation falls back to cache.
- Theme music layers retain the expected four intensity levels and 48-step sequences.

### 6. Theme growth needs validation and originality checks

Themes are a defining feature, but every new theme adds substantial visual and audio data. A malformed sequence or missing sprite can break a theme at runtime, while overly direct use of recognizable commercial source material may create intellectual-property concerns for public distribution.

Recommended controls:

- Validate required theme properties automatically.
- Verify all music layers have four intensity levels and equal sequence lengths.
- Confirm every theme has picker art and a food sprite fallback.
- Prefer original music that evokes a genre, instrument palette, or gameplay mood instead of reproducing protected melodies.
- Consider original theme names and artwork if the project moves beyond personal experimentation.

### 7. Accessibility can be expanded

The UI already includes several labels, focus-visible styles, reduced-motion handling, and a canvas description. Further work would make the game easier to use with assistive technology and alternate input needs.

Recommended improvements:

- Use semantic `<button>` elements for all touch controls and theme choices.
- Ensure every dialog traps focus and restores focus to its opener when closed.
- Announce game-over score, Sprint countdown, pause state, and submission outcomes consistently.
- Add a high-contrast option independent of theme colors.
- Offer separate music and sound-effect volume controls.

### 8. Secrets and trust boundaries should remain explicit

The Supabase anonymous key in browser code is expected to be public; security must come from Row Level Security, constrained RPC functions, validation, and database permissions. No service-role key should ever be placed in the HTML or deployment branch.

Recommended review before wider launch:

- Re-run all SQL migrations against the production project and verify policies through anonymous and authenticated sessions.
- Rate-limit OTP requests and score submission where supported.
- Confirm leaderboard reads reveal only intended public fields.
- Monitor rejected RPC calls and unusual score activity.

## Suggested priority order

1. Replace the stale cache/service-worker implementation.
2. Add a small automated smoke suite covering menu startup, gameplay start, and identity failure.
3. Add build/version visibility to production deployments.
4. Modularize source while retaining a single-file release artifact.
5. Add automated theme schema and music-sequence validation.
6. Expand accessibility and production abuse protections.

## Documentation map

- `FUTURE-ROADMAP.md` — planned PWA and Safari cache replacement.
- `DEPLOYMENT.md` — GitHub Pages deployment instructions.
- `NEW-THEME-GUIDE.md` — process and quality bar for new themes.
- `SUPABASE_PLAYER_IDENTITY_SETUP.md` — player identity setup guidance.
- `supabase-player-identity-auto-submit.sql` — profile, security, and personal-best database changes.
- `supabase-leaderboard-game-mode.sql` — game-mode leaderboard migration and indexes.
