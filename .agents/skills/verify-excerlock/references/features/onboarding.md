---
id: onboarding
title: Onboarding questions and plan preview
routes: [onboarding/[step]]
scenarios: [fresh-install, onboarding-walking-resume, condition-demo-walk-steps, condition-demo-walk-minutes, condition-demo-walk-state-outside, condition-demo-walk-state-treadmill, condition-demo-gym-arrival, condition-demo-gym-presence, condition-demo-gym-minutes, condition-demo-girl-treadmill, onboarding-offer-a, onboarding-offer-b, onboarding-offer-a-full, onboarding-offer-b-full, onboarding-offer-unknown, onboarding-offer-late, onboarding-offer-error, onboarding-offer-malformed, onboarding-offer-ineligible, onboarding-offer-six-days, onboarding-offer-seven-days]
events: [onboarding_screen_viewed, onboarding_offer_exposed]
depends: [conditions]
---
## Sub-features
- Welcome (the Introduction pager with Get started and Sign in).
- Profile questions `O01`–`O24`, in the order given by `app-next/src/packages/onboarding/lib/flow.ts` `preBranch`. `O23` and `O24` ask for a target in pounds only when the corresponding body goal was chosen.
- The answer-driven branch: walking (`W*`) or gym (`G*`, including `GPlace` for the gym location). The goal and schedule steps show a live lock preview.
- Research `S4` immediately follows Import on `S3`, before the Condition demo `S3b`. Rating `S5` follows research only on runtimes 4 and 5; runtime 6 and later skip it and never ask for a review in onboarding. On runtimes 4 and 5, rating asks for the review prompt one second into every visit and keeps Continue locked until that request finishes; demo `--prompt ask` forwards to the real StoreKit prompt.
- Tail steps `S1`–`S3d`: summary, plan build, the Condition demo `S3b`, Before and After `S3e`, the trial preview `S3c` and reminder `S3d` (which asks for notifications) in A, then `P`, the paywall. Adapty arm B skips exactly `S3c` and `S3d`. A with a known unavailable intro offer skips their promises while remaining A.
- Before and After `S3e` follows the Condition demo and remains in both offer arms, even when trial screens are skipped. Two overlapping cards: a grey Before card under a rain cloud (the character slumped on a sofa, scrolling; a girl with a ponytail when the gender answer is Female, otherwise the boy) and a peach After card under a sun with sparkles (flexing with a dumbbell for gym, walking with a thumbs up for walking). The first Before line follows the body goal: lose weight, build muscle, get in shape (both) or hit fitness goals (maintain or none); the second After line follows the activity. The Before card and its lines slide in, the arrow and After card pop in about a second later, then its lines follow with a light tick each. Reduce Motion fades everything in and keeps the cloud, sun and sparkles still. The art is generated, see `app-next/assets/onboarding/before-after/provenance/PROVENANCE.md`.
- The PostHog `onboarding_variant` payload may reorder or drop other bundled steps. Adapty owns `S3c`/`S3d` inclusion and retains `S3e`; it never changes the Condition branch.
- Answers persist as they change, and a relaunch resumes on the same step.

## How to get to it (user POV)
Install the app and tap Get started. Every Continue moves to the next `onboarding/<step>`.

## Driving it with excer
Use `./excer demo fresh-install --open /`, then `./excer sim tap "Get started"`. To land on a specific step, open it directly: `./excer sim open /onboarding/O02`.

```proof
name: welcome
scenario: fresh-install
open: /
expect: HACK your brain to hit your fitness goals | Get started
```

- The intro headlines emphasize HACK on O01, MOVE on O02 and CUT on O03 with the brand orange; all other headline words stay in the primary text color.

```proof
name: intro-word-emphasis
scenario: fresh-install
open: /onboarding/O01
expect: HACK your brain to hit your fitness goals | Get started
then-open: /onboarding/O02
then-expect: Block apps. MOVE more. | Less scrolling. More moving. | Get started
```

