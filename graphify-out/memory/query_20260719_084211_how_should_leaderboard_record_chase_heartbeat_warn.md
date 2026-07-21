---
type: "query"
date: "2026-07-19T08:42:11.564364+00:00"
question: "How should leaderboard record chase heartbeat warnings and top-score fireworks with victory music be implemented?"
contributor: "graphify"
source_nodes: ["Supabase Leaderboard", "Game Tick", "Theme-Aware Web Audio Engine", "Particle System", "Game Loop"]
---

# Q: How should leaderboard record chase heartbeat warnings and top-score fireworks with victory music be implemented?

## Answer

Implementation design: fetch and cache the eligible board top score asynchronously; after each food pickup compare score to the frozen target; start a dedicated accelerating lub-dub audio layer and HUD countdown within a dynamic threshold; on score greater than the target trigger a one-shot celebration state that freezes gameplay but continues rendering, launches a separate fireworks pool, ducks theme music, and plays an original classic 8-bit rescue-style fanfare; resume after several seconds. Treat the live result as provisional and extend submit_best_score to return is_new_top, previous_top_score, and rank for authoritative confirmation. Disable chase for mixed-control unranked runs and handle offline, mute, race, tie, Sprint, and Safari cases.

## Source Nodes

- Supabase Leaderboard
- Game Tick
- Theme-Aware Web Audio Engine
- Particle System
- Game Loop