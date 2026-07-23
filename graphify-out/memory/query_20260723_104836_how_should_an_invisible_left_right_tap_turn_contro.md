---
type: "query"
date: "2026-07-23T10:48:36.687040+00:00"
question: "How should an invisible left/right Tap Turn control be integrated across the Snake game?"
contributor: "graphify"
source_nodes: ["D-PAD and TURN Input System", "Run Control Method Tracking", "Customizable Touch Controls", "Supabase Leaderboard", "Ranked Score Submission", "Daily Run"]
---

# Q: How should an invisible left/right Tap Turn control be integrated across the Snake game?

## Answer

Implemented Tap Turn as the distinct TAP control method. The controls menu persists tap selection, hides D-PAD and TURN overlays, disables layout customization, and explains invisible left/right board zones. Canvas touchstart and mouse input convert the horizontal half into counter-clockwise/clockwise turns while existing deterministic setDir replay capture remains authoritative. TAP is included in run labels, record chase eligibility, leaderboard filters, Classic/Sprint score RPC validation, Daily schema validation, and both Edge Function sources. Added a dashboard-ready Supabase migration and documented Junior Mode plus the completed TAP feature in FUTURE-ROADMAP.md. Inline JavaScript parsed and deterministic core/Daily validator tests passed.

## Source Nodes

- D-PAD and TURN Input System
- Run Control Method Tracking
- Customizable Touch Controls
- Supabase Leaderboard
- Ranked Score Submission
- Daily Run