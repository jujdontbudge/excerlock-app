# Accessibility Large review

OS category: `accessibility-large` on the single iPhone 17 Pro simulator. Text honors the design-system scale caps; content grows vertically and scrolls. Each named capture has a matching AX JSON tree, and long screens also have a scrolled image. Default and maximum-size spot checks from T04–T13 remain supplemental evidence.

## Reviewed so far

- O01–O20: reviewed both first viewport and scrolled content in `xl-intro-review-01.png` and `02.png`. No clipped footer CTA. Long questions, answer lists and explanatory screens scroll; the slider remains reachable below its metric. O04 keeps the name field and Continue above the keyboard. Some decorative hero content scrolls out of view while editing, as expected.
- VoiceOver source/tree order on onboarding: header/back and progress, screen title/support, inputs or choices, Continue. Decorative icon/diagram internals are hidden; native input and slider values are named.

The remaining branch/setup/tab/sheet capture groups are recorded by `scripts/capture-accessibility.py`. Final results are appended after inspection.

A retained-scroll regression was found in the walking-state branch. The original shared ScrollView had no step-change reset, so scrolling a long form could carry into its next step. Diagnostic AX trees preserve the scrolled W2 state; the reset is implemented at the container boundary. A scrolled selection itself is not evidence of clipping. Tabs still retain scroll position.

Walking W1/W2/W3 and both walking modes: reviewed `xl-walking-review-01.png`. Selected choices can remain scrolled into view; the top of the heading may then be above the viewport, which is expected scrolling rather than text clipping. Step changes now explicitly reset to the top. The numeric goal, units, two-line increment buttons, validation area, and Continue remain readable and reachable.

Gym G1/G2, running R1/R2/distance, biking B1/B2/distance: reviewed grouped contact sheets. Selection support wraps cleanly; goal/unit fields and all preset buttons remain readable. Both modes per activity are reachable, and arrival correctly skips G2. Footer Continue remains at least 54 pt. Some contact-sheet frames are deliberately scrolled and therefore crop the heading at the scroll boundary; paired unscrolled captures show the complete heading.

S1–S4, T1–T4, X1–X5 and all X3 branches: reviewed plan/trial/setup contact sheets. S2's incremental checks remain legible; schedule controls, summary editing, rating, trial timeline, denied-permission actions and setup checklist grow/scroll without overlap. Long schedule text wraps (a nonbreaking time suffix is a typography follow-up). Signed-in and email setup states were captured separately. No fixed footer was clipped or below 54 pt.

Home and Analytics: reviewed scenario/period contact sheets. Status and progress cards wrap vertically, unit/count labels remain readable, the tab bar remains available, and the scrolling content clears it. Analytics labels use wider horizontally scrollable chart columns at XL; missing usage is shown as gaps. The original no-rules top capture caught an unfinished native transition (AX tree contained only Application); the capture now waits for content and the corrected image was recorded in the sheet audit.

Native modal audit passed: opening check-in removes Home/Conditions/Analytics/Settings from the AX tree. Walking verifying/live/grace/summary, support keyboard/success, app picker and gym picker were captured at XL. Send remains above the keyboard and the input is scrolled into view. The sheet covers the tab bar with a full-app scrim.

Settings, legal and shield contact sheets were inspected. Legal paragraphs wrap and scroll, and the support keyboard is clear. One remaining XL typography issue is explicitly carried into T15: a horizontal permission badge squeezes Notifications into a mid-word wrap; stack its label and badge. Empty Analytics and Saved gyms also repeat a hero; simplify those in the final visual pass. These are review findings, not hidden passes.
