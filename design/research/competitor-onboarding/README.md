# Fitness and screen-time onboarding research

Source: ScreensDesign MCP, queried 2026-09-05. Revenue and download estimates are for August 2026. The ranking metric is estimated monthly revenue divided by estimated monthly downloads. Apps had to have at least $50,000 in estimated monthly revenue and a complete recorded onboarding flow in ScreensDesign.

## Fitness motivation

These apps encourage healthy action through motivation, accountability, habits, or gamification. Calorie trackers, meal loggers, workout-plan apps, and exercise-instruction apps were excluded.

| Rank | App | Revenue | Downloads | Revenue/download | Onboarding screens |
|---:|---|---:|---:|---:|---:|
| 1 | DAWG — Discipline & Motivation | $200,000 | 50,000 | $4.00 | 46 |
| 2 | Lock In — Reset Your Life | $150,000 | 65,000 | $2.31 | 42 |
| 3 | OtterLife — AI Health Tracker | $150,000 | 150,000 | $1.00 | 43 |

## Fitness locking / screen time

These apps create friction before distracting-app access and include physical activity, healthy habits, or embodied interventions as an unlock mechanic.

| Rank | App | Revenue | Downloads | Revenue/download | Onboarding screens |
|---:|---|---:|---:|---:|---:|
| 1 | one sec — screen time + focus | $100,000 | 45,000 | $2.22 | 20 |
| 2 | Unrot — Earn your Screen Time | $65,000 | 35,000 | $1.86 | 51 |
| 3 | Blank Spaces Launcher | $100,000 | 55,000 | $1.82 | 23 |

Opal and AppBlock are included on the Figma board as broader high-revenue blocker references, but they are not ranked in the exact fitness-lock cohort. Push to Scroll did not have a qualifying ScreensDesign market record with both the $50,000 revenue threshold and a recorded onboarding flow, so it could not be ranked or reproduced from this source.

`screens.tsv` and `fitness-lock/screens.tsv` preserve source screen IDs, order, timestamps, image URLs, and local paths. `contact-sheets/` contains the Figma-ready boards.

## Red-selection onboarding synthesis

`selected-onboarding-flow/excerlock-red-selected-onboarding-flow.svg` contains the 36 screens touched by the red review annotations. It reads left to right across 31 proposed ExcerLock onboarding steps. Chronological screens remain separate horizontal steps; only screens that communicate essentially identical information are stacked as alternatives. `selected-onboarding-flow/selection-manifest.json` preserves the source app, original screen sequence, step, and stack position for every selected screen. Rebuild both files with `node build-selected-onboarding-flow.mjs`.

`selected-onboarding-flow/excerlock-complete-source-onboarding-flows.svg` combines all eight full competitor onboardings into one reference board, with one chronological horizontal row per app. Rebuild it with `node build-full-onboarding-reference-board.mjs`.

`selected-onboarding-flow/excerlock-proposed-onboarding-blueprint-v3.svg` is the proposed ExcerLock journey: a single horizontal main flow, four activity-specific branches, a shared scheduling and reward path, personalization, review, and OtterLife-inspired trial/paywall screens. Existing-app screens are labeled references; original ExcerLock concepts are intentionally rough Family-D text outlines. Rebuild it with `node build-excerlock-proposed-flow.mjs`.

`selected-onboarding-flow/excerlock-proposed-onboarding-v3.excalidraw` is the portable Excalidraw board. It embeds the complete SVG and requires no browser automation or external image paths. Rebuild it after the SVG with `node build-excerlock-excalidraw.mjs`.
