# Motion

Owns motion tokens, reduced-motion configuration, entry/exit presets, haptic feedback, staged content and gently animated feature art. UI components use these primitives; this folder knows no product state or services.

Every animation outside this folder goes through its helpers; `guardrails/design-system.test.ts` fails on a raw Reanimated or CSS animation call anywhere else. The vocabulary is four durations (`press`, `standard`, `emphasized`, `breathe`), two easings (`standard` is the Material 3 standard curve and the default; `enter` decelerates) and two springs (`control`, `pop`). From `useMotion()`:

- `timing`, `spring`, `delay`, `sequence` for shared values. Under Reduce Motion they land on the final value at once.
- `transition` and `keyframes` for Reanimated CSS style props. Under Reduce Motion a transition keeps only colour and opacity, and a keyframe animation holds still or plays its opacity-only `still` frames.
- `presets.ts` for entering and exiting builders: opacity fades, `slideUp`, `popIn`, `pageIn`/`pageOut`, `sheetOut` and the gated `layoutTransition(reduced)`.

Two scripted storyboard timelines keep their own clocks as a deliberate exception, because they are choreography rather than UI motion: the plan-build sequence (`features/rules/PlanBuild.tsx`, `PlanCelebration.tsx`, timed by `planMotion.ts`) and the onboarding impact sequence (O11–O14: `features/onboarding/impact/`, `screens/O11.tsx`, `scenes/DotGridReveal.tsx`, timed by `impact/timing.ts`). They still gate on Reduce Motion themselves. The unlock ceremony is not an exception.

Shared values use `get`/`set` for React Compiler compatibility. Gesture worklets bridge to React through `scheduleOnRN`. Native haptics are disabled in tests and the simulator. Reanimated's upstream mock requires the Worklets mock in SDK 57; both are installed in jest.setup.ts.

`useSheetKeyboard` moves absolute sheets above the software keyboard and constrains their scroll area. Native frame events update a single target inset; Reanimated animates layout, and cleanup restores the keyboard/listeners.
