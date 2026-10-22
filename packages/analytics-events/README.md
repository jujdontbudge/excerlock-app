# @excerlock/analytics-events

Permission outcomes, unlock method and review presets use bounded enum
vocabulary. Raw answers, locations, account identifiers, receipts, and free-form SDK
errors never cross this seam. Checkout diagnostics permit only integer Adapty failure codes in 0–9999. Subscription/trial lifecycle and revenue remain
owned only by the Adapty integration.

The typed PostHog event registry — the single source of truth for **every event name the product
is allowed to emit**, its properties type, and its **owner** (`client | server | adapty`). Pure
TypeScript data and types: no React, no React Native, no I/O, no PostHog SDK.

**Contract.** The app's client emitter (`app-next/src/runtime/analytics`) and the server emitter
(`server/src/analytics.ts`) both import from here, so an untyped or unregistered `capture()` does
not compile. The fs-walking single-emitter guardrail test (ARCHITECTURE §5 #6) walks `EVENTS` /
`eventsOwnedBy()` against the codebase's capture call sites and fails CI when an event is emitted
from the wrong side. What this module hides: nothing is computed here — it is deliberately a
registry, so reading it *is* reading the analytics schema.

**Test command:** `npm install && npx vitest run` (runtime suite + type-level `*.test-d.ts` via
vitest typecheck). `npm run typecheck` for a plain `tsc` pass.

## The law (D1–D12, ported from Regen's ANALYTICS-CONVENTIONS.md)

Regen's conventions apply verbatim (PRD §10) with Adapty in RevenueCat's seat. Re-stated as
ExcerLock law:

| # | Rule |
|---|------|
| D1 | **Dedicated ExcerLock PostHog project** (org Edge). Flags, experiments, and event definitions are project-scoped. |
| D2 | `register({ app: 'excerlock' })` super property on every mobile event. |
| D3 | Event names: **`object_action` snake_case, past tense, static string literals only** — never interpolated, never `$`-prefixed (PostHog-reserved). Adapty-forwarded names are a vendor namespace and keep Adapty's defaults (same exemption Regen gave `rc_*`). |
| D4 | **Single-emitter rule: every event has exactly one owner** — `client` XOR `server` XOR `adapty`. Never two emitters for one name (double counting). The owner lives in this registry; the guardrail test enforces it against real call sites. |
| D5 | Owner assignment: **server** emits persisted `/v1` domain actions (support pipeline, vendor OAuth/webhooks, account deletion — authoritative, replay-proof); **client** emits flow/UI events *and* on-device domain truth — in ExcerLock the whole economy (conditions, earns, shields) evaluates on-device per PRD §5, so the client owns it; **adapty** owns the subscription lifecycle. |
| D6 | Distinct id = **Clerk user id** everywhere (mobile `identify()`, server `capture()`, Adapty `customer_user_id`). The entire onboarding + paywall funnel runs **anonymous on `$device_id`** — `identify()` fires only at post-purchase sign-up. |
| D7 | Experiments split: **PostHog = flow/design/copy**, **Adapty = price/trial length/plan mix**. Never price-test via PostHog. |
| D8 | PostHog experiment flags bucket on **`$device_id`**, never `distinct_id` (onboarding users are anonymous; `identify()` would flip variants mid-flow). |
| D9 | Subscription lifecycle events come **only** from the native Adapty → PostHog integration. The server's Adapty webhook drives the Postgres entitlement mirror and emits **no** subscription events — that would double-count. |
| D10 | Flag keys: `exp-<surface>-<slug>` for experiments, `gate-<slug>` for gates. |
| D11 | Autocapture **off**; no session replay; screen tracking is manual `trackScreen()` (`$screen`) on real navigation only. |
| D12 | **Privacy:** event payloads carry only explicitly allowlisted product metadata — never free text, health, motion, location, workout metrics, or screen-time values. Types constrain shapes and each client registry entry declares `transmittedProperties` for the runtime boundary. |

**Adding an event** = add it to its domain module (name + owner + props type) **and** to the
taxonomy table below, in the same PR, test-first. After launch cutover, names are frozen; a rename
requires a migration note here.

## Taxonomy

### Client (emitted by `app/src/analytics`)

| Event | Properties |
|---|---|
| `onboarding_screen_viewed` | `screen` (a `FlowScreen` slug, or `plan-demo` for the S3b "How your plan works" step, which adds `scenario` and, for walk-state, `place`) |
| `onboarding_offer_exposed` | `arm`, `source`, `intro_offer`, optional `variation_id`; ordinary UI exposure, not a feature flag |
| `onboarding_answer` | `screen` (answer value stays on-device) |
| `bank_condition_created` | `activity`, `difficulty` |
| `offer_bought` | `offer_id` |
| `points_collected` / `bank_emptied` | — |
| `condition_created` / `condition_edited` / `condition_deleted` | — |
| `earn_claimed` | — |
| `sick_day_override_used` | — (reason text stays on-device, D12) |
| `shields_applied` | `app_state`, `source`, `cause` |
| `shields_lifted` | `app_state`, `source`, `reason` |
| `shield_screen_opened` | — |
| `walk_session_started` | — |
| `walk_session_ended` | — |
| `paywall_viewed` | `placement`, `has_trial`, `variation_id`, optional onboarding `offer_arm`, `offer_source` |
| `checkout_attempt_started` | `attempt_id`, `operation`, `placement`, `plan_id` |
| `checkout_stage_recorded` | attempt context plus `stage`, `stage_result`, `elapsed_ms`, optional `failure_code`, `failure_kind` |
| `checkout_attempt_completed` | attempt context plus `outcome`, `stage`, `failing_stage`, `failure_kind`, optional `failure_code`, `duration_ms`, optional `storekit_ms`, `sheet_observation`, `entitlement_result` |
| `paywall_error` | `operation` |
| `milestone_unlocked` | — |
| `share_card_shared` | `card`, `format` |
| `notification_toggled` | `type`, `is_enabled` |
| `notification_opened` | `type` |
| `rating_prompt_shown` | `source` |
| `diagnostics_shared` | — |
| `data_export_requested` | — |
| `activity_truth_held` | `activity` (`walking \| sitting \| shaking \| treadmill`), `lock_state` |
| `incident_report_sent` | `source` (`home \| settings`), `activity` (or `none`), `lock_state` |
| `permission_resolved` | `permission`, `outcome` |
| `unlock_completed` | `method`, `app_state`, `source` |
| `review_preset_selected` | `preset` |
| `walk_places_updated` | `walk_places` |
| `gym_presence_auto_started` / `gym_presence_auto_confirmed` / `gym_presence_ended` | — |
| `gym_unlock_checked` / `gym_unlock_tapped` / `gym_unlock_confirmed` / `gym_unlock_lost` | `preview` (distance stays on-device, D12) |
| `unlock_screen_opened` / `unlock_ceremony_done` | `kind`, `preview` |
| `treadmill_scan_started` | `preview` |
| `treadmill_scan_verified` | `ms`, `preview` |
| `treadmill_scan_failed` | `reason` |
| `runtime_launched` | `app_state` (`background` means iOS relaunched the app) |

Plus `$screen` via the `trackScreen()` wrapper — PostHog-reserved, deliberately not in the registry.

### Server (emitted by `server/src/analytics.ts`)

| Event | Properties |
|---|---|
| `support_request_submitted` | `category` (`support \| bug \| feature` — `feature` is the queryable demand signal) |
| `account_deleted` | — |
| `vendor_connected` / `vendor_disconnected` | `vendor` |
| `vendor_earn_recorded` | `vendor` (webhook-driven signal arrival — distinct from the client's `earn_claimed` balance truth) |

### Adapty (native Adapty → PostHog integration; nobody in this repo emits these)

`trial_started` · `trial_converted` · `trial_renewal_cancelled` · `subscription_started` ·
`subscription_renewed` · `subscription_renewal_cancelled` · `subscription_expired` ·
`subscription_refunded` · `billing_issue_detected` · `entered_grace_period`

Payloads are Adapty-controlled; `AdaptyForwardedProps` types only the fields our funnels rely on.
**Names must be verified against the integration's event-name config at Phase-5 wiring** — this
registry is the single place to correct them.

## FLOW funnel surface (PRD §10.5)

- `FLOW_SCREENS` — the locked v1 screen order (`value-prop → confession → mirror →
  permissions-primer → pick-apps → paywall → sign-up`), with the `FlowScreen` union derived from
  it. The app's `flow.ts` rail array is typed against this union.
- `TrackOnboardingScreen` / `TrackOnboardingAnswer` — signatures of the two helpers, called **only**
  from the rail's central renderer (one call site; a screen added to the array is instrumented with
  zero new code).
- `OnboardingFunnelStep` — the discriminated union of emitted funnel steps.

## Public surface (`index.ts`)

- `EVENTS`, `EVENT_NAMES`, `ownerOf()`, `eventsOwnedBy()`, `isRegisteredEvent()`,
  `transmittedPropertiesOf()` — what emitters
  and the guardrail test consume.
- `EventName`, `PropsOf<E>`, `OwnerOf<E>`, `ClientEventName` / `ServerEventName` /
  `AdaptyEventName`, `AnalyticsEvent` — the type helpers.
- Domain vocab: `ConditionKind`, `PayoutKind`, `ShieldCause`, `ShieldLiftReason`,
  `PaywallPlacement`, `MilestoneCategory`, `NotificationType`, `Vendor`, `SupportCategory`, …

Compile-time invariants live in `src/registry.ts`: the props map and owner map must cover exactly
the same names, and every props shape must be D12-flat. Runtime invariants (snake_case names,
owner partition, module disjointness) are in `__tests__/`.

ADR 0078 adds an Adapty-owned onboarding offer experiment. Client events pass by registry ownership, consent and canonical identity; there is no purchase/restore prefix filter.

Migration (2026-10-22, ADR 0090): new checkout diagnostics replace the retired client `purchase_started`, `purchase_failed`, `restore_started`, `restore_succeeded` and `restore_failed` emissions. Historical names and data are unchanged in PostHog; the active registry lists the new emitters. `operation` separates purchase from restore. Never combine completion `success` with authoritative Adapty revenue events in a revenue funnel. It means the SDK returned success, independently of admission.

The attempt ID is 12 random hexadecimal characters generated for each accepted operation, never an account, transaction or recovery-journal ID. Restore uses `plan_id: none`; an expired purchase handle uses `unknown`. Stages are `identity_ready`, `recovery_journal`, `integration_attach`, `storekit`, `result`, `entitlement_verification`. Stage results are `started`, `succeeded`, `failed`, `skipped`, `timed_out`. A failed best-effort integration stage can precede a successful attempt.

Completion outcomes are `success`, `cancelled`, `pending`, `already_subscribed`, `not_found` (restore only), `failed`. A later journal or profile failure preserves a returned purchase success and records its `failing_stage`. A restore without a matching, readable profile is a verification failure, never `not_found`. Failure kinds are `none`, `transport`, `auth`, `verification`, `storage`, `vendor`, `unknown`, `timeout`. Missing vendor codes are omitted. Durations use the monotonic clock, rounded to milliseconds and capped at one day. `storekit_ms` includes restore SDK retries.

`sheet_observation: inactive` means an AppState inactive transition occurred while `makePurchase` was in flight. Other values are `not_observed`, `not_called`, `unavailable`; absence does not establish that Apple never showed UI, and unrelated system UI can also cause inactive. Restore does not observe the purchase sheet. `entitlement_result` is `not_checked`, `active`, `none`, `unverified`, or `failed`, and reports the local SDK profile only. Account-bound paid admission remains a separate Journey decision. Process termination or consent/identity gates can prevent delivery; the single terminal guarantee applies to completed client calls, not crash recovery or PostHog ingestion.
