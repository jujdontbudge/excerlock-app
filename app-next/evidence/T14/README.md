# T14 — accessibility verification

Source lint requires explicit native control roles and names. The rendered audit traverses all 72 preview variants, all 24 scenario entry screens, and the other three main tabs, asserting labels, numeric adjustment semantics, and progress ranges. Number fields expose units, bounds and correct increments. Six implicit Switch roles were made explicit.

Native evidence is split into `xl/` (Accessibility Large) and `reduced/` (OS Reduce Motion plus normal text). `capture-accessibility.py` covers O01–O20, all activity branches, schedule/summary/trial/paywall, setup, tabs, settings subpages and shield causes. `capture-a11y-sheets.py` covers modal focus isolation, walking states, live unlock, support keyboard, pickers and additional Home states. Read `xl-review.md` and `motion-notes.md` for the actual review and corrections.

Native trees and screenshots are supplemental to the source/rendered audit. No spoken VoiceOver recording or Gemini grade is claimed; focus order is inspected through the iOS accessibility tree as specified. Generated PNG/JSON/MP4 and logs remain local.

Checks: 410 tests in 112 suites and 14 snapshots passed. Coverage is 100% of domain branches (all-source coverage is reported in `final-coverage.log`). TypeScript and ESLint passed. Expo Doctor passed 21/21 checks, Expo dependency versions are current for the SDK, and the iOS export succeeded. `native-a11y-audit.json` currently reports zero suspect unnamed controls across the exported XL trees.

Reduce Motion's O01→O02 transition was inspected at 12 fps in `reduced-fade-review.png`: intermediate opacity frames are present, with no spatial translation. Full branch/setup/tab/sheet recordings complete the native fallback review.

Reviewed native Reduced Motion contact frames across onboarding, activity/goal selection, plan/paywall, setup, Home, Analytics, Settings and session sheets. The deliberate fade retains intermediate opacity, and stable controls remain usable. See the explicitly carried-forward XL typography and repeated-hero findings in `xl-review.md`; T15 fixes and recaptures them.
