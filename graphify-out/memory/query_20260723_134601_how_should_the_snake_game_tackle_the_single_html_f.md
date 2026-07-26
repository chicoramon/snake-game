---
type: "query"
date: "2026-07-23T13:46:01.768305+00:00"
question: "How should the Snake game tackle the single HTML file becoming expensive to maintain?"
contributor: "graphify"
source_nodes: ["Snake Game", "Game Loop", "D-PAD and TURN Input System", "Local Preferences", "Offline Service Worker Cache"]
---

# Q: How should the Snake game tackle the single HTML file becoming expensive to maintain?

## Answer

Use an incremental strangler refactor, not a rewrite. The current 343 KB HTML contains roughly 1,640 lines of CSS and 4,700+ lines of JavaScript, while snake-core.js and sw.js already prove that GitHub Pages and the deployment flow support external files. First establish browser smoke tests and theme-schema validation. Add a Vite-based source tree and make dist/ the only deployable artifact; update deploy-gh-pages.ps1 to publish dist recursively. In the first behavior-neutral extraction, move CSS to src/styles/game.css and the inline script wholesale to src/main.js, leaving HTML as semantic markup. Then extract data and feature boundaries one at a time: theme catalog/sprites/music, audio engine, renderer, control manager, game controller, Daily mode, Supabase identity/leaderboard services, and UI dialogs. main.js remains the composition root and dependencies use explicit callbacks rather than new globals. Preserve snake-core.js ruleset behavior because browser replays, Node tests, and the Daily Edge validator must remain deterministic. Configure the PWA build to precache hashed JS/CSS assets while retaining network-first navigation so Safari cannot be pinned to old HTML. Keep every extraction deployable, avoid mixing refactors with features, and remove the legacy section only after parity tests pass. A separate optional single-file bundle may be generated later, but the maintained source and GitHub Pages release should be modular.

## Source Nodes

- Snake Game
- Game Loop
- D-PAD and TURN Input System
- Local Preferences
- Offline Service Worker Cache