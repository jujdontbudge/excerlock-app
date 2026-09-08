# Walking engine

## What is here

`walkingMotionRuntime.ts` and `walkingPlacementRuntime.ts`: the provider
selection that puts the real `NativeMotionProvider` and
`NativePhonePlacementProvider` in front of a native iOS build and the fixture
providers everywhere else. `WalkingAdapter` (P2-T05 §2) composes these with
`engine/signals/motion/WalkVerifier` and
`engine/signals/placement/PhonePlacementClassifier`.

## What deliberately did not move, and why

`app/src/home/signals/walkingSessionController.ts` (625 lines) stayed in the old
app. It is not dead knowledge, but it cannot be ported as code: every one of its
seams is replaced.

| It used | app-next uses instead |
| --- | --- |
| `ConfiguredCondition`, `isInsideActiveWindow` from `@excerlock/condition-model` | `domain/types.Rule`, `domain/schedule.windowInstances` |
| `useHomeStore` | `state/ruleDaysStore`, `state/rulesStore` |
| `@excerlock/ledger` walk window | `domain/sessions/lease.ts` (copied here with attribution) |
| its own phase machine | `stepWalkingSession` (P2-T15 §2), which the adapter feeds `verified` / `unverified` events rather than phases |
| `WalkLeaseWarningNotifier` from `@/notifications` | the `leaseWarning` session effect (P2-T09 delivers it) |

Two measured numbers in it are worth carrying across rather than re-deriving,
and P2-T05 owns where they land with the placement handoff machine (finding 88):

- `PICKUP_CADENCE_GRACE_MS = 20_000` — how long a cadence reading stays usable
  after the phone is picked up off the treadmill.
- `PROPPED_HANDOFF_MS = 60_000` — the propped → handheld handoff window.

Read the old file for those two behaviours before writing the handoff machine.
Everything else in it is superseded.
