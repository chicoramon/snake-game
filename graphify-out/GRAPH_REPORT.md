# Graph Report - .  (2026-07-17)

## Corpus Check
- Corpus is ~12,558 words - fits in a single context window. You may not need a graph.

## Summary
- 120 nodes · 169 edges · 8 communities
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Game Modes & Ranked Controls
- Theme-Aware Canvas & PWA Board
- Gameplay Runtime & Accessibility
- Direction Input Systems
- Leaderboard Data & Pagination
- Audio Lifecycle & Theme Music
- Pixel Arcade Interface
- Unified Controls Settings

## God Nodes (most connected - your core abstractions)
1. `Game Loop` - 10 edges
2. `Game Tick` - 9 edges
3. `Pause System` - 8 edges
4. `Global Pixel-Arcade Visual System` - 8 edges
5. `Game State` - 7 edges
6. `Theme-Aware Web Audio Engine` - 7 edges
7. `Game Mode Control and Theme Filters` - 7 edges
8. `Frozen Run Game Mode` - 7 edges
9. `Supabase Leaderboard` - 6 edges
10. `Leaderboard Game Mode Migration` - 6 edges

## Surprising Connections (you probably didn't know these)
- `Game Mode Control and Theme Filters` --shares_data_with--> `Mode Control and Theme Ranking Indexes`  [INFERRED]
  snake-game-turn.html → supabase-leaderboard-game-mode.sql
- `Game Mode Control and Theme Filters` --shares_data_with--> `Mode-Wide Score Index`  [INFERRED]
  snake-game-turn.html → supabase-leaderboard-game-mode.sql
- `Game Mode Control and Theme Filters` --shares_data_with--> `Mode and Theme Score Index`  [INFERRED]
  snake-game-turn.html → supabase-leaderboard-game-mode.sql
- `Game Mode Control and Theme Filters` --shares_data_with--> `Control and Theme Ranking Indexes`  [INFERRED]
  snake-game-turn.html → supabase-leaderboard-control-method.sql
- `Supabase Leaderboard` --shares_data_with--> `Control Method Column`  [EXTRACTED]
  snake-game-turn.html → supabase-leaderboard-control-method.sql

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Fixed Board Rendering and Resize Safety** — snake_game_turn_fixed_logical_board, snake_game_turn_responsive_canvas_scaling, snake_game_turn_visual_viewport, snake_game_turn_resize_safety [INFERRED 0.90]
- **Run Continuity Protection** — snake_game_turn_game_loop, snake_game_turn_frame_delta_clamp, snake_game_turn_background_auto_pause, snake_game_turn_pause_system [EXTRACTED 1.00]
- **D-Pad and Turn Input System** — snake_game_turn_direction_control, snake_game_turn_keyboard_controls, snake_game_turn_swipe_controls, snake_game_turn_dpad_controls, snake_game_turn_turn_controls, snake_game_turn_customizable_touch_controls, snake_game_turn_device_aware_touch_controls [EXTRACTED 1.00]
- **Phase 1 Board Fairness and Run Safety** — snake_game_turn_fixed_logical_board, snake_game_turn_responsive_scaling, snake_game_turn_resize_safety, snake_game_turn_frame_delta_clamp, snake_game_turn_background_auto_pause [INFERRED 0.80]
- **Ranked Control Method Leaderboard Flow** — snake_game_turn_control_method_tracking, snake_game_turn_mixed_control_policy, snake_game_turn_score_submission, snake_game_turn_leaderboard_filters, snake_game_turn_supabase_leaderboard, supabase_leaderboard_control_method_column [EXTRACTED 1.00]
- **Leaderboard Control Method Schema** — supabase_leaderboard_control_method_migration, supabase_leaderboard_control_method_column, supabase_leaderboard_legacy_scores, supabase_leaderboard_control_method_constraint, supabase_leaderboard_ranking_indexes [EXTRACTED 1.00]
- **Sprint 60 Run Lifecycle** — snake_game_turn_frozen_run_mode, snake_game_turn_sprint_countdown, snake_game_turn_sprint_timer, snake_game_turn_time_up_completion, snake_game_turn_run_result [EXTRACTED 1.00]
- **Mode-Aware Ranking Flow** — snake_game_turn_frozen_run_mode, snake_game_turn_control_method_tracking, snake_game_turn_mixed_control_policy, snake_game_turn_mode_aware_submission, snake_game_turn_leaderboard_filters, snake_game_turn_supabase_leaderboard [EXTRACTED 1.00]
- **Idempotent Game Mode Schema Migration** — supabase_leaderboard_game_mode_migration, supabase_leaderboard_game_mode_column, supabase_leaderboard_classic_backfill, supabase_leaderboard_game_mode_constraint, supabase_leaderboard_mode_ranking_indexes, supabase_leaderboard_mode_score_index, supabase_leaderboard_mode_theme_score_index [EXTRACTED 1.00]
- **Mobile Audio Recovery Paths** — snake_game_turn_audio_statechange_recovery, snake_game_turn_background_audio_wake_paths, snake_game_turn_gesture_audio_wake_paths, snake_game_turn_pause_aware_audio_restart [EXTRACTED 1.00]
- **Extended Theme Audio Catalog** — snake_game_turn_theme_catalog, snake_game_turn_tetris_theme, snake_game_turn_halo_theme, snake_game_turn_audio_engine [EXTRACTED 1.00]
- **Pixel Arcade Game Shell** — snake_game_turn_pixel_arcade_visual_system, snake_game_turn_arcade_hud, snake_game_turn_board_frame, snake_game_turn_overlay_panel_hierarchy [EXTRACTED 1.00]
- **Responsive Arcade Interaction Layer** — snake_game_turn_action_hierarchy, snake_game_turn_mobile_control_feedback, snake_game_turn_responsive_short_screen_layout, snake_game_turn_reduced_motion, snake_game_turn_focus_visibility [INFERRED 0.95]
- **Contra Theme Integration** — snake_game_turn_contra_theme, snake_game_turn_contra_four_layer_audio_score, snake_game_turn_contra_tempo_progression, snake_game_turn_contra_sound_effects, snake_game_turn_contra_power_up_capsule_sprite, snake_game_turn_contra_theme_picker_entry, snake_game_turn_theme_catalog, snake_game_turn_audio_engine, snake_game_turn_food_sprite_renderer, snake_game_turn_theme_options_grid [EXTRACTED 1.00]

