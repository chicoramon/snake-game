---
type: "implementation"
date: "2026-07-19T12:49:00.049789+00:00"
question: "Make the full leaderboard record experience chase the undisputed number one score regardless of control method"
contributor: "graphify"
outcome: "corrected"
correction: "The record experience previously treated each control method as a separate #1; NEW #1 must mean the mode-wide undisputed record."
---

# Q: Make the full leaderboard record experience chase the undisputed number one score regardless of control method

## Answer

Changed the client record lookup to filter only by game_mode, so every ranked control chases the same Classic or Sprint maximum across all controls and themes. beginRecordChase now performs one mode-wide query and shares that target across eligible methods; the game-over refresh uses the same lookup. Updated submit_best_score to serialize by game mode, compute previous_top_score and is_new_top across all controls, and return a mode-wide leaderboard_rank. Control-specific filters and per-control personal-best storage remain unchanged. Syntax and scope assertions passed.

## Outcome

- Signal: corrected
- Correction: The record experience previously treated each control method as a separate #1; NEW #1 must mean the mode-wide undisputed record.