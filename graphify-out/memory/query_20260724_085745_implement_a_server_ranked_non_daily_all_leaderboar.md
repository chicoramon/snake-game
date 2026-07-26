---
type: "query"
date: "2026-07-24T08:57:45.283993+00:00"
question: "Implement a server-ranked non-Daily ALL leaderboard with one best score per player across control methods while preserving individual filters and pagination."
contributor: "graphify"
source_nodes: ["Supabase Leaderboard", "Game Mode Control and Theme Filters", "Leaderboard Pagination", "Control Method Column", "Ranked Score Submission"]
---

# Q: Implement a server-ranked non-Daily ALL leaderboard with one best score per player across control methods while preserving individual filters and pagination.

## Answer

Implemented supabase-leaderboard-overall-best.sql with get_overall_leaderboard, which filters by mode and optional theme, deduplicates owned rows by stable player_id, preserves unowned legacy rows, chooses the highest score with earliest-achievement tie breaking, then ranks, counts, and paginates server-side. Updated submit_best_score in the migration so its returned overall rank follows the same one-player ranking. Updated snake-game-turn.html so only non-Daily ALL uses the RPC; Daily and individual control filters are unchanged. Added setup documentation and a Node integration-contract test. All four tests pass and the inline JavaScript compiles.

## Source Nodes

- Supabase Leaderboard
- Game Mode Control and Theme Filters
- Leaderboard Pagination
- Control Method Column
- Ranked Score Submission