```proof
name: intro-cut-emphasis
scenario: fresh-install
open: /onboarding/O03
expect: CUT your screen time in half | Less screens. More happiness. | Get started
```

```proof
name: resume-walking-goal
scenario: onboarding-walking-resume
open: /
expect: Set your walking goal | Daily step goal | Continue
```

```proof
name: body-goals-select-all
scenario: fresh-install
open: /onboarding/O22
expect: What are your body goals? | Select all that apply | Gain muscle | Lose fat | Maintain
```

- S1 fits on one screen and does not scroll. The dial shrinks to the space left, down to 80% of its full size; below that (small phones, large text) the page scrolls. A drag that starts on the dial's ring never scrolls the page.

```proof
name: schedule-dial
scenario: fresh-install
open: /onboarding/S1
expect: When should blocking be active? | Start at: 9 AM | End at: 9 PM | 12 hr | Continue
```

- After body goals, "What are you struggling with?" lists only the goals picked, as select all that apply, and continues with none selected. The answer (`struggles`) is not used elsewhere.

```proof
name: struggles-picked-goals
scenario: fresh-install
open: /onboarding/O22
tap: Gain muscle | Lose fat | Continue
expect: What are you struggling with? | Select all that apply | Gaining muscle | Losing fat | Continue
absent: Maintaining my weight
```

```proof
name: muscle-target-ruler
scenario: fresh-install
open: /onboarding/O22
tap: Gain muscle | Continue | Continue
expect: How many pounds of muscle do you want to gain? | 10.0 lb | Continue
```

```proof
name: fat-target-ruler
scenario: fresh-install
open: /onboarding/O22
tap: Lose fat | Continue | Continue
expect: How many pounds of fat do you want to lose? | 15.0 lb | Continue
```

```proof
name: both-body-targets
scenario: fresh-install
open: /onboarding/O22
actions: tap Gain muscle | tap Lose fat | tap Continue | tap Continue | tap Continue | expect How many pounds of fat do you want to lose? | open /onboarding/S3 | tap Add another Condition | tap Gym | tap Continue | tap Continue | tap Continue
expect: Projected results | Gain 10.0 lb of muscle | Lose 15.0 lb of fat | 150% more steps | 150% more time at the gym
```

```proof
name: projected-results
scenario: fresh-install
open: /onboarding/S3
expect: Projected results | 150% more steps | 50% less screen time
```

- Projected results can add more Conditions. "How it will look" introduces the Condition cards, then the centred "Projected results" heading introduces selected muscle-gain and fat-loss targets in pounds before the activity and screen-time results. "Add another Condition" runs the Condition builder without its gym-location and review steps; its close button returns to Projected results. Each added Condition shows as another card with a remove button, the stats cover every activity, and Import saves all of them after admission. The Condition demo shows only the first.

```proof
name: add-another-condition
scenario: fresh-install
open: /onboarding/S3
tap: Add another Condition | Gym | Continue | Continue | Continue
expect: Projected results | Your apps are blocked unless you are at the gym from 9 AM to 9 PM on weekdays | 150% more steps | 150% more time at the gym | 50% less screen time | Add another Condition
```

```proof
name: add-condition-close
scenario: fresh-install
open: /onboarding/S3
tap: Add another Condition | Close
expect: Projected results | Add another Condition | Import
absent: Remove Condition
```

```proof
name: plan-staged-before-admission
scenario: fresh-install
open: /onboarding/S3
tap: Import
expect: ExcerLock is built on research to HACK your brain | Continue
then-open: /dev
then-expect: Conditions | 0 | Onboarding plan | Staged
```

```proof
name: trial-preview-back
scenario: fresh-install
open: /onboarding/S3c
expect: Back | We want you to try ExcerLock Premium for free | Continue
```

```proof
name: trial-preview-back-action
scenario: fresh-install
open: /onboarding/S3c
tap: Back
expect: Become the best version of yourself | Before | After
```

```proof
name: before-after
scenario: fresh-install
open: /onboarding/S3e
open-wait: 2.5
expect: Back | Become the best version of yourself | Before: Struggling to hit fitness goals, Procrastinating exercise, High screen time, Worse mental health | After: Addicted to exercise, Walking every single day, Screen time under control, A brand new life | Continue
```

