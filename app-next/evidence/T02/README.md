# T02 — Component foundation

36 contracted components, each with tests and two interactive gallery variants. 144 native screenshots cover both variants at normal and accessibility-large Dynamic Type; matching JSON files hold accessibility trees.

Validation: 43 Jest suites / 71 tests and token snapshot pass; Metro exclusion regression passes; typecheck, lint, Expo install check, Expo Doctor, and iOS export pass. See checks.log (local). Native build recorded in build.log.

Simulator inspection corrected compact chart labels at XL and track-tap behavior on the slider. sheet-drag.mp4 records partial-drag spring return, full dismissal, and reopening. slider-touch.mp4 verifies center tap = 6 and drag to end = 12. Sheet frame strip: sheet-drag-strip.png. These are local evidence, not Gemini grades.

Open excerlock://dev for the gallery. Copy is in src/content; authored SVG assets are indexed in assets/icons/FOUNDRY.md. No protected reference directory changed. Gemini reviews remain deferred by user instruction.
