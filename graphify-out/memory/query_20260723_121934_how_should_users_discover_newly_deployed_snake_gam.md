---
type: "query"
date: "2026-07-23T12:19:34.278839+00:00"
question: "How should users discover newly deployed Snake game features?"
contributor: "graphify"
source_nodes: ["Overlay Panel Hierarchy", "Primary and Secondary Action Hierarchy", "Local Preferences", "Opening Game Identity"]
---

# Q: How should users discover newly deployed Snake game features?

## Answer

Implemented a data-driven in-game WHAT'S NEW system in snake-game-turn.html. The main menu now has a permanent bulletin button and device-local NEW badge. A pixel-arcade modal automatically opens only on the idle main menu when CURRENT_RELEASE_ID differs from the acknowledged localStorage value; acknowledging it clears the badge, while the full recent release history remains accessible. Release entries are rendered safely through DOM text nodes, the panel supports backdrop, button, and Escape dismissal, and ?whatsnew=1 forces a QA preview. Added the completed feature to FUTURE-ROADMAP.md. Inline JavaScript parsing, deterministic core tests, Daily validator tests, diff checks, and a headless mobile-sized visual review passed after making the card viewport-safe.

## Source Nodes

- Overlay Panel Hierarchy
- Primary and Secondary Action Hierarchy
- Local Preferences
- Opening Game Identity