```proof
name: before-after-gym
scenario: condition-demo-gym-arrival
open: /onboarding/S3e
open-wait: 2.5
expect: After: Addicted to exercise, Consistent at the gym, Screen time under control, A brand new life | Continue
then-tap: Continue
then-expect: We want you to try ExcerLock Premium for free
```

```proof
name: before-after-girl-gym
scenario: before-after-girl-gym
open: /onboarding/S3e
open-wait: 2.5
expect: Before: Struggling to lose weight, Procrastinating exercise, High screen time, Worse mental health | After: Addicted to exercise, Consistent at the gym, Screen time under control, A brand new life
```

```proof
name: before-after-girl-walk
scenario: before-after-girl-walk
open: /onboarding/S3e
open-wait: 2.5
expect: Before: Struggling to build muscle, Procrastinating exercise, High screen time, Worse mental health | After: Addicted to exercise, Walking every single day, Screen time under control, A brand new life
```

The girl scenarios resume at `S3e` with gender Female; their screenshots show the girl figures, and the lines prove the body-goal and activity wording.

The character follows the gender answer everywhere it appears: the loop story (O16 to O18) and the Condition demo `S3b` show the girl with a ponytail when the answer is Female, otherwise the boy. She uses the boy's poses, positions and timing, with the phone in hand outdoors and hands free on the treadmill. The art is generated, see `app-next/assets/condition-demo/provenance/PROVENANCE.md`. These proofs set gender Female; their screenshots show the girl.

```proof
name: loop-story-girl
scenario: before-after-girl-walk
open: /onboarding/O16
expect: You’re stuck in a loop | Scrolling is the habit | Continue
then-open: /onboarding/O18
then-expect: You become ADDICTED to exercise | Continue
```

```proof
name: demo-girl-walk
scenario: before-after-girl-walk
open: /onboarding/S3b
expect: Once you hit 10,000 steps, your apps will unlock. | Continue
```

```proof
name: demo-girl-treadmill
scenario: condition-demo-girl-treadmill
open: /onboarding/S3b
expect: Once you start walking, your apps will unlock. | Hold to walk | Continue
```

```proof
name: before-after-back
scenario: fresh-install
open: /onboarding/S3e
tap: Back
expect: Once you hit 10,000 steps, your apps will unlock. | Continue
```

```proof
name: walking-minutes-entry
scenario: onboarding-walking-resume
open: /onboarding/W2
tap: Walk for a set time | Continue
expect: Set your walking goal | Daily walking time | minutes
```

```proof
name: profile-name-entry
scenario: fresh-install
open: /onboarding/O04
expect: What should we call you? | First name
```

Haptics follow the flow's events, and the dev menu's "Haptics log" is the simulator's evidence:
- A choice changing sends `select`. Continue sends `tap`, or `commit` when the plan is saved on S3.
- The impact story (O11 to O14) and O15 play one `beat` each.
- The loop story plays `lock` on O17 and `success` on O18.
- S2 ticks each task, then the "Plan created" badge plays `success`.
- The Condition demo plays lock, progress detents and unlock once per entry, never on its auto-loop.

The haptic proof watches the demo from its beginning; taps on the inert promise caption pace the proof.

```proof
name: choice-select-haptic
scenario: fresh-install
open: /onboarding/O22
tap: Gain muscle
expect: Gain muscle | Continue
then-open: /dev
then-expect: Haptics log | Haptic select
```

```proof
name: plan-commit-haptic
scenario: fresh-install
open: /onboarding/S3
tap: Import
expect: Once you hit 10,000 steps
then-open: /dev
then-expect: Haptics log | Haptic commit
```

```proof
name: demo-unlock-haptic
scenario: condition-demo-walk-steps
open: /onboarding/S3b
tap: Once you hit 10,000 steps | Once you hit 10,000 steps | Once you hit 10,000 steps
expect: Once you hit 10,000 steps | Continue
then-open: /dev
then-expect: Haptics log | Haptic unlock | Haptic lock
```

