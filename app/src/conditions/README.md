# Conditions

Contract: binds the pure ConditionEngine to app stores and builder/picker screens. It hides persistence
and orchestration from routes. Condition math stays in `packages/condition-model`; screens render engine
verdicts and never recompute them.

Fixtures: none in Phase 0. Catalog and evaluation fixtures arrive with the first ConditionEngine binding
test. Test with `npm run test --workspace app -- conditions` from the repository root.
