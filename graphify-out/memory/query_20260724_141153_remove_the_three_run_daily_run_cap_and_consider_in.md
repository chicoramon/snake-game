---
type: "query"
date: "2026-07-24T14:11:53.932682+00:00"
question: "Remove the three-run Daily Run cap and consider increasing the initial speed by 30 percent."
contributor: "graphify"
source_nodes: ["Score and Speed Progression", "Ranked Score Submission", "Supabase Leaderboard", "Snake Game"]
---

# Q: Remove the three-run Daily Run cap and consider increasing the initial speed by 30 percent.

## Answer

Implemented unlimited ranked Daily runs through the existing reversible server configuration, enabled by default for clean installs and through a dashboard-ready rollout migration for the deployed project. Replaced all player-facing three-attempt and debug language, updated onboarding, setup docs, roadmap, What's New, and both Edge Function sources, while retaining best-per-player ranking. Deferred the speed change: the current 110 ms opening interval remains because a 30 percent interval reduction would be a 43 percent movement-rate increase and any pace change must be versioned consistently in the browser, shared core, and replay validator.

## Source Nodes

- Score and Speed Progression
- Ranked Score Submission
- Supabase Leaderboard
- Snake Game