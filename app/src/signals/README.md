# SignalKit

Contract: exposes provider interfaces for health, motion, location, screen time, and vendors. Each signal
gets a native implementation and a fixture implementation; selection happens once at the composition
root. Screens never branch on provider availability.

Fixtures: provider timelines are added beside their first contract tests. Test with
`npm run test --workspace app -- signals` from the repository root.
