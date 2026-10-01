---
status: accepted
date: 2026-10-01
---

# 0056: Research and rating after the imported plan

## Decision

Persist new onboarding step IDs `S4` (research) and `S5` (rating), immediately after `S3` (Import), before `S3b`. Remote orders accept both IDs; when an order includes `S3`, the path normalizes these two steps immediately after it. An order that omits `S3` also omits these screens.

The rating screen requests the existing review port after 800 ms. A separate install-scoped store uses `excerlock-next.onboarding-rating-prompt.v1`, with `requested: boolean`. It waits for hydration and commits the attempt before calling StoreKit. It is outside account stores and scenario resets. Continue never waits for the prompt. An unavailable port does not consume the attempt; a failed request does. Native suppression remains Apple's decision.

## Context

Implemented with the screens in this change. No other screen currently requests the review port. The real runtime already wraps requests in its prompt-safety coordinator. Demo mode normally logs the request; `promptMode=ask` forwards through a native review port supplied by the composition root so simulator evidence can include the actual Apple sheet.

## Consequences

Existing IDs and analytics contracts remain stable. `onboarding_screen_viewed.screen` additionally accepts `research` and `rating`, without answer or health properties. Review copy, portraits and counts are placeholders in one file. University SVGs are monochrome approximations, not official marks or evidence of affiliation. Replace placeholder claims before release.

All screen regions, including Continue, scroll together under accepted ADR 0054. A long rating page reaches Continue after the reviews.

## References

- `app-next/src/packages/onboarding/lib/flow.ts`
- `app-next/src/packages/onboarding/lib/ratingPrompt.ts`
- `app-next/src/packages/onboarding/researchRatingCopy.ts`
- [0053: Screens stay still](0053-screens-stay-still-and-say-nothing.md) — accepted.
- [0054: Screens scroll as one piece](0054-screens-scroll-as-one-piece.md) — accepted.
