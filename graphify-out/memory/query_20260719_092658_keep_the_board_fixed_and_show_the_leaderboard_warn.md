---
type: "implementation"
date: "2026-07-19T09:26:58.939927+00:00"
question: "Keep the board fixed and show the leaderboard warning by replacing the CLASSIC or SPRINT HUD label"
contributor: "graphify"
outcome: "corrected"
correction: "The prior second HUD row caused an unwanted mid-run canvas resize; record feedback must reuse the existing mode label instead."
---

# Q: Keep the board fixed and show the leaderboard warning by replacing the CLASSIC or SPRINT HUD label

## Answer

Removed the record warning's visible second HUD row and all record-triggered resize calls. The separate record-chase element is now an accessibility-only live region. During a warning, hud-mode displays compact text such as 2 TO #1; after passing the target it displays NEW #1, and hideRecordChase restores CLASSIC or SPRINT. The red canvas border pulse remains independent and cannot change canvas dimensions. JavaScript parsing and explicit no-resize assertions passed.

## Outcome

- Signal: corrected
- Correction: The prior second HUD row caused an unwanted mid-run canvas resize; record feedback must reuse the existing mode label instead.