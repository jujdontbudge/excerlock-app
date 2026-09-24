---
status: accepted
date: 2026-09-24
---

# 0044: Ship without HealthKit

## Decision

The iOS app ships without HealthKit: no `@kingstinct/react-native-healthkit` dependency, no HealthKit
entitlements, no Health purpose strings and no background-delivery bootstrap. Walking and step
goals use Core Motion. The `HealthProvider` contract and its fixtures stay for engine tests.

## Context

App Review rejected 1.0 (10) under Guideline 2.5.1 (submission `55dc9a38-95dd-419f-a115-64f43bfd274a`,
2026-09-24): the binary uses HealthKit but the UI never identifies HealthKit functionality. That was
accurate. The JavaScript product stopped reading HealthKit earlier (B38,
`src/ports/__tests__/healthCapability.test.ts`), but the native capability, entitlements and an
AppDelegate hook that configured background delivery at launch were still shipped. Apple's note says an
app that only uses Core Motion should remove HealthKit from the binary. Build 10 had changed only
the store description, which did not resolve the finding.

The alternative was to add an Apple Health feature and label it in the UI. No shipping feature needs
Health data, so that would mean building a feature only to justify a capability.

## Consequences

The binary no longer links HealthKit, and the store description must not mention Apple Health.
Bringing HealthKit back needs a visible Apple Health feature and a new ADR. The legacy `app/`
workspace still lists the package; it does not ship.

## References

- `app-next/config/native.ts`, `app-next/guardrails/plugin-order.test.ts`,
  `app-next/guardrails/infoplist.test.ts`.
- `app-next/src/engine/signals/health/README.md`.
