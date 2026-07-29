# PaywallGate

Contract: exposes the one `isPremium` entitlement predicate and hides the Adapty adapter. Screens ask the
gate, never the SDK; debug entitlement simulation is an adapter input.

Fixtures: entitlement states arrive with the predicate test. Test with
`npm run test --workspace app -- paywall`.
