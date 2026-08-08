# Presentation state

This module is the single source of truth for every local prototype mutation.
Routes render selectors and dispatch `DemoAction`; they do not invent condition,
account, permission, purchase, or access logic.

## Public interface

- `createDemoState(options?)` builds either the natural zero-condition fixture
  or an explicit Debug showcase fixture.
- `transitionDemo(state, action)` is a pure deterministic reducer.
- `getOnboardingScreen`, `getBuilderScreen`, and `getHomeModel` convert state
  into screen-ready models.

`systemClaims` remains false by construction. It documents that the prototype
never reads location/health data, delivers notifications, charges a purchase,
creates an account, blocks apps, or mutates any external system.
