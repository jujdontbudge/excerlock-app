# T04 — Onboarding O01–O20

Twenty pre-branch screens are implemented, with all branch paths already defined by the pure flow machine. Continue/Back updates the dynamic route parameter so the header persists. The three-state year grid and loop story preserve their component identity; headings and changing node content crossfade. Inputs persist immediately. Rehydration resumes the current step.

179 tests across 70 suites pass. Tests enumerate eight branch paths, exercise all 20 screens through the real Router, require answers on form steps, test fractional scrolling estimates and verify resumed selection. Typecheck, lint, Expo Doctor, install check and iOS export pass. Domain branch coverage remains enforced.

Local media: onboarding-O01-O20.mp4 records the full native journey to W1; O01–O20-default.png and matching JSON files show the final screen states. Empty-selection, long-name error, and XL O04/O10/O20 captures are included. Motion strips sample the video. The current headless simulator accepts focused text input but does not display the software keyboard; software-keyboard overlap inspection remains for T14, and is not claimed as passed here.

No real prompts or services are called. Other branch screens are added in T05/T05b; schedule/tail in T06–T07. Gemini grading remains deferred by user instruction.

XL inspection found and fixed a transition-wrapper sizing bug: the final slider now scrolls fully above the footer. xl-scroll-red.log and xl-scroll-green.log record the before/after accessibility frames; xl-scroll.mp4 and the scrolled PNGs verify the fix.
