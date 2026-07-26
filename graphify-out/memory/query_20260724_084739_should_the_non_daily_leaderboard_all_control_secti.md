---
type: "query"
date: "2026-07-24T08:47:39.199306+00:00"
question: "Should the non-Daily leaderboard ALL control section show only each player all-time best score across control methods?"
contributor: "graphify"
source_nodes: ["Supabase Leaderboard", "Game Mode Control and Theme Filters", "Leaderboard Pagination", "Control Method Column", "Leaderboard Control Method Migration", "Ranked Score Submission"]
---

# Q: Should the non-Daily leaderboard ALL control section show only each player all-time best score across control methods?

## Answer

Yes. The leaderboard table stores one personal-best row per player, game mode, and control method, while the client ALL filter reads those raw rows. This produces duplicate players. ALL should filter by game mode and optional theme, then keep each stable player_id highest score across controls, using earliest created_at for equal scores, and rank and paginate the deduplicated result server-side. Control-specific tabs should remain unchanged, and the retained row should display the control method used for that overall best. Use a Supabase RPC or equivalent server-side query rather than client-side page deduplication so ranks, counts, and pagination remain correct.

## Source Nodes

- Supabase Leaderboard
- Game Mode Control and Theme Filters
- Leaderboard Pagination
- Control Method Column
- Leaderboard Control Method Migration
- Ranked Score Submission