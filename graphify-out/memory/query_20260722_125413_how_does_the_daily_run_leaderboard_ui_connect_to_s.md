---
type: "query"
date: "2026-07-22T12:54:13.671017+00:00"
question: "How does the Daily Run leaderboard UI connect to Supabase leaderboard views, game mode state, and roadmap?"
contributor: "graphify"
source_nodes: ["Supabase Leaderboard", "Game Mode Control and Theme Filters", "Daily Run"]
---

# Q: How does the Daily Run leaderboard UI connect to Supabase leaderboard views, game mode state, and roadmap?

## Answer

Daily archive browsing is isolated in lbState.dailyDate while dailyChallenge remains today's playable seed. daily_leaderboard_days supplies challenge history and winners; daily_player_stats supplies lifetime wins, podiums, and streak records. The leaderboard UI loads those read-only views only for Daily mode and the roadmap records the implementation.

## Source Nodes

- Supabase Leaderboard
- Game Mode Control and Theme Filters
- Daily Run