The Condition demo's Continue stays disabled until the goal or state change plays, which takes under three seconds for every Condition. These scenarios resume at `S3b` with each kind of Condition; the videos and timed button-state evidence are indexed in `.excer/demo-3s/index.md`.

```proof
name: demo-walk-steps-gated
scenario: condition-demo-walk-steps
open: /onboarding/S3b
open-wait: 0.5
tap: Continue
expect: Once you hit 10,000 steps | Continue
then-tap: Continue
then-expect: Become the best version of yourself
```

```proof
name: demo-walk-minutes-gated
scenario: condition-demo-walk-minutes
open: /onboarding/S3b
open-wait: 0.5
tap: Continue
expect: Once you walk for 20 minutes | Continue
then-tap: Continue
then-expect: Become the best version of yourself
```

```proof
name: demo-walk-state-outside-gated
scenario: condition-demo-walk-state-outside
open: /onboarding/S3b
open-wait: 0.5
tap: Continue
expect: Once you start walking | Continue
then-tap: Continue
then-expect: Become the best version of yourself
```

```proof
name: demo-walk-state-treadmill-gated
scenario: condition-demo-walk-state-treadmill
open: /onboarding/S3b
open-wait: 0.5
tap: Continue
expect: Once you start walking | Continue
then-tap: Continue
then-expect: Become the best version of yourself
```

```proof
name: demo-gym-arrival-gated
scenario: condition-demo-gym-arrival
open: /onboarding/S3b
open-wait: 0.5
tap: Continue
expect: Once you arrive at the gym | Continue
then-tap: Continue
then-expect: Become the best version of yourself
```

```proof
name: demo-gym-presence-gated
scenario: condition-demo-gym-presence
open: /onboarding/S3b
open-wait: 0.5
tap: Continue
expect: While you're at the gym | Continue
then-tap: Continue
then-expect: Become the best version of yourself
```

```proof
name: demo-gym-minutes-gated
scenario: condition-demo-gym-minutes
open: /onboarding/S3b
open-wait: 0.5
tap: Continue
expect: Once you spend 30 minutes | Continue
then-tap: Continue
then-expect: Become the best version of yourself
```

The Bank Condition's demo is the same stage with "You walk" (gym: "You go to the gym") over the character and "You buy screen time" over the phone. Points tokens arc into the phone's Points pill, the 3 h Offer is bought, Points roll down, a "+3 h" chip fills the Bank, then the Shop lifts to the open app with one confetti burst and the unlock haptic: 6.4 s per loop. Walking earns only while Hold to walk is held once the person has held it. A Bank plan plays it at S3b in the real flow; for frozen frames use `dev?stage=bank-demo` (`&activity=gym`, `&cast=girl`); `demoTime`/`demoPause` freeze a frame. These proofs freeze the settled reward state, a full Bank after the purchase (ADR 0080). Videos and key frames: `.excer/bank-demo/`.

```proof
name: demo-bank-walk
scenario: fresh-install
open: dev?stage=bank-demo&demoTime=4.2&demoPause=1
open-wait: 2.5
expect: Your steps earn Points. Points buy screen time. | Hold to walk
absent: Uncaught (in promise | LogBox
```

```proof
name: demo-bank-gym
scenario: fresh-install
open: dev?stage=bank-demo&activity=gym&demoTime=4.2&demoPause=1
open-wait: 2.5
expect: Gym minutes earn Points. Points buy screen time.
absent: Hold to walk
```

```proof
name: research-after-import
scenario: fresh-install
open: /onboarding/S3
tap: Import
expect: ExcerLock is built on research | HACK | University of Oxford | Harvard University | University of Cambridge | No shame, no punishment | Continue
then-tap: Continue
then-expect: Once you hit 10,000 steps
```


The offer proofs use the real Adapty adapter over the scripted SDK. They start at Import, follow research/rating/demo and Before and After, then capture each rendered trial step and checkout. They prove UI and SDK request/handle isolation, not StoreKit receipts.

