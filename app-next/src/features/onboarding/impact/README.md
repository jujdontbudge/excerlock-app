# Scrolling impact sequence

Reference: [Unrot on ScreensDesign](https://screensdesign.com/apps/unrot-earn-your-screentime/?id=2334), current recording, 2:40–3:10. Observed the 31-second excerpt and half-second frame strips in `app-next/evidence/unrot-impact/`. The current video is 5:19 long; the page's current embedded recording is ID 3251 even though the provided URL query is 2334.

Observed sequence:

- 2:40–2:43: select 4–6 hours, press Continue. The following calculation uses five hours, the range midpoint.
- 2:43–2:49: outlined card enters. Daily estimate appears first, downward arrow and monthly total follow, then another arrow and yearly days. The conclusion appears below the card before Continue becomes available. Five hours yields 150 hours/month and 76 days/year.
- Around 2:53: Continue slides the math page out; a neutral grid representing one year appears.
- Around 2:56–2:58: most dots fade away, leaving a short band. The text crossfades to explain time remaining after sleep, work, and life admin. There is no user tap between these beats.
- Around 3:01–3:06: text changes to explain scrolling. Remaining dots color progressively in reading order. Scrolling and remaining free time use distinct colors.
- Around 3:07–3:10: concluding copy fades in, followed by Continue.

Implementation: O11 owns the staged math card. O12/O13/O14 keep a single mounted `ImpactDots` tree; stable indices preserve each dot's identity while opacity, scale, vertical position, and color transition. The title reserves its height to prevent the grid jumping when copy wraps. `useImpactPlayback` automatically advances O12/O13, gates O11/O14 Continue, and cancels pending navigation when the route loses focus or unmounts. The footer reserves space while hidden. Reduced motion reveals values immediately and provides manual Continue between the three dot beats.

Logic: days = rounded(hours × 365 / 24), month = hours × 30. Preserve ExcerLock's existing 8-hour daily free-time assumption (122 day-equivalents), which the reference does not disclose numerically. We state that assumption in the UI. Orange dots represent scrolling; peach dots are remaining free time. If scrolling exceeds this allowance, cap colored dots at 122 and explain the overflow; the numeric math still shows the actual estimate. This is illustrative fake-data onboarding, not measured device usage.

Geometry and controls use design tokens; timings live in `timing.ts`, copy in `src/content/impact.ts`, pure quantities in `model.ts`. This component uses existing RN/Reanimated APIs. Expo MCP documentation was attempted but its stored OAuth refresh token was rejected; no dependency or native build was added.
