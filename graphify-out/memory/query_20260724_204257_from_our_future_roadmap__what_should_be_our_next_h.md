---
type: "query"
date: "2026-07-24T20:42:57.713897+00:00"
question: "From our future roadmap, what should be our next highest priority?"
contributor: "graphify"
outcome: "useful"
---

# Q: From our future roadmap, what should be our next highest priority?

## Answer

The highest immediate priority is to finish and production-harden Daily Run. Its backend is deployed, but end-to-end ranked verification, archive SQL, and website deployment are still pending. Close that loop before opening another feature front. Immediately afterward, prioritize the first slice of Modular Source and Reproducible Build: browser smoke tests, then a behavior-neutral Vite shell and CSS/JavaScript extraction. The single HTML file is now the largest regression and development-speed risk. After that foundation, Asynchronous Duel is the best next user-facing feature because it can reuse Daily Run's deterministic challenge and replay-verification work. Junior Mode and live Vs should come later.

## Outcome

- Signal: useful