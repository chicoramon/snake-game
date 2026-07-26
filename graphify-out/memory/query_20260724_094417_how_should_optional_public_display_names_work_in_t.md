---
type: "query"
date: "2026-07-24T09:44:17.235631+00:00"
question: "How should optional public display names work in the Player menu and leaderboards?"
contributor: "graphify"
source_nodes: ["Opening Game Identity", "Supabase Leaderboard", "Game Mode Control and Theme Filters"]
---

# Q: How should optional public display names work in the Player menu and leaderboards?

## Answer

Recommend an optional, non-unique 2-20 character display_name stored on private player_profiles and editable by the authenticated player through a security-definer setter RPC. Keep initials plus four-character player code as the compact leaderboard identity and authoritative discriminator. Make that identity a keyboard-accessible button; on click, fetch a deliberately limited public player card through an RPC and show an 8-bit modal containing display name and initials/code, never email or private account data. Apply it to standard, Daily, and archived Daily leaderboards. Missing display names fall back gracefully. This helps distinguish repeated initials but does not merge separate Supabase identities.

## Source Nodes

- Opening Game Identity
- Supabase Leaderboard
- Game Mode Control and Theme Filters