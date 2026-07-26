---
type: "query"
date: "2026-07-24T09:12:31.900536+00:00"
question: "Why does the live non-Daily ALL leaderboard still show repeated player names after overall-best deduplication?"
contributor: "graphify"
source_nodes: ["Supabase Leaderboard", "Opening Game Identity", "Game Mode Control and Theme Filters", "Legacy Score Classification"]
---

# Q: Why does the live non-Daily ALL leaderboard still show repeated player names after overall-best deduplication?

## Answer

Verified that the live GitHub Pages client contains get_overall_leaderboard and queried the production RPC directly. It returns one row per player_id correctly. Repeated initials belong to different owned Supabase identities with different public player codes: Classic BAS has 06BF, 9F25, 0777, and C402; KHF has 9ED5 and 6686; RAM has C51B and 3477. Sprint AAD has 1DB0 and 97B8. This is historical anonymous/device identity duplication, not duplicate control-method rows for one account. Do not merge by initials automatically because initials are intentionally reusable. Resolve confirmed same-person duplicates through an explicit canonical identity merge and encourage email-restorable identity use.

## Source Nodes

- Supabase Leaderboard
- Opening Game Identity
- Game Mode Control and Theme Filters
- Legacy Score Classification