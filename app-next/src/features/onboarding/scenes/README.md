# scenes

Shared onboarding compositions. No state ownership or navigation; answers and actions come from the route.

O16–O18 share one persistent 360×500 HabitLoop built from fixed center anchors. Continue fades the four-arrow ring, relocates the original four nodes over 400 ms, and starts the persistent heading, node, icon, and center-copy crossfade on the same 100 ms beat. The ExcerLock mark enters horizontally after 400 ms, then the runner rises into place after 600 ms. The six-arrow ring follows after the old ring is gone, and no semantic layer is unmounted mid-transition. LoopBrandMark uses the canonical transparent, single-orange raster in `assets/running-lock-primary.png`. Reduced motion shows the final state immediately.

HabitLoop follows the user's circular references with symmetric clockwise SVG connectors and tangent arrowheads. Each stage has its own canonical icon; the center contains only the loop title. O16 uses bell/star/flame/phone for urge/reward/reinforcement/habit; O17/O18 introduce the running and ExcerLock marks without replacing the diagram. All text lives in `src/content/habitLoop.ts` and `src/content/loopIntervention.ts`. The illustration remains separate arrow, text, and icon components.

TrendHero uses TrendCurves for the O15 reference composition: one smooth rising exercise curve, one dashed falling screen-time curve, endpoint labels with canonical icons, and a shared left-to-right animated reveal. Curves are illustrative SVG geometry rather than measured data; reduced motion reveals them immediately.

GoalIcon delegates to the canonical icon registry. O10 preserves the existing 3-hour default and uses the
shared slider to persist exact 30-minute values from 1–12 hours for subsequent illustrative time math.
