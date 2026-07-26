---
type: "query"
date: "2026-07-24T20:56:09.073263+00:00"
question: "Will the heartbeat warning remain valid after correcting Street Fighter native audio mixing?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["Theme-Aware Web Audio Engine", "Game Tick"]
---

# Q: Will the heartbeat warning remain valid after correcting Street Fighter native audio mixing?

## Answer

Yes. The heartbeat warning remains valid if native soundtrack audio is routed into musicGain while heartbeat oscillators remain connected to sfxGain. setRecordHeartbeat ducks only music to 0.14 and the heartbeat remains on the unaffected SFX bus. The HUD warning and border pulse are unrelated to audio routing. One implementation detail must be improved: an eat-triggered transient duck must be composed with the heartbeat duck rather than restoring music to 1 afterward. Use independent heartbeatDuck and transientDuck state (or separate gain nodes), with the effective music gain using the strongest active duck, so eating while chasing the record cannot cancel the heartbeat warning.

## Outcome

- Signal: useful

## Source Nodes

- Theme-Aware Web Audio Engine
- Game Tick