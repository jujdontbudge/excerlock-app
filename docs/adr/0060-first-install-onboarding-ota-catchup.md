---
status: accepted
date: 2026-10-02
---

# 0060: First installs catch up at stable onboarding boundaries

## Decision

A fresh install observes the native `ON_LOAD` update download and keeps a splash-identical cover for an eight-second launch budget. It never starts a second startup check or fetch. A completed download can reload behind the same cover. Existing installs have no added hold.

The manifest declares `extra.onboardingFlowVersion`, including the `extra.expoClient.extra` shape used by Expo Updates. Page order, branches, saved answer meaning and flag-order handling form a versioned contract in `app-next/config/onboardingFlow.json`. `excer check` fingerprints their tokenized definitions and semantic choice definitions (without display copy), and compares the declaration against HEAD and origin/main. Copy and artwork live outside that contract. Existing answer keys and choice identifiers retain their meanings; new meanings require new keys or identifiers.

For a fresh install that still has not reached the Paywall, a same-version update reloads at a stable page change after answers and progress have been persisted. A different or absent version finishes the running onboarding and reloads immediately before the Paywall. The install record grants at most one programmatic catch-up reload. The current first-onboarding Journey suppresses later tab reloads, while subsequent cold sessions regain the existing tab-root coordinator after reaching the Paywall, Setup or the app. An admitted Sign in shortcut also ends catch-up. The existing per-update two-attempt guard also applies. Paywall, sign-in, purchase, restore, permission prompts, background state, page animations, native transitions and open page overlays deny catch-up reload authority.

An onboarding envelope restores navigation only, before the root route is selected. An ordinary cold reopen of unfinished first onboarding resumes the first incomplete page in its frozen order. Existing installs retain ADR 0050's Welcome-first cold launch. Unknown saved page identifiers are retained so that progress and answers can select the missing page; they never cause an automatic restart at Welcome. A recorded answer page is incomplete when its required answer is absent. Flag orders retain Welcome, name, activity, body-goal and screen-time questions, and put the estimate before its dependent impact pages. Malformed orders use the bundled flow.

The explicit before-Paywall envelope opens the current Paywall after a changed-flow reload. This gives the agreed finish-old-onboarding rule precedence over showing pages newly inserted into the new onboarding. Their answers cannot be prerequisites of the new Paywall or Setup; a change that needs such answers must supply a compatible migration or require a new Journey. The local fixtures add informational content and preserve saved answer meanings.

Each mounted Paywall records one impression after its plans load. The first observation per install persists the running update ID and embedded status. Only known fresh installs set `first_paywall_view`; older installs cannot retrospectively label their historical first view. Every impression emits `is_embedded` and `update_id`. Analytics retain the running update's existing super-properties. No answers or sensor details are added.

## Context

Build 17, runtime 4 waits three seconds for native startup downloads. A slow fresh install therefore entered the embedded onboarding and could not reload until reaching a tab root. This decision is for build 18's JavaScript and launch behavior; it does not authorize any release or runtime-version change.

The deadline uses Expo's native controller-start log timestamp, with its one-second resolution. When unavailable, native launch duration and React Native's initialization clock reserve 1.5 seconds for the unobserved native bootstrap gap. Runtime hydration proceeds behind the cover. Navigation prepares the destination during the final emphasized motion duration (480 ms), still behind the cover. Transient safety denial retries within the remaining deadline without starting a network check or fetch. The cover uses the existing splash artwork and design tokens. The native splash stays until the cover image has loaded and crossed two render frames; font loading does not replace the cover. Expo's native reload overlay disappears on the new JavaScript's first content, so the root itself draws the same cover until its destination mounts. The coordinator reads live safety again after every persistence await. The tab envelope host leaves onboarding envelopes for the launch gate, preventing competing consumers. A briefly unsafe Paywall handoff waits up to one second; if safety still denies it, the user stays on the reminder and may Continue once foregrounded.

A local Release simulator lab is necessary because development mode disables Expo Updates. The isolated snapshot uses fake service ports and real native Updates. Its loopback server serves manifests, assets and rollback directives, delayed, stalled, interrupted, corrupt and crashing updates. Nothing is uploaded. Lab opt-in changes only the isolated snapshot and loopback configuration. The production config gains the required flow version; all other production fields remain unchanged.

## Consequences

The hold is install-scoped and best-effort: failed downloads, storage failures, an exhausted guard or a used reload grant keep the runnable code. “Newest Paywall” applies to a usable update downloaded before the final safe boundary. It cannot promise future publications, an offline update or a bad update, and the one-reload limit takes precedence if another update arrives after the grant was used.

Expo recovery protects crashes before first content. Drawing a cover is first content, so a crash after that cover has rendered is outside that automatic rollback guarantee. Runtime hydration and a native reload can also extend the launch budget; measured lab timings, not the configured timeout, determine verification status.

ADR 0032's unrestricted dropping/reordering is narrowed by prerequisite validation. ADR 0050's tab-only envelope and Welcome-first launch gain the unfinished-first-onboarding exception above; paid admission remains independently verified. ADR 0059's admission renewal is unchanged.

## References

- [OTA documentation and lab](../ota.md).
- [0032: PostHog flag consumers](0032-posthog-flag-consumers.md) — accepted, prerequisite constraints narrowed here.
- [0050: Welcome-first Journey](0050-hard-paywall-journey-and-account-bound-admission.md) — accepted, navigation continuity exception only.
- [0059: Paid admission renewal](0059-admission-renews-in-place.md) — accepted.
- `app-next/src/packages/updates/updates.ts`, `onboarding/onboardingResume.ts`, `onboarding/lib/flow.ts`, `onboarding/lib/useOnboarding.ts`.
- `tools/excer/ota-lab/`, `tools/excer/checks/onboardingFlow.ts`.
- [Expo hold-and-reload guidance](https://expo.dev/blog/eas-update-best-practices).
- [Native startup check race](https://github.com/expo/expo/issues/21347).
- [Expo error recovery](https://docs.expo.dev/eas-update/error-recovery/).
- [Bluesky reload cover](https://github.com/bluesky-social/social-app/blob/main/src/lib/hooks/useOTAUpdates.ts).