```proof
name: offer-a-three-days
scenario: onboarding-offer-a
open: /onboarding/S3
actions: tap Import | expect ExcerLock is built on research | tap Continue | expect Once you hit 10,000 steps | expect Once you hit 10,000 steps | tap Continue | expect Become the best version of yourself | tap Continue | expect 3-day free trial | tap Continue | expect 1 day before your trial ends | expect Day 2 · Reminder | expect Day 3 · Billing begins | tap Continue
expect: 3-day free trial, then $39.99/year | Continue
then-open: /dev
then-expect: onboarding_offer_exposed {"arm":"a","assigned_arm":"a","source":"adapty","intro_offer":"available","variation_id":"offer-a"} | lab_offer_audience {"version":1} | lab_paywall_shown {"variation":"offer-a"}
wait: 20
```

```proof
name: offer-b-no-trial
scenario: onboarding-offer-b
open: /onboarding/S3
actions: tap Import | expect ExcerLock is built on research | tap Continue | expect Once you hit 10,000 steps | expect Once you hit 10,000 steps | tap Continue | expect Become the best version of yourself | tap Continue
expect: Billed as $39.99/year | Continue | Yearly $39.99/year · $0.77 / week | Monthly $9.99/month · $2.31 / week
absent: Free trial | Enable free trial | free trial | trial ends | No payment due now
then-open: /dev
then-expect: onboarding_offer_exposed {"arm":"b","assigned_arm":"b","source":"adapty","intro_offer":"unavailable","variation_id":"offer-b"} | lab_flow {"placement":"onboarding_no_trial","attempt":1,"ok":true} | lab_paywall_shown {"variation":"offer-b"}
wait: 20
```

```proof
name: offer-b-killed-shows-a
scenario: onboarding-offer-b-killed
open: /onboarding/S3
actions: tap Import | expect ExcerLock is built on research | tap Continue | expect Once you hit 10,000 steps | expect Once you hit 10,000 steps | tap Continue | expect Become the best version of yourself | tap Continue | expect 3-day free trial | tap Continue | expect 1 day before your trial ends | expect Day 2 · Reminder | expect Day 3 · Billing begins | tap Continue
expect: 3-day free trial, then $39.99/year | Continue
then-open: /dev
then-expect: onboarding_offer_exposed {"arm":"a","assigned_arm":"b","source":"adapty","intro_offer":"available","variation_id":"offer-a"} | lab_paywall_shown {"variation":"offer-a"}
wait: 20
```

```proof
name: offer-a-intro-ineligible
scenario: onboarding-offer-ineligible
open: /onboarding/S3
actions: tap Import | expect ExcerLock is built on research | tap Continue | expect Once you hit 10,000 steps | expect Once you hit 10,000 steps | tap Continue | expect Become the best version of yourself | tap Continue
expect: Billed as $39.99/year | Continue
absent: Free trial | Enable free trial | free trial | trial ends
then-open: /dev
then-expect: onboarding_offer_exposed {"arm":"a","assigned_arm":"a","source":"adapty","intro_offer":"unavailable","variation_id":"offer-a"}
wait: 20
```

```proof
name: offer-unknown-falls-back
scenario: onboarding-offer-unknown
open: /onboarding/S3
actions: tap Import | expect ExcerLock is built on research | tap Continue | expect Once you hit 10,000 steps | expect Once you hit 10,000 steps | tap Continue | expect Become the best version of yourself | tap Continue | expect 3-day free trial | tap Continue | expect 1 day before your trial ends | expect Day 2 · Reminder | expect Day 3 · Billing begins | tap Continue
expect: 3-day free trial, then $39.99/year | Continue
then-open: /dev
then-expect: onboarding_offer_exposed {"arm":"a","assigned_arm":"a","source":"fallback","intro_offer":"unknown"} | lab_paywall_shown {"variation":"offer-fallback"}
wait: 20
```

