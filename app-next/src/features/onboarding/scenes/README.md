# scenes

Shared onboarding compositions. No state ownership or navigation; answers and actions come from the route.

TrendHero uses TrendCurves for the O15 reference composition: one smooth rising exercise curve, one dashed falling screen-time curve, endpoint labels with canonical icons, and a shared left-to-right animated reveal. Curves are illustrative SVG geometry rather than measured data; reduced motion reveals them immediately.

GoalIcon delegates to the canonical icon registry. ScreenTimeChoice is a raised range row with the same orange/white selection convention as other onboarding choices. O10 preserves the existing 3-hour default. Ranges save representative estimates (1/3/5/7/9 hours) for subsequent illustrative time math; older numeric answers select their containing range.
