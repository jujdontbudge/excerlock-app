---
id: onboarding
title: Onboarding questions and plan preview
routes: [onboarding/[step]]
scenarios: [fresh-install, onboarding-walking-resume]
events: [onboarding_screen_viewed]
depends: [conditions]
---
## Sub-features
- Welcome (the Introduction pager with Get started and Sign in).
- Profile questions `O01`–`O22`, in the order given by `src/onboarding/flow.ts` `preBranch`.
- The answer-driven branch: walking (`W*`) or gym (`G*`, including `GPlace` for the gym location). The goal and schedule steps show a live lock preview.
- Tail steps `S1`–`S3d`: summary, plan build, trial preview and the reminder (which asks for notifications), then `P`, the paywall.
- The PostHog `onboarding_variant` payload may reorder or drop steps within `preBranch` and `tail`. It never changes the branch.
- Answers persist as they change, and a relaunch resumes on the same step.

## How to get to it (user POV)
Install the app and tap Get started. Every Continue moves to the next `onboarding/<step>`.

## Driving it with excer
Use `./excer demo fresh-install --open /`, then `./excer sim tap "Get started"`. To land on a specific step, open it directly: `./excer sim open /onboarding/O02`.

```proof
name: welcome
scenario: fresh-install
open: /
expect: Block apps. Move more. | Less scrolling. More moving. | Get started
```

```proof
name: resume-walking-goal
scenario: onboarding-walking-resume
open: /
expect: Set your walking goal | Daily step goal | Continue
```

## Gotchas
- Onboarding imports no real permission, analytics or purchase SDK. Input and output go only through runtime ports, and copy lives in `src/content`.
- The notification ask sits on `S3d`, before the paywall. Every other permission is asked in setup, after the paywall (ADR 0043).
- Step ids are persisted, so renaming one breaks resume for installs already in the field.
