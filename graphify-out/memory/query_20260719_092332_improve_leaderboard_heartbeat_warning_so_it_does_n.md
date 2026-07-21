---
type: "implementation"
date: "2026-07-19T09:23:32.346832+00:00"
question: "Improve leaderboard heartbeat warning so it does not cover gameplay, ducks music further, makes lub-dub audible on phones, and strengthens the board border pulse"
contributor: "graphify"
outcome: "useful"
---

# Q: Improve leaderboard heartbeat warning so it does not cover gameplay, ducks music further, makes lub-dub audible on phones, and strengthens the board border pulse

## Answer

Changed the record warning from an absolute overlay below the score bar into a full-width second HUD row. Visibility changes now trigger responsive canvas recalculation, keeping the board below the HUD. Added an actual canvas record-warning animation with a strong red outer ring/glow that accelerates with record proximity, plus a steady gold record-pace state. Reduced musicGain to 0.14 during the warning and raised heartbeat fundamentals to 96/78 Hz at higher gain with short triangle harmonics for phone-speaker audibility. JavaScript parsing, feature assertions, and diff checks passed.

## Outcome

- Signal: useful