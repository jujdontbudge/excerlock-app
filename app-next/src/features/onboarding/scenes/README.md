# scenes

Shared onboarding compositions. No state ownership or navigation; answers and actions come from the route.

O16–O18 share one persistent `LoopScene` (360×420 design canvas, scaled to fit under the heading). The condition-demo character scrolls helplessly while orange tendrils run from a floating phone into his head (O16); ExcerLock locks the phone, the tendrils retract and he looks up (O17); the phone shrinks away and he walks over sliding ground dashes (O18). Continue changes one set of phase weights on the `emphasized` duration, so every element starts and stops together; one frame clock then drives only the idle loops (thumb flick, feed swipe, sway, walk cycle). Frames: `assets/condition-demo/frames/scroll-1..2.png` (provenance v3 in `condition-demo/gen/PROVENANCE.md`), `stand-ahead.png` and the phone-free walk cycle. Reduced motion holds each phase still.


TrendHero uses TrendCurves for the O15 reference composition: one smooth rising exercise curve, one dashed falling screen-time curve, endpoint labels with canonical icons, and a shared left-to-right animated reveal. Curves are illustrative SVG geometry rather than measured data; reduced motion reveals them immediately.

GoalIcon delegates to the canonical icon registry. ScreenTimeChoice is a raised range row with the same orange/white selection convention as other onboarding choices. O10 preserves the existing 3-hour default. Ranges save representative estimates (1/3/5/7/9 hours) for subsequent illustrative time math; older numeric answers select their containing range.