```proof
name: offer-late-falls-back
scenario: onboarding-offer-late
open: /onboarding/S3
actions: tap Import | expect ExcerLock is built on research | tap Continue | expect Once you hit 10,000 steps | expect Once you hit 10,000 steps | tap Continue | expect Become the best version of yourself | tap Continue | expect 3-day free trial | tap Continue | expect 1 day before your trial ends | expect Day 2 · Reminder | expect Day 3 · Billing begins | tap Continue
expect: 3-day free trial, then $39.99/year | Continue
then-open: /dev
then-expect: onboarding_offer_exposed {"arm":"a","assigned_arm":"b","source":"fallback","intro_offer":"unknown"} | lab_paywall_shown {"variation":"offer-fallback"} | lab_late_offer_returned {"arm":"b"}
wait: 20
```

```proof
name: offer-error-falls-back
scenario: onboarding-offer-error
open: /onboarding/S3
actions: tap Import | expect ExcerLock is built on research | tap Continue | expect Once you hit 10,000 steps | expect Once you hit 10,000 steps | tap Continue | expect Become the best version of yourself | tap Continue | expect 3-day free trial | tap Continue | expect 1 day before your trial ends | expect Day 2 · Reminder | expect Day 3 · Billing begins | tap Continue
expect: 3-day free trial, then $39.99/year | Continue
then-open: /dev
then-expect: onboarding_offer_exposed {"arm":"a","assigned_arm":"a","source":"fallback","intro_offer":"unknown"} | lab_paywall_shown {"variation":"offer-fallback"}
wait: 20
```

```proof
name: offer-malformed-falls-back
scenario: onboarding-offer-malformed
open: /onboarding/S3
actions: tap Import | expect ExcerLock is built on research | tap Continue | expect Once you hit 10,000 steps | expect Once you hit 10,000 steps | tap Continue | expect Become the best version of yourself | tap Continue | expect 3-day free trial | tap Continue | expect 1 day before your trial ends | expect Day 2 · Reminder | expect Day 3 · Billing begins | tap Continue
expect: 3-day free trial, then $39.99/year | Continue
then-open: /dev
then-expect: onboarding_offer_exposed {"arm":"a","assigned_arm":"a","source":"fallback","intro_offer":"unknown"} | lab_paywall_shown {"variation":"offer-fallback"}
wait: 20
```

```proof
name: offer-duration-from-storekit
scenario: onboarding-offer-six-days
open: /onboarding/S3c
actions: expect 6-day free trial | tap Continue | expect 1 day before your trial ends | expect Day 5 · Reminder | expect Day 6 · Billing begins | tap Continue
expect: 6-day free trial, then $39.99/year | Continue
```

```proof
name: offer-current-week-before-asc-change
scenario: onboarding-offer-seven-days
open: /onboarding/S3c
actions: expect 7-day free trial | tap Continue | expect 1 day before your trial ends | expect Day 6 · Reminder | expect Day 7 · Billing begins | tap Continue
expect: 7-day free trial, then $39.99/year | Continue
```


The complete-onboarding proofs start at Welcome with scripted answers, then drive every production step without a route jump. All StoreKit calls remain scripted.

```proof
name: offer-a-complete-onboarding
scenario: onboarding-offer-a-full
open: /onboarding/O01
actions: tap Get started | tap Get started | tap Get started | tap Continue | tap Continue | tap Continue | tap Continue | tap Continue | tap Continue | tap Continue | tap Continue | tap Continue | expect quick math | expect quick math | tap Continue | expect This is how much time you spend scrolling | expect This is how much time you spend scrolling | expect This is how much time you spend scrolling | tap Continue | tap Continue | tap Continue | tap Continue | tap Continue | expect What exercise do you want to do more of? | tap Continue | expect How many steps do you walk per day currently? | tap Continue | tap Continue | tap Continue | tap Continue | expect When should blocking be active? | tap Continue | expect Import | tap Import | expect ExcerLock is built on research | tap Continue | expect Once you hit 10,000 steps | expect Once you hit 10,000 steps | tap Continue | expect Become the best version of yourself | tap Continue | expect 3-day free trial | tap Continue | expect 1 day before your trial ends | expect Day 2 · Reminder | expect Day 3 · Billing begins | tap Continue
expect: 3-day free trial, then $39.99/year | Continue
then-open: /dev
then-expect: onboarding_offer_exposed {"arm":"a","assigned_arm":"a","source":"adapty","intro_offer":"available","variation_id":"offer-a"} | lab_offer_audience {"version":1} | lab_paywall_shown {"variation":"offer-a"}
wait: 20
```

