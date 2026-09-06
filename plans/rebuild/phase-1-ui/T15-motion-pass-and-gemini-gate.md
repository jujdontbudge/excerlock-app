# T15 — Motion pass and the Gemini review gate

Goal: every flow in ExcerLock moves as well as the reference apps, judged by Gemini from screen recordings
rather than by Codex's own eye. Runs partially at M1 (onboarding + Home) and fully at M3.

## Steps

1. **Record.** For each flow (onboarding, setup, home, conditions, analytics, settings, sheets-and-paywall),
   record it on the simulator with the matching scenario:
   `xcrun simctl io <udid> recordVideo --codec h264 evidence/T15/<flow>.mp4`, driving taps with `idb ui tap`
   (or the dev-menu "Record flow" helper). Normal speed, whole flow. Re-encode with the hardware encoder if
   a file is large (T00 step 1).
2. **Grade.** For each recording, one `agy` call with the reference study and Codex's own motion notes for
   that flow as context:
   `agy -p "Read /abs/design/motion/reference/motion-otterlife.md and /abs/app-next/evidence/<task>/motion-notes.md. Then watch every frame of /abs/app-next/evidence/T15/<flow>.mp4. Grade this ExcerLock flow against the reference: for each transition and micro-interaction, does it match the reference character in timing, easing, smoothness and restraint? List every place it feels slower, faster, stiffer, bouncier, later or cheaper than the reference, with timestamps and a concrete fix (ms, curve, stagger). Flag any dropped frames, jumps, or elements that pop in without animation. End with PASS if nothing needs fixing, else FAIL." --model gemini-3.7-flash-high --dangerously-skip-permissions --add-dir /abs/design/motion --add-dir /abs/app-next/evidence > evidence/T15/<flow>-gemini.md`.
3. **Fix and repeat** until PASS for every flow. Fixes are normal TDD changes (a timing token, a spring, a
   stagger, an entering preset). If Codex disagrees with a Gemini finding, it writes why in
   `evidence/T15/disagreements.md` for Johan instead of silently ignoring it.
4. **Micro-interaction sweep** outside flows: press feedback on every pressable, switches, selection
   highlights, number ticks, chart growth, tab indicator, sheet drag. One combined recording, graded the same
   way.
5. **Performance**: verify no animation runs on the JS thread except number formatting; note any dropped
   frames observed in `evidence/T15/perf.md`.

## Acceptance

- [ ] `evidence/T15/` has a PASS grading for all seven flows and the micro-interaction sweep.
- [ ] `evidence/T15/disagreements.md` exists (empty or with reasons).
- [ ] Reduce Motion recordings (from T14) are also graded: fallbacks must read as deliberate, not broken.
