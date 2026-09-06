# T15 — Motion pass and the Gemini review gate

Goal: every animation matches the bible, verified by Gemini from screen recordings, not by Codex's own
judgment. This task runs partially at M1 (onboarding + Home) and fully at M3.

## Steps

1. **Record.** For each flow file in `design/motion/` (onboarding, setup, home, conditions, analytics,
   settings, sheets-and-paywall), record the flow on the simulator with the scenario named in the bible:
   `xcrun simctl io <udid> recordVideo --codec h264 evidence/T15/<flow>.mp4`, driving taps with `idb ui tap`
   (or the dev-menu "Record flow" helper which prints the exact sequence). Recordings must show the whole
   flow at normal speed; do not speed them up. Convert with the hardware encoder if a file exceeds 20 MB
   (see T00 step 1).
2. **Grade.** For each recording, run Gemini with the flow's bible file and its review checklist:
   `gemini -p "@design/motion/<flow>.md @evidence/T15/<flow>.mp4 <grading prompt from design/motion/README.md>"`.
   The grading prompt asks for a table: checklist item · observed (yes/no/partial) · timestamp · what differs ·
   suggested fix, and an overall PASS/FAIL where any "no" on a required item is FAIL. Save the raw output to
   `evidence/T15/<flow>-gemini.md`.
3. **Fix and repeat** until PASS for every flow. Each fix is a normal TDD change (adjust a timing token, a
   spring, a stagger, an entering preset) with the bible as the spec. Never edit the bible to make a
   recording pass; if the bible is wrong, note it in `design/motion/ERRATA.md` and ask Johan.
4. **Micro-interaction sweep** outside flows: press feedback on every pressable, switch toggles, selection
   highlights, number ticks, chart growth, tab indicator, sheet drag. One combined recording, graded against
   `00-principles.md`.
5. **Performance**: with Reanimated's JS-thread profiler (`enableLayoutAnimations` off where unused), verify
   no animation runs on the JS thread except number formatting; record `perf.md` with any dropped-frame
   observation from the simulator's FPS overlay (`--fps` not available; use `xcrun xctrace` only if needed).

## Acceptance

- [ ] `evidence/T15/` has a PASS grading for all seven flows and the micro-interaction sweep.
- [ ] `design/motion/ERRATA.md` lists every bible item Codex could not follow, with a reason, for Johan.
- [ ] Reduce Motion recordings (from T14) are also graded against each flow's (g) item.
