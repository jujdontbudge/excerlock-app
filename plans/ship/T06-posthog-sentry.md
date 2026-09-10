# T06 — PostHog and Sentry

Spec: `04-identity-and-money.md` §1 steps 2, 6; `03-ota-and-release.md` §4. Playbook §3 checklist. Facts:
`research/infra-audit.md` §4–§5.

## Steps

1. `PostHogAnalyticsAdapter implements AnalyticsPort`: `identify(uid)`; super-properties `environment`,
   `runtime_version`, `update_id`, `walk_places` (B40) registered at construction **and after every reset**;
   device id primed before the first flags call; `flagsReady` promise with 2 s timeout; `useFlag(name)`
   uses the exposure-sending API; screen tracking for every route with low-cardinality names.
2. Event registry: reuse `packages/analytics-events` — typed union, enums only, no free text, outcome events
   on outcome. Add the trial funnel (paywall_viewed, trial_started, purchase_completed via integration only),
   onboarding steps, condition_created, unlock_by_{walking,propped,gym}, permission_{granted,denied}, review
   preset used.
3. Flags: `paywall_variant`, `signInRequired`, `onboarding_variant` (reserved), all defaulting to control.
4. Sentry: `@sentry/react-native` init at root with `release`/`dist` per §4; Metro plugin; sourcemap upload
   on build and on `eas update` (`scripts/upload-sourcemaps.sh`); breadcrumbs for lock transitions, watchdog
   fires, update events; PII scrubbing; `environment` tag.
5. Analytics opt-out switch (Settings) gates `capture`; Sentry stays on (crash-only, disclosed).
6. `docs/analytics/taxonomy.md` updated in the same commit as the union (ledger: docs encoding a false premise).

## Tests first

- `analytics-order.test.ts` (super-props survive reset; identify before first capture) ·
  `flags-gate.test.ts` (first flagged surface renders control on timeout, variant only after ready) ·
  single-emitter guardrail (no `purchase_*` capture from app code).

## Acceptance

- [ ] PostHog: events from a `preview` build carry `environment=preview`; a simulator and a device are two
      persons, not one.
- [ ] Exposure for `paywall_variant` appears once per person, only after the paywall mounted.
- [ ] Sentry: a forced crash from the `preview` build symbolicates with the right release/dist.