```proof
name: offer-b-complete-onboarding
scenario: onboarding-offer-b-full
open: /onboarding/O01
actions: tap Get started | tap Get started | tap Get started | tap Continue | tap Continue | tap Continue | tap Continue | tap Continue | tap Continue | tap Continue | tap Continue | tap Continue | expect quick math | expect quick math | tap Continue | expect This is how much time you spend scrolling | expect This is how much time you spend scrolling | expect This is how much time you spend scrolling | tap Continue | tap Continue | tap Continue | tap Continue | tap Continue | expect What exercise do you want to do more of? | tap Continue | expect How many steps do you walk per day currently? | tap Continue | tap Continue | tap Continue | tap Continue | expect When should blocking be active? | tap Continue | expect Import | tap Import | expect ExcerLock is built on research | tap Continue | expect Once you hit 10,000 steps | expect Once you hit 10,000 steps | tap Continue | expect Become the best version of yourself | tap Continue
expect: Billed as $39.99/year | Continue | Yearly $39.99/year · $0.77 / week | Monthly $9.99/month · $2.31 / week
absent: Free trial | Enable free trial | free trial | trial ends | No payment due now
then-open: /dev
then-expect: onboarding_offer_exposed {"arm":"b","assigned_arm":"b","source":"adapty","intro_offer":"unavailable","variation_id":"offer-b"} | lab_flow {"placement":"onboarding_no_trial","attempt":1,"ok":true} | lab_paywall_shown {"variation":"offer-b"}
wait: 20
```

Closing the onboarding Paywall returns to the step before it with every answer kept, never to Welcome.

```proof
name: offer-a-paywall-close-returns-reminder
scenario: onboarding-offer-a-full
open: /onboarding/S3d
actions: expect 1 day before your trial ends | tap Continue | expect 3-day free trial, then $39.99/year | tap Close
expect: 1 day before your trial ends | Continue
absent: Get started
then-open: /dev
then-expect: Journey onboarding | Protected route mounts | None
```

```proof
name: offer-b-paywall-close-returns-before-after
scenario: onboarding-offer-b-full
open: /onboarding/S3e
actions: expect Become the best version of yourself | tap Continue | expect Billed as $39.99/year | tap Close
expect: Become the best version of yourself | Continue
absent: Get started
then-open: /dev
then-expect: Journey onboarding | Protected route mounts | None
```

## Gotchas
- Rating `S5` exists only on runtimes 4 and 5; development builds and runtime 6 skip it. The native rating sheet needs StoreKit services: use `simslim --except family,store` for this proof device. Demo `--prompt ask` forwards to the native port, while default demo proofs use its logged fake. StoreKit exposes no accessibility labels here; screenshot the real sheet. Submit is disabled in a development build.
- The install-scoped rating gate survives scenario resets and account changes. Re-entry must not request again; inspect the dev analytics log for one `review_requested`.
- Onboarding imports no real permission, analytics or purchase SDK. Input and output go only through runtime ports, and copy lives in `src/content`.
- The notification ask sits on `S3d`, before the paywall. Every other permission is asked in setup, after the paywall (ADR 0043).
- Step ids are persisted, so renaming one breaks resume for installs already in the field.

- The Adapty offer is prefetched without awaiting a first frame and freezes before the trial tail. `trial: false` plus exactly the approved twins is B; a missing flag or unavailable intro is not B. A delayed B response is discarded, and checkout loads `onboarding_trial_fallback` once for A. A resumed S3c/S3d keeps A. See ADR 0078.
