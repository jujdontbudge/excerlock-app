# FLOW onboarding

**Contract.** `onboarding` owns the resumable first-run rail. `flow.ts` derives its order from
`@excerlock/analytics-events`' locked `FLOW_SCREENS`; the central renderer is the only place that
chooses a screen. Individual screens render one question or promise and never navigate, request a
native permission, open a purchase flow, create an account, or emit onboarding analytics.

**Persistence.** `onboardingStore` records the current rail step and terminal completion flag.
`confessionStore` separately records the user's self-reported daily phone minutes for the later
Analysis Time Reclaimed calculation. Both stores validate rehydrated values before exposing them.

**Phase-2 seams.** Permissions, locked-app selection, paywall, and sign-up are honest visual
scaffolds. Their screen props are the seams where FamilyControls, Adapty, and Clerk will connect in
Phases 3 and 5.

**Invariants.**

- The app never redeclares the `FlowScreen` union or the screen order.
- Advancing from the final `sign-up` step marks onboarding complete; back never leaves the first step.
- Incomplete persisted progress resumes, while completed users enter the tab shell on cold start.
- No screen calls `capture()` or owns navigation.

**Public surface.** Consumers import the rail, stores, screens, central renderer, and completion gate
from `index.ts`; routes stay thin and import only that surface.

**Test command:** `npm run test --workspace app -- onboarding`.
