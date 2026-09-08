# @excerlock/analytics-events

The typed PostHog event registry — the single source of truth for **every event name the product
is allowed to emit**, its properties type, and its **owner** (`client | server | adapty`). Pure
TypeScript data and types: no React, no React Native, no I/O, no PostHog SDK.

**Contract.** The app's client emitter (`app-next/src/adapters/analytics`) and the server emitter
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
| D5 | Owner assignment: **server** emits persisted `/v1` domain actions (support pipeline, account deletion — authoritative, replay-proof); **client** emits flow/UI events *and* on-device domain truth — in ExcerLock the whole economy (conditions, unlocks, shields) evaluates on-device per PRD §5, so the client owns it; **adapty** owns the subscription lifecycle. |
| D6 | Distinct id = **Supabase user id** everywhere (mobile `identify()`, server `capture()`, Adapty `customer_user_id`). Every session carries a user id, the anonymous one included (P2-T18), so `identify()` runs from first launch; `personProfiles: 'identified_only'` still gates person creation, and the anonymous distinct id is aliased into the signed-in id at link time. See "Identity" below. |
| D7 | Experiments split: **PostHog = flow/design/copy**, **Adapty = price/trial length/plan mix**. Never price-test via PostHog. |
| D8 | PostHog experiment flags bucket on **`$device_id`**, never `distinct_id` (onboarding users are anonymous; `identify()` would flip variants mid-flow). |
| D9b | Analytics is opt-out: the Settings "Share usage analytics" switch calls PostHog `optOut()` / `optIn()` and is honoured before the first event of the session. |
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
| `onboarding_screen_viewed` | `screen` |
| `onboarding_answer` | `screen` (answer value stays on-device) |
| `setup_permission_result` | `permission`, `result` |
| `sign_in_completed` | `provider` |
| `condition_created` / `condition_edited` / `condition_deleted` | `activity`, `mode` |
| `rule_met` | `activity`, `mode`, `day`, `window_bucket` (goal, progress and metric stay on-device) |
| `apps_unlocked_rest_of_day` | `activity` |
| `shields_applied` | — |
| `shields_lifted` | — |
| `shield_screen_opened` | — |
| `walking_session_started` | — |
| `walking_session_ended` | — |
| `unlock_screen_opened` / `unlock_ceremony_done` | `kind`, `preview` |
| `treadmill_scan_started` | `preview` |
| `treadmill_scan_verified` | `ms`, `preview` |
| `treadmill_scan_failed` | `reason`, `preview` |
| `gym_unlock_tapped` | `preview` (the distance to the saved gym never leaves the device) |
| `gym_unlock_confirmed` | `preview` |
| `gym_unlock_lost` | — |
| `paywall_viewed` | `placement`, `has_trial` |
| `purchase_started` | `placement`, `plan_id` |
| `notification_opened` | `type` |
| `rating_prompt_shown` | `source` |
| `diagnostics_shared` | — |
| `data_export_requested` | — |

**Cut for v1.** `earn_claimed` and `sick_day_override_used` (the balance economy folded into
`rule_met` / `apps_unlocked_rest_of_day`); `milestone_unlocked` and `share_card_shared` (B16 cut
badges and share cards); `notification_toggled` (there are no per-type toggles); the three
`vendor_*` events (no direct vendor connections in v1). `walk_session_*` was renamed
`walking_session_*`.

Plus `$screen` via the `trackScreen()` wrapper — PostHog-reserved, deliberately not in the registry.

### Server (emitted by `server/src/analytics.ts`)

| Event | Properties |
|---|---|
| `support_request_submitted` | `category` (`support \| bug \| feature` — `feature` is the queryable demand signal) |
| `account_deleted` | — |

### Adapty (native Adapty → PostHog integration; nobody in this repo emits these)

`trial_started` · `trial_converted` · `trial_renewal_cancelled` · `subscription_started` ·
`subscription_renewed` · `subscription_renewal_cancelled` · `subscription_expired` ·
`subscription_refunded` · `billing_issue_detected` · `entered_grace_period`

Payloads are Adapty-controlled; `AdaptyForwardedProps` types only the fields our funnels rely on.
**Names must be verified against the integration's event-name config at Phase-5 wiring** — this
registry is the single place to correct them.

## FLOW funnel surface (PRD §10.5)

