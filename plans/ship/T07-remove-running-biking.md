# T07 — Remove running and biking (B38, B39)

Facts: `research/conditions-audit.md` §1 blast-radius tables — 61 real files (43 source, 18 tests, 1
snapshot); two are icon reuse only (`HabitLoop.tsx`, `TrendHero.tsx`).

## Steps

1. `src/domain/types.ts`: `Activity = 'walking' | 'gym'`; delete modes 5–8; delete `HealthPort` usage from
   the domain (the native HealthKit capability stays compiled — B38 — but no JS path reads it; keep the pod
   linked and a smoke test that the module loads).
2. Walk the blast-radius table file by file: validation bounds, `ruleName`, `resolveLock`, `progress`,
   `unlockHint`, content registries (`activities.ts` → 2 cards, `domain.ts` verbs, `workoutRules.ts` →
   gym only, `analytics.ts`, `settings.ts`, `plan.ts`, `setup.ts`, `permissions.ts`), draft/builder/flow,
   onboarding screens R1/R2/B1/B2/D deleted, X3 Health branch deleted, `HealthFake` deleted, analytics
   activity record shape, fixtures, scenarios, dev menu.
3. Icon swap for the two art usages.
4. Persisted-store migration: drop run/bike rules with a one-line note on next launch; replace the
   all-or-nothing array validators with per-row validation that drops only the bad row (audit finding).
5. Update `01-product-model.md`, `02-screen-inventory.md` (remove R/B rows, O20 → two cards), P2 references.

## Tests first

- Typecheck is the first failing test. Then `migration.test.ts` (mixed store → walking/gym only, note set;
  one malformed row dropped, rest kept).

## Acceptance

- [ ] `tsc --noEmit`, `jest`, `expo lint` green; `git grep -iE "'running'|'biking'|HealthPort"` in `src/`
      returns only the compiled-capability smoke test.
- [ ] Onboarding O20 shows two cards; builder offers walking and gym only.
