# T06 — Schedule, plan build, plan summary, review warm-up (S1–S4)

## Inputs

Mockups `final-schedule.png`, `final-loading.png`, `final-summary.png`, `final-review-v3.png`. AppBlock
replay 41 (`design/research/appblock-orange/reference/replay-41.png`) is the functional reference for the
combined days-and-times screen. Bible `10-onboarding.md` tail section. `01-product-model.md` §2 (schedule
validation), §4 (instances).

## Steps

1. S1 "When should blocking be active?": `DayPicker` (Mon–Fri pre-selected, shortcuts Weekdays / Every day),
   `TimeRangeRow` (9:00 AM → 9:00 PM pre-selected; tapping opens `SH-time` bottom sheet with the native wheel),
   "All day" switch that collapses the time row, live summary via `domain/scheduleLabel`. Errors: no days,
   window under 15 min. Cross-midnight is allowed and labeled ("8 PM–2 AM, ends next day").
   Tests: reducer for the schedule draft; rendered test for each error; label updates live.
2. S2 "Setting up your plan…": `Checklist` items animate in sequence (bible timing), then auto-advance. The
   items are real facts from the draft (activity, rule, days/times). No countdown, no fake analysis claims.
   Test: advances after the last check; Reduce Motion shortens to a single fade and still advances.
3. S3 "Your plan is ready": `PlanSummary` built from `toRule(draft, schedule)` and `ruleName` /
   `scheduleLabel`; rows: Activity & goal, Days & times, "Unlocks your apps for the rest of the day" (or
   "Apps stay open while you walk"). Each row's Edit navigates to the owning screen with `returnTo: S3`; the
   flow machine supports that jump-and-return. CTA "Use this plan" commits the rule into `rulesStore` (this is
   the moment the first rule exists) and marks the onboarding rule step done.
   Tests: summary text matches every branch's draft; Edit→return keeps other answers; commit writes one rule.
4. S4 "Help us make ExcerLock better": five star targets (44 pt), helper, Continue / Not now. Stores the
   rating locally (`profileStore.warmupRating`), no store prompt in Phase 1. Test: both paths advance.
5. Evidence, bible checklist, XL screenshots for S1 and S3.

## Acceptance

- [ ] Fresh → walking → S1 → S2 → S3 → S4 works; the committed rule is visible in `rulesStore` and later in
      Conditions (T10).
- [ ] Cross-midnight window accepted and labeled; `window-crosses-midnight` scenario shows the label.
- [ ] Edit-and-return works for at least: goal (W3), place (W1), schedule (S1).
