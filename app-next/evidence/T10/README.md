# T10 — Conditions and builder

Newest-first conditions share the one locked-app set. Pause changes Home immediately. Swipe reveals Delete with a confirmation; deletion removes only that condition and its progress/session. Creation covers all four activities and both gym modes. Editing starts at the summary, preserves identity and schedule, and cancels incomplete edits back to their prior snapshot. Dirty modal cancellation confirms before discarding.

## Verification

Failing-first builder tests and a rendered tab integration test pass. A second regression reproduced two retained builders sharing the same draft; each modal now owns a separate instance of the shared draft-store implementation. Full suite: 294 tests, 103 suites, 14 snapshots (includes the independently prepared Analytics model/screens). TypeScript and lint pass.

The final cold-launched native recording covers pause, swipe, delete confirmation/cancel, creating Bike 5 mi, editing to km, dirty cancel/keep, and saving. Normal and XL screenshots/AX trees were reviewed. A SafeAreaProvider at the native modal root fixes the zero-inset header. Gesture Handler ReanimatedSwipeable owns the native horizontal gesture. Native swipes need a fresh launch after gesture changes; do not judge a retained Fast Refresh instance.

## Motion

Reviewed Otter OT01-M006 and AppBlock replays 50/72. Conditions follow the stable, spaced goal rows; our newest-first list grows/reflows while the header and tabs remain stable. The hero floats above the fold, cards stagger in, switches acknowledge changes, and the delete plane follows the finger. The builder enters as a modal; the shared activity glyph remains mounted across branch questions, forms slide/fade, and save returns to the retained list. Reduced Motion keeps fades/final values. Gemini/human grading is deferred by the latest instruction.
