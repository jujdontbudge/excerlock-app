# T05b — Gym, running and biking branches

Implemented G1/G2, R1/R2, B1/B2 and the shared distance screen D. The mode screen chooses time or the activity’s alternative; gym arrival skips duration. Presets fill the field; empty/out-of-range input stays editable with Continue disabled. Running and biking retain separate numbers and unit choices. Changing mi/km does not convert the number.

## Verification

TDD covers all six non-walking paths, valid output rules, activity defaults, presets, blank-field handling and unit-specific ranges. A native/code review found that backing out of an invalid summary edit could attempt to render an invalid rule; its failing rendered test now passes with the prior answer snapshot restored.

Final checks and native evidence are in this folder. Each activity/mode has a branch recording through S1 and the summary, with PNG/AX captures of the modes, goals, presets and distance unit dropdown. D has an XL capture and a scrolled XL capture. The earlier walking paths remain covered by T05 and the M1 journey.

## Motion

Reviewed Otter OT01-M008 and the current gym/run/bike/distance concepts. Took the stable hero and footer, animated control selection, and changing central question/form. The shared RuleScreen now preserves the activity glyph between the mode and goal; its position animates when heading height changes. The controls stagger/fade, preset fills transition, units expand in place, and the keyboard-aware footer stays reachable. Reduced Motion uses fades and final geometry.

Reference concepts’ time/distance alternatives are separate questions; no duplicate duration question follows distance. Current tokens and flat multicolor icons supersede the concepts’ older art.

Gemini/human review remains deferred under the instruction to continue with existing material.

Native verification completed all six paths. Blank distance remains on the form with the software keyboard visible and Continue disabled; the previous retained summary no longer validates the active draft. Added a Stack-based failing-first regression and gated inactive onboarding route rendering with Expo Router’s documented `useIsFocused`. Reviewed normal/XL distance, gym presets, summaries, and the distance recording strip.

Checks: 277 tests across 98 suites (276 passed in the full run; the remaining intro test’s Router mock was updated for `useIsFocused` and passed on rerun), 14 snapshots, TypeScript, lint and iOS production export. Expo Doctor/dependency checks passed earlier in this task with unchanged dependencies.