## Communities (8 total, 0 thin omitted)

### Community 1 - "Game Modes & Ranked Controls"
Cohesion: 0.14
Nodes (21): Snake Game, Game State, Local Preferences, Ranked Score Submission, Score Sharing, Single-File PWA Setup, Web App Manifest, Offline Service Worker Cache (+13 more)

### Community 5 - "Theme-Aware Canvas & PWA Board"
Cohesion: 0.18
Nodes (13): Fixed 20 by 32 Logical Board, Responsive Canvas Scaling, Resize Safety, Visual Viewport, Canvas Renderer, Food Sprite Renderer, Theme System, Commercial Franchise Theme Catalog (+5 more)

### Community 0 - "Gameplay Runtime & Accessibility"
Cohesion: 0.11
Nodes (23): Game Loop, Frame Delta Clamp, Game Tick, Particle System, Death Explosion, Food Placement, Collision System, Score and Speed Progression (+15 more)

### Community 7 - "Direction Input Systems"
Cohesion: 0.32
Nodes (8): Direction Control, Clockwise Turn Control, Keyboard Controls, Swipe Controls, D-Pad Controls, Turn Controls, Customizable Touch Controls, Device-Aware Touch Controls

### Community 3 - "Leaderboard Data & Pagination"
Cohesion: 0.17
Nodes (15): Supabase Leaderboard, Game Mode Control and Theme Filters, Leaderboard Pagination, Leaderboard Control Method Migration, Control Method Column, Legacy Score Classification, Control Method Check Constraint, Control and Theme Ranking Indexes (+7 more)

### Community 2 - "Audio Lifecycle & Theme Music"
Cohesion: 0.15
Nodes (17): Theme-Aware Web Audio Engine, AudioContext Lifecycle, Closed Audio Graph Rebuild, Synchronous Audio Wake, Statechange-Driven Audio Recovery, RequestAnimationFrame Music Sequencer, Visibility and Page-Show Wake Paths, Pointer Touch and Keyboard Wake Paths (+9 more)

### Community 4 - "Pixel Arcade Interface"
Cohesion: 0.22
Nodes (13): Global Pixel-Arcade Visual System, Arcade HUD, Game Mode Badge, Game Mode HUD Binding, Pixel Arcade Board Frame, Overlay Panel Hierarchy, Primary and Secondary Action Hierarchy, Theme and Options Grid (+5 more)

### Community 6 - "Unified Controls Settings"
Cohesion: 0.36
Nodes (10): Single Controls Menu Entry, Unified Controls Settings Panel (openControlsSettings / closeControlsSettings), D-PAD/TURN Selection (applyControlMode), Nested Layout Customization Flow (startControlsEdit / stopControlsEdit), Control Preference Persistence, Inactivity Control Fade (scheduleTouchControlsFade), Input Wake Feedback (wakeTouchControls), Accessible Controls Dialog (+2 more)

## Knowledge Gaps
- **38 isolated node(s):** `Visual Viewport`, `Food Placement`, `Collision System`, `Score and Speed Progression`, `Commercial Franchise Theme Catalog` (+33 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Pause System` connect `Gameplay Runtime & Accessibility` to `Game Modes & Ranked Controls`, `Audio Lifecycle & Theme Music`, `Theme-Aware Canvas & PWA Board`?**
  _High betweenness centrality (0.350) - this node is a cross-community bridge._
- **Why does `Theme-Aware Web Audio Engine` connect `Audio Lifecycle & Theme Music` to `Gameplay Runtime & Accessibility`?**
  _High betweenness centrality (0.344) - this node is a cross-community bridge._
- **Why does `Theme Catalog` connect `Audio Lifecycle & Theme Music` to `Pixel Arcade Interface`?**
  _High betweenness centrality (0.219) - this node is a cross-community bridge._
- **What connects `Visual Viewport`, `Food Placement`, `Collision System` to the rest of the system?**
  _38 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Game Modes & Ranked Controls` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Should `Gameplay Runtime & Accessibility` be split into smaller, more focused modules?**
  _Cohesion score 0.1067193675889328 - nodes in this community are weakly interconnected._