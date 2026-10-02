---
status: accepted
date: 2026-09-16
---

# 0032: PostHog flag rails with one production consumer per registry entry

## Decision

Every non-monetary A/B stays in PostHog and is delivered over the existing generation-scoped
`PostHogFlagsController`; Adapty keeps every money decision. The controller's registry has two
allow-lists and both are closed: **value flags** (`paywall_variant`, `signInRequired`, `review_preset`)
are read with `get`/`expose`, **payload flags** (`shield_copy`, `onboarding_variant`) with `getPayload`.
Adding a flag without a production consumer is a defect: `guardrails/flag-consumers.test.ts` pins one
consumer chain per registered flag (the read, the runtime field composition assigns, and the surfaces
that call it) and fails when the registry and that table disagree.

`onboarding_variant` therefore moves from the value allow-list to the payload allow-list: the arm label
is never read client-side, and the onboarding order travels in the flag payload. The payload may name
`preBranch` and/or `tail`, each a non-empty list of unique step ids drawn from that group's bundled set
and accepted by the same step-id predicate the persisted store validates with (`src/onboarding/stepId.ts`);
the tail must still end at `P` so the rail cannot strand a user without the paywall. A group the payload
omits keeps its bundled order, and any malformed, absent or late payload leaves the whole bundled order in
force. Navigation also reverts to the bundled order for a step the remote rail does not contain, so a
dropped step can never rewind or loop the flow. The rail is read once per app run, in the background behind
a runtime port: the first frame always paints the bundled order, nothing awaits the flag, and the order is
never reassigned under a user mid-flow.

`paywall_variant` is the UI variation key (`control`/`variant_b`) for the mounted `PaywallScreen`: control
starts on the first product Adapty returned, variant_b starts on the plan Adapty marks `recommended`.
Which plans exist, their order and their prices stay Adapty-owned; a PostHog variant never changes money
and never overrides a plan the user picked. Its exposure is recorded once per placement and identity
generation, only after the placement actually loaded, and never for a variant the surface did not render.

## Context

The client fetched `paywall_variant` and `onboarding_variant` but had no consumer, and `signInRequired` was
half-wired (`SignInScreen` accepted a source nothing supplied). The review-readiness plan (§2.2, B7/B8,
C7) requires OTA-changeable non-monetary experiments that can never block a render, and that stays true
only if an operator cannot create a flag the client silently ignores. The `review_preset` and
`shield_copy` rails already established the shape this ADR generalizes: a narrow runtime port per flag,
strict payload validation, and a fail-closed default.

Alternatives rejected: reading `onboarding_variant` as a value flag (the order cannot be expressed as one
of two labels), reordering inside `PaywallScreen` (would fight the Adapty-owned catalog order), waiting for
the flag before the first onboarding frame (violates the ≤2 s control rule and the startup budget), and
letting a late payload replace the rail mid-flow (assignment instability and unreportable funnels).

## Consequences

The PostHog project must define `onboarding_variant` with a JSON payload (not just `control`/`variant_b`)
for the order rail to apply; the value label is then unused client-side, and `$feature/onboarding_variant`
still splits funnels through the SDK's own super properties. `onboarding_variant` payloads can drop steps
(including trial steps), so an operator can ship an order change with no binary update — the guardrails are
validation, not intent. Flag consumers stay thin: each new flag needs a port, a consumer, and a guardrail
row, which is deliberate friction. Sign-in enforcement covers the three `SignInScreen` mounts; the Settings
"sign in to keep your data" nag named in the auth plan is still unwired, and `paywall_variant` currently
varies only the initial plan choice — a layout-level variant needs a design-system decision first.

## References

- [ADR 0060](0060-first-install-onboarding-ota-catchup.md) freezes each started onboarding's order and narrows payload validation to retain prerequisite questions. Structural order handling belongs to the versioned onboarding flow contract.

- `app-next/src/runtime/analytics/PostHogAnalyticsAdapter.ts` (registry, `getPayload`, exposure dedup)
- `app-next/src/onboarding/flowOrder.ts`, `app-next/src/onboarding/stepId.ts`, `app-next/src/onboarding/flow.ts`
- `app-next/src/features/subscription/PaywallSlot.tsx`, `app-next/src/features/setup/useSignInRequiredSource.ts`
- `guardrails/flag-consumers.test.ts`, `docs/analytics/taxonomy.md`
- [0023: Honest release reviewer preset](0023-reviewer-preset.md) — **accepted** (the first flag consumer)
