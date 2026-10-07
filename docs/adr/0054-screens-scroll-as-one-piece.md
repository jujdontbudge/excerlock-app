---
status: accepted
date: 2026-09-30
---

# 0054: Screens scroll as one piece

## Decision

Every screen is one vertically scrolling page. Its title, back or close control, content and bottom actions move and rubber-band together, including when the page fits on screen. One exception: the schedule page ("When should blocking be active?") does not move when it fits, because its dial is dragged. The dial shrinks to fit the page, down to 80% of its size, and a drag that starts on the dial's ring never scrolls the page (owner's request, 2026-10-06). `ScreenShell` provides this behavior by default and keeps safe-area space inside the page. The bottom tab bar and sheets or popups presented over a screen remain pinned.

## Context

Screens previously split their header, middle content and footer into separate layers. Back and close controls stayed at the top and actions floated at the bottom while the middle slid underneath them. The Paywall already used an opt-in `ScreenShell` path that put all three regions in one scroll view, and that interaction was approved. Making the same path the shared default removes the split-page behavior from Settings, Onboarding, Setup, Condition editing, Unlock and one-off screens. Short pages need forced vertical bounce, measured pages need `scrollResetKey`, keyboard forms need focused-field scrolling, and tab pages still need clearance for the pinned tab bar.

## Consequences

- Dragging the page moves its navigation controls, content and actions together.
- A short page can be pulled and springs back; a long page reaches its final action with bottom safe-area space.
- `dock` reserves room for the pinned tab bar after the one-piece page padding is applied.
- Existing keyboard avoidance and focused-field scrolling remain shared `ScreenShell` behavior.
- Sheets, system-alert guides, notices and transient full-screen result overlays keep their overlay behavior.

## References

- `app-next/src/packages/ui/ScreenShell.tsx` (`bounce`), `app-next/src/packages/schedule/ScheduleDial.tsx`
- `app-next/src/packages/ui/UI-STYLE.md`
- `docs/audits/one-piece-scroll.md`
- [0053: Screens stay still and never show error or status text](0053-screens-stay-still-and-say-nothing.md) — **accepted**
