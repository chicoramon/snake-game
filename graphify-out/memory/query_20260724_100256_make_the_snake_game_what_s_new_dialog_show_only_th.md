---
type: "query"
date: "2026-07-24T10:02:56.315746+00:00"
question: "Make the Snake game What's New dialog show only the latest update, with older updates available by date."
contributor: "graphify"
source_nodes: ["Snake Game", "Theme Catalog", "Game Mode Control and Theme Filters"]
---

# Q: Make the Snake game What's New dialog show only the latest update, with older updates available by date.

## Answer

Changed the bulletin to render only WHATS_NEW_RELEASES[0] initially. Added a View Older Updates control that reveals a hidden archive; each historical release is a collapsed details row labeled with its date and title, and expands independently. Added responsive arcade styling, ARIA expanded state, and regression tests for latest-only rendering and dated history.

## Source Nodes

- Snake Game
- Theme Catalog
- Game Mode Control and Theme Filters