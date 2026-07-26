---
type: "query"
date: "2026-07-24T14:17:23.255885+00:00"
question: "How can the Snake game invite users to enter an optional Display Name when they open the game without being too intrusive?"
contributor: "graphify"
source_nodes: ["Opening Game Identity", "Local Preferences", "Snake Game", "Supabase Leaderboard"]
---

# Q: How can the Snake game invite users to enter an optional Display Name when they open the game without being too intrusive?

## Answer

Use a non-modal, dismissible main-menu invitation only after Supabase identity has loaded and a player has initials but no display_name. Show a compact 8-bit callout such as 'Give RAM·C51B a public name?' with Add Name and Later actions; Add Name opens the existing Player panel and focuses the display-name field, while Later snoozes the invitation locally for seven days. Never block Play, open the mobile keyboard automatically, prompt guests without initials, or stack it with the automatic What's New dialog; keep a subtle ADD NAME badge on the Player button as the permanent manual affordance. Stop prompting immediately after a successful save, and after two dismissals stop automatic invitations while retaining the badge.

## Source Nodes

- Opening Game Identity
- Local Preferences
- Snake Game
- Supabase Leaderboard