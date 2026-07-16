# Graph Report - .  (2026-07-14)

## Corpus Check
- Corpus is ~10,653 words - fits in a single context window. You may not need a graph.

## Summary
- 81 nodes · 112 edges · 9 communities
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Run Timing, Pause and Effects
- Gameplay Audio and Progression
- Fair Board and PWA
- Classic and Sprint State
- Ranked Controls and Submission
- Direction and Touch Controls
- Game Mode Leaderboard Schema
- Theme and Visual Identity
- Control Method Database Schema

## God Nodes (most connected - your core abstractions)
1. `Game Loop` - 10 edges
2. `Game Tick` - 9 edges
3. `Pause System` - 8 edges
4. `Game State` - 7 edges
5. `Game Mode Control and Theme Filters` - 7 edges
6. `Frozen Run Game Mode` - 7 edges
7. `Fixed 20 by 32 Logical Board` - 6 edges
8. `Supabase Leaderboard` - 6 edges
9. `Leaderboard Game Mode Migration` - 6 edges
10. `Snake Game` - 5 edges

## Surprising Connections (you probably didn't know these)
- `Game Mode Control and Theme Filters` --shares_data_with--> `Control and Theme Ranking Indexes`  [INFERRED]
  snake-game-turn.html → supabase-leaderboard-control-method.sql
- `Supabase Leaderboard` --shares_data_with--> `Control Method Column`  [EXTRACTED]
  snake-game-turn.html → supabase-leaderboard-control-method.sql
- `Supabase Leaderboard` --shares_data_with--> `Game Mode Column`  [EXTRACTED]
  snake-game-turn.html → supabase-leaderboard-game-mode.sql
- `Game Mode Control and Theme Filters` --shares_data_with--> `Mode Control and Theme Ranking Indexes`  [INFERRED]
  snake-game-turn.html → supabase-leaderboard-game-mode.sql
- `Game Mode Control and Theme Filters` --shares_data_with--> `Mode-Wide Score Index`  [INFERRED]
  snake-game-turn.html → supabase-leaderboard-game-mode.sql

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Fixed Board Rendering and Resize Safety** — snake_game_turn_fixed_logical_board, snake_game_turn_responsive_canvas_scaling, snake_game_turn_visual_viewport, snake_game_turn_resize_safety, snake_game_turn_score_comparability [INFERRED 0.90]
- **Run Continuity Protection** — snake_game_turn_game_loop, snake_game_turn_frame_delta_clamp, snake_game_turn_background_auto_pause, snake_game_turn_pause_system [EXTRACTED 1.00]
- **D-Pad and Turn Input System** — snake_game_turn_direction_control, snake_game_turn_keyboard_controls, snake_game_turn_swipe_controls, snake_game_turn_dpad_controls, snake_game_turn_turn_controls, snake_game_turn_customizable_touch_controls, snake_game_turn_device_aware_touch_controls [EXTRACTED 1.00]
- **Phase 1 Board Fairness and Run Safety** — snake_game_turn_fixed_logical_board, snake_game_turn_responsive_scaling, snake_game_turn_resize_safety, snake_game_turn_frame_delta_clamp, snake_game_turn_background_auto_pause [INFERRED 0.80]
- **Ranked Control Method Leaderboard Flow** — snake_game_turn_control_method_tracking, snake_game_turn_mixed_control_policy, snake_game_turn_score_submission, snake_game_turn_leaderboard_filters, snake_game_turn_supabase_leaderboard, supabase_leaderboard_control_method_column [EXTRACTED 1.00]
- **Leaderboard Control Method Schema** — supabase_leaderboard_control_method_migration, supabase_leaderboard_control_method_column, supabase_leaderboard_legacy_scores, supabase_leaderboard_control_method_constraint, supabase_leaderboard_ranking_indexes [EXTRACTED 1.00]
- **Sprint 60 Run Lifecycle** — snake_game_turn_frozen_run_mode, snake_game_turn_sprint_countdown, snake_game_turn_sprint_timer, snake_game_turn_time_up_completion, snake_game_turn_run_result [EXTRACTED 1.00]
- **Mode-Aware Ranking Flow** — snake_game_turn_frozen_run_mode, snake_game_turn_control_method_tracking, snake_game_turn_mixed_control_policy, snake_game_turn_mode_aware_submission, snake_game_turn_leaderboard_filters, snake_game_turn_supabase_leaderboard [EXTRACTED 1.00]
- **Idempotent Game Mode Schema Migration** — supabase_leaderboard_game_mode_migration, supabase_leaderboard_game_mode_column, supabase_leaderboard_classic_backfill, supabase_leaderboard_game_mode_constraint, supabase_leaderboard_mode_ranking_indexes, supabase_leaderboard_mode_score_index, supabase_leaderboard_mode_theme_score_index [EXTRACTED 1.00]

