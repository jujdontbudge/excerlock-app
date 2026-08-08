# Content

`src/content` is the standalone prototype’s typed translation layer for
`docs/CONTENT.md`. It owns visible copy, deterministic sample data, route title
labels, and static references to accepted runtime PNGs. It performs no device,
network, purchase, permission, account, health, location, notification, file,
or share work.

## Public interface

Import from the barrel:

```ts
import {
  assetRegistry,
  commonCopy,
  conditionCatalog,
  firstHomeFixture,
  milestoneFixtures,
} from "@/content";
```

The files are divided by screen domain:

- `common.ts`, `types.ts`, and `demo-fixtures.ts` provide shared vocabulary.
- `onboarding.ts`, `paywall.ts`, and `auth.ts` cover first run and purchase
  previews.
- `home.ts`, `conditions.ts`, and `sessions.ts` cover the core earn loop.
- `manage.ts`, `analysis.ts`, `lock-moments.ts`, and `settings.ts` provide the
  remaining screen models.
- `simulated-native.ts` is the authoritative disclosure/failure registry.
- `assets.ts` statically references all 79 accepted runtime finals under this
  app’s own `assets/` directory. Foundry `*-opaque.png` and `*-source.png`
  companions are intentionally excluded.

Natural first-run fixtures are intentionally empty. The three seeded
event/state/rate conditions and populated Analysis data are debug/showcase
fixtures only. Presentation state should clone these immutable values before
mutating local demo state.

## Contract checks

`__tests__/content.test.ts` checks public behavior and independent source-of-
truth counts: 17 catalog rows, 22 milestones, 28 heat cells, four shields, 20
simulated-native surfaces, empty natural fixtures, and the accepted asset
family totals.
