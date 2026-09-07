# scenes

Shared onboarding compositions. No state ownership or navigation; answers and actions come from the route.

O16–O18 share one persistent HabitLoop. Continue moves the original four mounted nodes over 600 ms, slides the existing ExcerLock mark in after 240 ms, then the runner after 560 ms. Center copy fades to “Exercise becomes the habit.” All nodes are transparent; LoopArrows crossfades short circular connectors with tangent arrowheads and caption clearance. LoopBrandMark removes the existing raster’s white matte using an SVG alpha filter at render time. Reduced motion shows the final state immediately.

HabitLoop follows the user's four-stage circular references: four clockwise curved arrows pulse sequentially between native stage labels. Each stage has its own canonical icon; the center contains only the loop title. O16 uses bell/star/flame/phone for urge/reward/reinforcement/habit; O17/O18 use the same structure to introduce movement and unlocking. All text lives in `src/content/habitLoop.ts`. Reduced motion stops the circulating pulse. The illustration remains separate SVG arrows, text, and icon components.

TrendHero uses TrendCurves for the O15 reference composition: one smooth rising exercise curve, one dashed falling screen-time curve, endpoint labels with canonical icons, and a shared left-to-right animated reveal. Curves are illustrative SVG geometry rather than measured data; reduced motion reveals them immediately.

GoalIcon delegates to the canonical icon registry. ScreenTimeChoice is a raised range row with the same orange/white selection convention as other onboarding choices. O10 preserves the existing 3-hour default. Ranges save representative estimates (1/3/5/7/9 hours) for subsequent illustrative time math; older numeric answers select their containing range.
