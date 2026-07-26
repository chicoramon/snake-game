---
type: "query"
date: "2026-07-24T20:54:34.583267+00:00"
question: "Why are Street Fighter food eating sounds muted compared with its soundtrack?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["Theme-Aware Web Audio Engine", "Game Tick"]
---

# Q: Why are Street Fighter food eating sounds muted compared with its soundtrack?

## Answer

The Street Fighter eating sound is masked because the Ken MP3 bypasses the Web Audio mixer. The native HTMLAudio element plays directly at audioGain 0.82, while eating oscillators run through sfxGain and then master gain 0.35. Street Fighter's primary eat layer is only 0.13 and its secondary layer 0.065, making their approximate post-master peaks 0.0455 and 0.02275 versus the soundtrack at 0.82. The mastered broadband MP3 further masks the brief tones, and no temporary soundtrack duck occurs when food is eaten. The robust fix is to route the MediaElement audio through the same Web Audio music/master bus, balance music and SFX centrally, and briefly duck music on eat; simply increasing the SFX volume is a less reliable patch.

## Outcome

- Signal: useful

## Source Nodes

- Theme-Aware Web Audio Engine
- Game Tick