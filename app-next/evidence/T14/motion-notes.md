# Accessibility motion changes

Reference: reviewed OtterLife stable-control and receding-sheet strips (OT01-M006 and OT01-M029) and the actual native T13 recordings.

- Live countdowns previously had simultaneous outgoing/incoming translated text. `ValueReveal` now keeps the accessible node mounted and fades each value at the same baseline for 180 ms.
- Bottom sheets use a transparent native modal with a local safe-area and gesture root. The scrim covers the full app and VoiceOver focus no longer reaches underlying tabs. The sheet retains its spring entrance/drag interaction; Reduce Motion uses the fade.
- Number fields expose adjustable values/units and increment/decrement actions. Walking uses 500-step changes; workout inputs use their own validated bounds.
- Support scrolls its input into view after the keyboard opens; its Send action remains pinned above the keyboard.

Gemini grading is deferred. These are implementation notes and native self-review, not a Gemini approval.
- The XL walking-state path exposed retained scroll offsets between onboarding steps: the shared container kept its offset as route parameters changed. `ScreenShell.scrollResetKey` now resets onboarding/setup/builder step scroll before paint while preserving the animated body and tab scroll retention. The red screenshot/tree are `step-scroll-red.*`.

Reduce Motion audit found that Reanimated's default `ReduceMotion.System` skips opacity builders as well as spatial movement. The fallback presets now explicitly use `ReduceMotion.Never` for opacity only; movement/scale/loops still honor the preference. `fades-red.log` reproduces the missing policy, and `fades-green.log` verifies the fix. Expo MCP fetched both the Expo Reanimated page and Software Mansion's accessibility guide; the installed 4.5.1 builder/timing source confirmed the defaults. No global override was added.
