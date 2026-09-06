# T06 — Schedule and plan

S1–S4 are implemented: weekday/range editing, native time wheel in the custom sheet, all-day collapse, live overnight labeling, sequential facts, editable computed summary, idempotent rule creation and local review warm-up. No native review or permission request occurs.

Checks: full suite 209 tests / 78 suites passed after adding the two plan timing tokens to the reviewed snapshot. TypeScript and ESLint passed. The additional all-day interaction regression and focused summary/router checks pass (210 total tests now). Red logs cover schedule validation, plan persistence and edit-return routing. Timed tests cover normal and Reduce Motion completion.

Headless native `plan-flow.mp4` covers no-days error, wheel change to an invalid equal-time window, all-day recovery, S2 build, S3 edits for goal/place/schedule, save, and rating. `summary-final.mp4` records the final compact summary layout and goal edit return after the full journey. Current S3 screenshots supersede the larger cards in the earlier full recording. S1/S3 maximum accessibility text captures include scrolled views. Native switches require a deliberate 200 ms tap in this idb recipe; short taps missed the control during the first capture. No app-state bug was found.

Screenshots, AX trees and logs stay local in this ignored evidence folder. Gemini review remains deferred.
