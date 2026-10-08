# Analytics taxonomy

Source of truth: `app-next/src/runtime/analytics/PostHogAnalyticsAdapter.ts`. Events are emitted only after explicit opt-in and a ready, canonical identified-user generation. PostHog GeoIP, lifecycle/push/error autocapture, replay and default person properties are disabled.

## Semantic screens

`home`, `conditions`, `analytics`, `settings`, `setup`, `paywall`, `sign_in`. Unknown routes, query strings and fragments are not sent.

## Product events and allowed properties

| Event | Properties |
|---|---|
| `walk_places_updated` | `walk_places`: the selected places in the order `outside`, `inside`, `treadmill`, joined with `_and_` (for example `outside_and_treadmill`), or `none` (also the only person property) |
| `gym_presence_ended`, `gym_presence_auto_started`, `gym_presence_auto_confirmed`, `walk_auto_started`, `gym_unlock_lost` | context only |
| `unlock_ceremony_done`, `unlock_screen_opened` | `kind` (`gym`/`treadmill`), optional `preview` boolean |
| `treadmill_scan_started`, `treadmill_scan_verified` | optional `preview`; verified also has numeric `ms` |
| `treadmill_scan_failed` | `reason` (`denied`/`timeout`) |
| `gym_unlock_confirmed`, `gym_unlock_checked`, `gym_unlock_tapped` | optional `preview`; checked/tapped may include numeric `distance` |
| `condition_created` | optional coarse `activity` (currently demo/test usage) |
| `$feature_flag_called` | `$feature_flag`, `$feature_flag_response`; once per stable generation/name/placement snapshot |

Every emission registers `environment`, `runtime_version`, `update_id`, `walk_places`, and `$device_id`.

## Feature flags

`paywall_variant` (`control`/`variant_b`) is the value flag behind `PaywallScreen.variantKey` — control starts on the first returned product, variant_b on Adapty's `recommended` plan — and its exposure is recorded once per placement and identity generation, only for the stable value the mounted paywall rendered. `signInRequired` is boolean and gates the X4 "Skip for now" affordance. `onboarding_variant` and `shield_copy` are payload flags: their object payload carries the configuration (`onboarding_variant`: validated `preBranch`/`tail` step lists consumed by the onboarding flow rail; `shield_copy`: validated shield copy written on foreground), so their variant labels are not read client-side. Unknown values fail closed to `control`/`false`/the bundled order/nothing written. Reads suppress SDK exposure events.

## Forbidden data

Properties whose keys contain email, address, latitude, longitude, receipt, token, user ID, message, error, or URL are dropped. Values must be boolean, number, or a 1–64 character alphanumeric/underscore/hyphen token. Purchase, trial, and subscription lifecycle event prefixes are blocked. Never add coordinates, HealthKit samples, step counts, app-selection tokens, authentication material, receipts, URLs, or free text without updating code guardrails, this taxonomy, the manifest, and App Store labels together.
