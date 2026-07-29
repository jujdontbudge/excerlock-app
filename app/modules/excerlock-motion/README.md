# excerlock-motion

Contract: hides the future Swift CMMotionActivity and CMPedometer bridge behind a local Expo Module
surface. Invariants: target configuration explicitly retains iOS 17.4 and no app screen imports native
implementation details.

Fixtures: none in Phase 0; scripted motion timelines live in SignalKit when implementation begins. Test
with `npm run test --workspace app -- excerlock-motion` from the repository root.
