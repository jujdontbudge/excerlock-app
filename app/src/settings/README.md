# Settings

Contract: owns settings-domain state and screens. Expo Router files stay thin and only mount this
module's exported screen.

## Current Phase-2 surface

- `store/settingsStore.ts` is the typed Zustand + AsyncStorage boundary. It persists only settings
  values under `excerlock.settings.v1`; actions never enter storage, and hydrated values are validated
  before they reach runtime state.
- Walk & Scroll stop grace is deliberately `null` until the user chooses it, matching the PRD's empty
  user-set picker. The only accepted values are 30 seconds and 1–5 minutes.
- Cadence (around 60–70 steps/min) and the renewable unlock increment (15 minutes) are displayed as
  read-only app-fixed facts with the reason each is fixed.
- Account mounts `@/account`'s real vendor-free surface: hydration,
  signed-out/signed-in state, sign-in/sign-up, sign-out, and confirmed account
  deletion. Account actions never clear or gate local earning and locking data.
  Contact support and feature request remain static rows until their Phase-5
  integrations exist.
- The debug-menu entry sits inside a literal `__DEV__` branch so App Store bundles can eliminate it.

`components/` owns settings-only presentation. Shared visual decisions still come from `src/ui`;
Settings consumes `Screen`, `Card`, `PillButton`, `SectionHeader`, and theme tokens without forking
them.

## Tests

From the repository root:

- `npm run test:app`
- `npm run test:guardrails`

The render suite exercises the public screen behavior. The store suite exercises defaults, persistence,
hydration, and invalid-storage fallback with AsyncStorage mocked only at the native boundary.
