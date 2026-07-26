---
type: "query"
date: "2026-07-24T14:23:53.459210+00:00"
question: "Implement a non-intrusive optional Display Name invitation when players open the Snake game."
contributor: "graphify"
source_nodes: ["Opening Game Identity", "Snake Game"]
---

# Q: Implement a non-intrusive optional Display Name invitation when players open the Snake game.

## Answer

Implemented a compact main-menu callout only for players who already have arcade initials but no public display name. Add Name opens the existing Player panel and focuses the field after an explicit tap; Later snoozes the prompt for seven days, and two dismissals stop automatic prompts while an ADD NAME badge remains on the Player button. The prompt is suppressed during gameplay and for the entire session when the automatic What's New bulletin is due, and it disappears immediately after a display name is saved. Added contract coverage and verified all 15 tests plus inline JavaScript compilation.

## Source Nodes

- Opening Game Identity
- Snake Game