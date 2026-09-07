# scenes

Shared onboarding compositions. No state ownership or navigation; answers and actions come from the route.

O16–O18 share one persistent 360×500 HabitLoop built from fixed center anchors. Continue first fades the four-arrow ring and relocates the original four nodes over 400 ms. The ExcerLock mark enters horizontally after 400 ms, then the runner rises into place after 600 ms. The six-arrow ring follows after the old ring is gone; persistent overlapping heading, node, and center layers crossfade after 900 ms so neither state is ever unmounted mid-transition. LoopBrandMark uses the canonical transparent, single-orange raster in `assets/running-lock-primary.png`. Reduced motion shows the final state immediately.

HabitLoop follows the user's circular references with symmetric clockwise SVG connectors and tangent arrowheads. Each stage has its own canonical icon; the center contains only the loop title. O16 uses bell/star/flame/phone for urge/reward/reinforcement/habit; O17/O18 introduce the running and ExcerLock marks without replacing the diagram. All text lives in `src/content/habitLoop.ts` and `src/content/loopIntervention.ts`. The illustration remains separate arrow, text, and icon components.

TrendHero uses TrendCurves for the O15 reference composition: one smooth rising exercise curve, one dashed falling screen-time curve, endpoint labels with canonical icons, and a shared left-to-right animated reveal. Curves are illustrative SVG geometry rather than measured data; reduced motion reveals them immediately.

GoalIcon delegates to the canonical icon registry. ScreenTimeChoice is a raised range row with the same orange/white selection convention as other onboarding choices. O10 preserves the existing 3-hour default. Ranges save representative estimates (1/3/5/7/9 hours) for subsequent illustrative time math; older numeric answers select their containing range.
