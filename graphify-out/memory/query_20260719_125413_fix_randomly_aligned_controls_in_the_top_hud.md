---
type: "implementation"
date: "2026-07-19T12:54:13.752213+00:00"
question: "Fix randomly aligned controls in the top HUD"
contributor: "graphify"
outcome: "corrected"
correction: "HUD alignment must use explicit areas rather than auto-sized columns and last-child selectors."
---

# Q: Fix randomly aligned controls in the top HUD

## Answer

Replaced source-order auto-column placement with explicit grid areas: score, mode, timer, pause, best. Added stable center tracks of 64-78px, 50px, and 42px; anchored SCORE left and BEST right with explicit classes; centered mode, timer, and pause in their assigned areas; removed fragile .hud-stat:last-child alignment. The record live region remains outside visual layout and canvas sizing is unchanged. JavaScript and CSS structure checks passed.

## Outcome

- Signal: corrected
- Correction: HUD alignment must use explicit areas rather than auto-sized columns and last-child selectors.