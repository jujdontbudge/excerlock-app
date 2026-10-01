---
status: accepted
date: 2026-09-30
---

# 0057: Permission answers precede Setup advancement; Screen Time and Locked apps have separate pages

## Decision

Setup, Home reminders and Condition editing use the same permission flow. Allow Screen Time requests only authorization; Choose apps to lock opens Apple's picker and retains its selection summary until Continue. If Screen Time is already granted, the flow starts with choosing apps. A refusal skips choosing apps and advances to the next Setup need. Both buttons in a drawn alert and the bottom action request the same real prompt.

The flow retains its current page until the awaited OS request completes. A synchronous guard suppresses repeated requests and navigation while the prompt or picker is open. Permission grants cannot remove the page underneath a pending prompt. While Using and the Always upgrade are distinct Location pages. A refused Always upgrade retains foreground Location access, advances, records `locationAlwaysAsked` in the existing Settings store, and subsequent attempts offer Settings instead of repeating a prompt iOS may no longer show. This additive field defaults to false on older installs; existing storage keys and versions remain unchanged.

Apple's Family Controls authorization cancellation is an answered refusal even when the native status remains notDetermined. The composition root supplies persisted denial memory to the Screen Time adapter; a later native grant takes precedence. Other request failures remain retryable errors. Gym selection is accessible during verified paid Setup as well as the main app.

## Context

ADR 0043 combined Screen Time authorization and app selection. Live Setup needs changed as soon as permission state changed, allowing the screen beneath an unresolved request to advance. Splitting authorization from selection makes Apple's two independent interactions understandable and keeps the picker summary reviewable. Public Opal guidance supports selecting a list, reviewing it, editing it, and saving explicitly; the research note distinguishes observed public guidance from unavailable recorded screens.

## Consequences

Permission answers advance automatically; choosing Locked apps requires an explicit Continue. Denied permissions remain actionable through Settings and Home reminders. The native picker exposes counts only, preserving opaque app identities. Demo scenarios establish fake account admission through the existing Journey verifier, so Home proofs do not bypass production route guards. An explicit dev-only native permission harness uses real OS requests and picker with fake Identity and Entitlement for repeatable simulator evidence.

## References

- [0043: Sign-in and permissions after the Paywall](0043-sign-in-and-permissions-after-the-paywall.md) — accepted; its combined `apps` page is replaced by this decision.
- [0053](0053-screens-stay-still-and-say-nothing.md) and [0054](0054-screens-scroll-as-one-piece.md) — accepted.
- [Research](../research/permission-app-selection.md).
- `app-next/src/packages/setup/SetupFlow.tsx`.
- GitHub issue [#152](https://github.com/JohanSardar/excerlock-app/issues/152): demo Home blocked by missing Journey admission; fixed in this change.
- Simulator evidence: `.excer/permissions-e2e/journey/index.md` and `proofs.md`.
