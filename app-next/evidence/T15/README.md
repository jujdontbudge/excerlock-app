# T15 — motion pass

Implementation and native self-review are recorded here. **Gemini grading is DEFERRED by Johan's “continue with what you have till the end” instruction. No Gemini PASS is claimed.** Reference raw studies include known inaccurate observations; actual OtterLife strips, including OT00-M001 and the stable-control/sheet strips noted in each task's motion notes, are the visual reference.

Changes from the accessibility review: keep AM/PM with its number, stack permission badges at larger text sizes, remove repeated empty-state heroes, show Restore progress and rating feedback beside the action, and animate account action changes. Number/status changes keep stable accessible nodes while opacity and progress move on the UI thread.

`capture-final-flows.py` replays existing AX journeys and records normal-speed whole flows. `capture-micro-motion.py` records held presses, selection, slider, switch, swipe, chart, tab and sheet drag. The final accessibility correction recordings supplement T14. Generated recordings, AX trees, screenshots, timing JSON and logs remain local; review indexes are committed.

The first Conditions recording hit the tab bar while trying to tap a scrolled Add condition. This was a capture-driver error: the native AX tree exposed the offscreen button. `visible_tap.py` now scrolls controls clear of fixed chrome before tapping. The first attempt is retained separately; the successful rerun exercises create/edit/discard and native swipe.

Validation before acceptance-data changes: 412 tests / 112 suites / 14 snapshots passed; domain branch coverage 100%. TypeScript and lint passed. Red/green logs cover nonbreaking time labels and visible Restore progress.
