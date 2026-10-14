---
status: proposed
date: 2026-10-14
---

# 0080: Reward motion is the one exception to still screens

## Decision

Screens stay still (ADR 0053) except for **reward motion**: the few designed moments where Points or Bank time visibly move because the user earned, bought or spent them. These are collecting earned Points, buying an Offer, the Bank filling, and starting or ending a Bank session. Reward motion shows a value travelling from where it came from to where it lands, then settles. It never carries status, never reports an error and never shifts the layout of anything else on the screen.

Everything else keeps ADR 0053: buttons keep their label while working, failures use `notify()`, and not having enough Points shows as a disabled Offer with what is missing, never red text. Motion that only decorates (bounces, wiggles, idle loops, confetti on routine taps) is not reward motion. Big celebration is kept for rare moments: the first Points, the first purchase and milestones. Routine earns get a single pulse. All reward motion goes through the `ui` motion hooks and tokens, collapses under Reduce Motion, and uses the haptics language (ADR 0056).

## Context

The Bank Condition (owner request, 2026-10-14) turns activity into Points and Points into screen time in a new Shop tab. The owner wants these moments vivid enough to film and share, but no unnecessary jumpy animation. ADR 0053 forbids anything moving because a button was pressed, which would forbid a purchase animation entirely.

Competitor research (Duolingo's gem shop and quest trail, Finch, Steppin, Unrot) shows the moments that read well on video are value flying into a counter and that counter rolling to its new number, while constant celebration reads as noise.

Alternatives: amend ADR 0053 per screen (every screen would argue for an exception), or keep the Shop still (loses the feature's point).

## Consequences

- The Shop, the Home Bank and the Bank session screens may animate value changes; reviews reject motion on them that is not a value change.
- Proofs for these moments assert the settled end state, not the frames.
- The Shield cannot animate, so every reward moment happens inside the app.

## References

- [0053: Screens stay still and never show error or status text](0053-screens-stay-still-and-say-nothing.md) — **accepted**; this ADR narrows it.
- [0056: One semantic haptics language](0056-semantic-haptics-language.md) — **proposed**.
- `app-next/src/packages/ui/useMotion.ts`, `ui/presets.ts`, `ui/TickingNumber.tsx`, `ui/Confetti.tsx`.
