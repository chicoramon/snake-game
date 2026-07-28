# Known Bugs

## Safari: switching browser tabs does not reliably pause the game immediately

**Status:** Open — reported 2026-07-27

On Safari, leaving the active browser tab can allow the snake to continue for
several frames, or fail to pause altogether. Chrome pauses correctly.

The game currently listens for `visibilitychange`, `pagehide`, and `blur`, and
clears the simulation clock when it receives one of those events. Safari's
browser-tab lifecycle timing remains inconsistent, so this needs device-level
Safari investigation before another implementation attempt.

**Expected:** The run pauses with no additional movement when the player leaves
the game tab.

**Do not treat the current lifecycle listeners as a completed fix.**