## Communities (9 total, 0 thin omitted)

### Community 0 - "Run Timing, Pause and Effects"
Cohesion: 0.18
Nodes (14): Accessible Canvas Pause and Filter State, Animation Frame Ownership, Background Auto-Pause, Canvas Accessible Label, Death Explosion, Debug-Only FPS Counter, Debug-Only FPS Counter, Frame Delta Clamp (+6 more)

### Community 1 - "Gameplay Audio and Progression"
Cohesion: 0.20
Nodes (10): Adaptive Chiptune Audio Engine, Adaptive Chiptune Audio Engine, Audio Sequencer, Collision and Speed Progression, Collision System, Food Placement, Game Tick, Haptic Feedback (+2 more)

### Community 2 - "Fair Board and PWA"
Cohesion: 0.27
Nodes (10): Fixed 20 by 32 Logical Board, Offline Service Worker Cache, Resize Safety, Responsive Canvas Scaling, Responsive Canvas Scaling, Cross-Device Score Comparability, Single-File PWA Setup, Snake Game (+2 more)

### Community 3 - "Classic and Sprint State"
Cohesion: 0.29
Nodes (10): Frozen Run Game Mode, Classic and Sprint Game Mode Selection, Game State, Local Preferences, Mode-Aware Score Sharing, Separate Mode Best Scores, Mode-Aware Run Result, Score Sharing (+2 more)

### Community 4 - "Ranked Controls and Submission"
Cohesion: 0.31
Nodes (9): Run Control Method Tracking, Customizable Touch Controls, Device-Aware Touch Controls, D-PAD and TURN Input System, Leaderboard Pagination, Mixed-Control Unranked Policy, Mode-Aware Score Submission, Ranked Score Submission (+1 more)

### Community 5 - "Direction and Touch Controls"
Cohesion: 0.32
Nodes (8): Clockwise Turn Control, Customizable Touch Controls, Device-Aware Touch Controls, Direction Control, D-Pad Controls, Keyboard Controls, Swipe Controls, Turn Controls

### Community 6 - "Game Mode Leaderboard Schema"
Cohesion: 0.32
Nodes (8): Game Mode Control and Theme Filters, Classic Score Backfill, Game Mode Column, Game Mode Check Constraint, Leaderboard Game Mode Migration, Mode Control and Theme Ranking Indexes, Mode-Wide Score Index, Mode and Theme Score Index

### Community 7 - "Theme and Visual Identity"
Cohesion: 0.29
Nodes (7): Canvas Renderer, Commercial Franchise Theme Catalog, Food Sprite Renderer, Opening Game Identity, Opening Game Identity and Theme Label, Opening Theme Label, Theme System

### Community 8 - "Control Method Database Schema"
Cohesion: 0.40
Nodes (5): Control Method Column, Control Method Check Constraint, Leaderboard Control Method Migration, Legacy Score Classification, Control and Theme Ranking Indexes

## Knowledge Gaps
- **28 isolated node(s):** `Visual Viewport`, `Food Sprite Renderer`, `Food Placement`, `Collision System`, `Score and Speed Progression` (+23 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Game Mode Control and Theme Filters` connect `Game Mode Leaderboard Schema` to `Run Timing, Pause and Effects`, `Control Method Database Schema`, `Classic and Sprint State`, `Ranked Controls and Submission`?**
  _High betweenness centrality (0.262) - this node is a cross-community bridge._
- **Why does `Local Preferences` connect `Classic and Sprint State` to `Direction and Touch Controls`, `Theme and Visual Identity`?**
  _High betweenness centrality (0.243) - this node is a cross-community bridge._
- **Why does `Game Loop` connect `Run Timing, Pause and Effects` to `Gameplay Audio and Progression`, `Classic and Sprint State`, `Theme and Visual Identity`?**
  _High betweenness centrality (0.226) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `Game Mode Control and Theme Filters` (e.g. with `Control and Theme Ranking Indexes` and `Mode Control and Theme Ranking Indexes`) actually correct?**
  _`Game Mode Control and Theme Filters` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Visual Viewport`, `Food Sprite Renderer`, `Food Placement` to the rest of the system?**
  _28 weakly-connected nodes found - possible documentation gaps or missing edges._