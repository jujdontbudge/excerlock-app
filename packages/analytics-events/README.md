# @excerlock/analytics-events

The typed PostHog event registry — the single source of truth for **every event name the product
is allowed to emit**, its properties type, and its **owner** (`client | server | adapty`). Pure
TypeScript data and types: no React, no React Native, no I/O, no PostHog SDK.

**Contract.** The app's client emitter (`app/src/analytics`) and the server emitter
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
| D12 | **Privacy:** event payloads carry ids, enums, numbers, booleans — **never free text or health values**. (Enforced at the type level: every props shape must extend `Record<string, string \| number \| boolean \| undefined>`; e.g. `sick_day_override_used` deliberately carries no reason text.) |

**Adding an event** = add it to its domain module (name + owner + props type) **and** to the
taxonomy table below, in the same PR, test-first. After launch cutover, names are frozen; a rename
requires a migration note here.

## Taxonomy

### Client (emitted by `app/src/analytics`)

| Event | Properties |
|---|---|
| `onboarding_screen_viewed` | `screen` |
| `onboarding_answer` | `screen`, `value` |
| `condition_created` / `condition_edited` / `condition_deleted` | `kind`, `signal`, `source` |
| `earn_claimed` | `kind`, `signal`, `source`, `payout`, `minutes_earned` |
| `sick_day_override_used` | — (reason text stays on-device, D12) |
| `shields_applied` | `cause` |
| `shields_lifted` | `reason` |
| `shield_screen_opened` | `cause` (the shield's "Open ExcerLock" deep link; Regen's `panic_opened` pattern) |
| `walk_session_started` | `source` |
| `walk_session_ended` | `reason` |
| `paywall_viewed` | `placement`, `has_trial` |
| `purchase_started` | `placement`, `plan_id` |
| `milestone_unlocked` | `category`, `threshold` |
| `share_card_shared` | `card`, `format` |
| `notification_toggled` | `type`, `is_enabled` |
| `notification_opened` | `type` |
| `rating_prompt_shown` | `source` |
| `diagnostics_shared` | — |
| `data_export_requested` | — |

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

- `EVENTS`, `EVENT_NAMES`, `ownerOf()`, `eventsOwnedBy()`, `isRegisteredEvent()` — what emitters
  and the guardrail test consume.
- `EventName`, `PropsOf<E>`, `OwnerOf<E>`, `ClientEventName` / `ServerEventName` /
  `AdaptyEventName`, `AnalyticsEvent` — the type helpers.
- Domain vocab: `ConditionKind`, `PayoutKind`, `ShieldCause`, `ShieldLiftReason`,
  `PaywallPlacement`, `MilestoneCategory`, `NotificationType`, `Vendor`, `SupportCategory`, …

Compile-time invariants live in `src/registry.ts`: the props map and owner map must cover exactly
the same names, and every props shape must be D12-flat. Runtime invariants (snake_case names,
owner partition, module disjointness) are in `__tests__/`.