- `FLOW_SCREENS` — the acquisition rail in path order: the questionnaire (`O01`–`O20`), the
  activity branch it forks into (`G1`, `G2`, `R1`, `R2`, `B1`, `B2`, `D`, `W1`–`W4`), the summary
  and schedule tail (`S1`–`S4`, `T1`–`T4`), the paywall (`P`), and the post-purchase setup rail
  (`X1`, `X2`, `X3a`, `X3b`, `X4`, `X5`). `FlowScreen` is derived from it, and
  `app-next/src/onboarding/flow.ts` renders the per-screen data behind these ids.
- `APP_SCREENS` / `TRACKED_SCREENS` — the steady-state screens that also report a `$screen`, and
  the union of both. The transport drops any `$screen` outside `TRACKED_SCREENS`, so a route name
  can never leak in as a screen id.
- `TrackOnboardingScreen` / `TrackOnboardingAnswer` — signatures of the two helpers, called **only**
  from the rail's central renderer (one call site; a screen added to the array is instrumented with
  zero new code).
- `OnboardingFunnelStep` — the discriminated union of emitted funnel steps.

### The retired rail (`src/legacy.ts`)

`app/` still renders the seven-screen onboarding that shipped before the rebuild: `value-prop`,
`confession`, `mirror`, `permissions-primer`, `pick-apps`, `paywall`, `sign-up`. One union cannot
describe both rails honestly, so those ids live in `src/legacy.ts` as `LEGACY_FLOW_SCREENS` /
`LegacyFlowScreen` rather than widening `FLOW_SCREENS`. `LegacyPropsOf` puts the two funnel events
back on that rail and leaves every other event's shape alone, so the legacy kit still refuses a cut
event or a wrong payload. Only `app/` may import any of it; P2-T12's cutover deletes the file with
the workspace.

## Identity (D6/D8)

`identify(userId)` runs on every session change, anonymous sessions included — the ordering law is
`app-next/src/domain/identity.ts` and the mount is `runtime/IdentityBridge`. Two things keep that
from inflating person counts:

- `personProfiles: 'identified_only'` is set on the SDK, so PostHog creates a person record for a
  distinct id only once an identified event arrives for it.
- The anonymous id is the same local id the app persists for the device, so an anonymous session
  identifies to one stable distinct id rather than a new one per launch, and signing in aliases
  that id into the Supabase user id.

Feature-flag bucketing stays on `$device_id` (D8), unchanged by any of the above — a mid-flow
`identify()` must never flip a variant.

## Person properties

The four onboarding answers `ageBand`, `occupation`, `improveFirst` and `mainReason` (O06–O09) are
set as PostHog person properties. They are single choices from closed option lists, never typed
text, and they are what gives the collection a stated purpose (audit finding on O06–O09).

## Public surface (`index.ts`)

- `EVENTS`, `EVENT_NAMES`, `ownerOf()`, `eventsOwnedBy()`, `isRegisteredEvent()`,
  `transmittedPropertiesOf()`, `enumValuesOf()` — what emitters and the guardrail test consume.
- `EventName`, `PropsOf<E>`, `OwnerOf<E>`, `ClientEventName` / `ServerEventName` /
  `AdaptyEventName`, `AnalyticsEvent` — the type helpers.
- Domain vocab: `ActivityKind`, `ConditionKind`, `WindowBucket`, `ShieldCause`,
  `ShieldLiftReason`, `CeremonyKind`, `TreadmillScanFailure`, `PaywallPlacement`,
  `NotificationType`, `PermissionName`, `SignInProvider`, `SupportCategory`, …

Compile-time invariants live in `src/registry.ts`: the props map and owner map must cover exactly
the same names, and every props shape must be D12-flat. Runtime invariants (snake_case names,
owner partition, module disjointness, the privacy floor) are in `__tests__/`.

**Two privacy layers.** `transmittedProperties` is the name allowlist — a property not listed is
dropped at the transport boundary even when a call site passes it. `enumProperties` is the value
floor for the properties that are closed unions: a value outside the declared set is dropped
rather than sent. The second layer exists because `AnalyticsPort.track()` takes an untyped
property bag, so a caught exception's message can reach a `reason` property; without the floor its
text — a path, a gym name, a bundle id — would go to PostHog verbatim.
