---
type: "diagnosis"
date: "2026-07-19T12:52:15.697376+00:00"
question: "Check why the top HUD controls appear randomly aligned"
contributor: "graphify"
outcome: "useful"
---

# Q: Check why the top HUD controls appear randomly aligned

## Answer

The HUD uses five grid columns: flexible score, then three auto-sized center columns, then flexible best. Because mode, timer, and pause widths vary, their positions shift rather than occupying stable tracks. A new accessibility-only record-chase element was appended after BEST, which also broke the .hud-stat:last-child selector, so BEST lost right alignment. The robust correction is explicit grid areas/fixed center tracks and an explicit BEST class or grid-area instead of last-child.

## Outcome

- Signal: useful