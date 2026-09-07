# P2-T13 — Test floor, persistence recovery and release hygiene

First task of the MVP hardening milestone (see `fix-plan.md`). Everything after it relies on tests that
actually run and on persisted stores that survive schema changes. Findings: 4, 10, 21 (and the CI half of 41).
Per-finding detail: `docs/audit/fix-map.md` § P2-T13.

## Why first

The audit's time lens discovered that no `app-next` test has ever run in CI: root `package.json` `test:app`
targets the old `app` workspace and `.github/workflows/ci.yml` runs `npm run test:unit`. The declared 100 %
domain branch floor in `app-next/jest.config.js` has only ever been enforced in a developer's terminal. The
fix plan names roughly ninety test files; none of them protects anything until this lands.

## Steps

1. **CI runs app-next.** Add an `app-next` target to the root `test:unit` script; `app-next` `test` runs
   `jest --runInBand --coverage` with the domain threshold from `jest.config.js`. Prove it: a deliberately
   broken domain test must fail the workflow before the fix is reverted (record the run id in the PR).
2. **Persisted-store contract** (`src/state/validation.ts`, `src/state/createPersistedStore.ts`):
   - per-store `schemaVersion` with a forward-only migration table (`migrations: Record<number, (raw) => raw>`),
     applied at hydration before validation;
   - per-row validation for array fields: a malformed row is quarantined (kept in a `rejected` slot for the
     dev menu), the rest hydrate; never wipe an array because one element failed;
   - an `optional()` validator helper so a new field can be added without invalidating old rows;
   - a typed write-failure path: a rejected AsyncStorage write surfaces `PersistError` to a single
     recoverable notice on Home instead of failing silently.
   Every later schema change (earned unlocks in P2-T14, gym visits and history in P2-T15, `migrateRule` in
   P2-T14/T16) is a migration entry here, never an ad-hoc parse.
3. **Release hygiene** (`src/runtime/devFlag.ts`, NEW): `devMenuEnabled = __DEV__ || process.env.EXPO_PUBLIC_DEV_MENU === '1'`.
   Wrap `<Stack.Screen name="dev" />` in `RootNavigator.tsx` in `<Stack.Protected guard={devMenuEnabled}>`;
   return early from `useDemoProgress` when the flag is off so `excerlock://home?steps=…&advance=…&presence=…`
   cannot mutate the runtime; gate the 7-tap footer counter; delete the two "Test gym unlock" /
   "Test treadmill unlock" buttons from `HomeScreen.tsx` (coordinate the JSX block with P2-T19's #74).
   A guardrail test renders the navigator with the flag off and asserts the dev route and the deep-link params
   are inert.

## Tests first

- "a store written by the previous schema hydrates through its migration"
- "one malformed rule-day row does not drop the other rows"
- "a rejected AsyncStorage write surfaces an error instead of failing silently"
- "an added optional field does not invalidate persisted rows"
- "with the dev flag off, `excerlock://dev` resolves to nothing and `home?steps=` changes nothing"
- "Home renders no test-unlock buttons"

## Acceptance

- [ ] CI workflow runs `app-next` tests with coverage; the deliberate-failure run is linked in the PR.
- [ ] Persisted-store contract documented in `src/state/README.md`; every store declares `schemaVersion`.
- [ ] Release build (flag off) has no dev route, no deep-link mutation, no test buttons.
