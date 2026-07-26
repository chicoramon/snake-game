---
type: "query"
date: "2026-07-26T20:56:48.657247+00:00"
question: "Fix Snake Game player restore showing a new-player initials prompt until refresh."
contributor: "graphify"
outcome: "useful"
source_nodes: ["Snake Game"]
---

# Q: Fix Snake Game player restore showing a new-player initials prompt until refresh.

## Answer

Fixed the post-email-restore identity race in the modular Snake Game source. After OTP verification, the player identity promise now tracks the restored session and retries the profile load once after mobile browsers persist the new session, preventing an existing player from seeing the initials-creation prompt until refresh. Contract, build, and Edge smoke tests pass.

## Outcome

- Signal: useful

## Source Nodes

- Snake Game