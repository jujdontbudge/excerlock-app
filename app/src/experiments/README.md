# ExperimentRail

Contract: this module owns typed PostHog flag names, control-first selection, payload validation,
and the app's single exposure-emitting provider. It hides SDK timing and raw payloads from consumers.
No file outside `ExperimentVariantProvider.tsx` may call `useFeatureFlag`.

`exp-` names are experiments and `gate-` names are release gates. The current registry contains only
`exp-shield-copy-v1`. Control renders immediately; a valid treatment may replace it only within the
500 ms budget, and late results cannot rotate copy client-side. `shieldCopyPayload.ts` accepts only a
complete four-cause title/subtitle set. Ticket #92 owns the shield writer; this module only delivers
validated copy through `useShieldCopyExperiment`.

Fixtures:

- `__tests__/experiments.test.ts` — naming, variants, timeout, and payload validation.
- `__tests__/ExperimentVariantProvider.test.tsx` — control-first timing.
- `__tests__/ExperimentRuntimeRoot.test.tsx` — one provider and decoded delivery.

Public surface: registry constants/types, `ExperimentRuntimeRoot`, `ExperimentVariantProvider`,
selection hooks, and shield payload decoder/types, all through `index.ts`.

Test command: `cd app && npx jest src/experiments --runInBand`.
