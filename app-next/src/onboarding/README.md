# onboarding

Pure flow graph, branch routing, validation and resume, plus the remote flow rail.

`flow.ts` owns the bundled `preBranch`/`tail` arrays and the order-aware
`pathFor`/`nextStep`/`prevStep`/`progressFraction`/`resumeStep` helpers. A
`FlowOrder` (B8) replaces those two groups; the answer-driven W/G branch between
them is never remote. Navigation falls back to the bundled order while the rail
does not contain the step the user is standing on, so a dropped step can never
rewind or loop the flow.

`flowOrder.ts` validates an `onboarding_variant` PostHog payload against the
store's step-id vocabulary (`stepId.ts`, the same predicate the persisted
`onboardingStore` validates with) and the known-step set — a group may reorder or
drop its own steps, must be non-empty and unique, and the tail must still end at
`P`. Malformed, absent or late payloads keep the bundled order; `useOnboarding`
paints the first frame from the bundled order and adopts a valid rail only once
the port settles, so onboarding never waits on a flag.
