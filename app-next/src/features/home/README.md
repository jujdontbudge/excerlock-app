# Home

Current silhouette follows the user’s September 7 inset-lock reference while preserving page width: body height 88% of width, corner radius 13%, shackle width 72%, exposed height 43.5%, and thickness 13%. Home shows the personalized greeting and date above the lock.

The Home schedule enables the shared card’s native lock silhouette: a full-width orange body with an 88pt shackle above it, lifted on the right when the day is unlocked. The card's slots are fixed — header glyph, status title, status subtitle, the rule sentence, the day timeline, a caption, then the condition rows — and the silhouette's aspect ratio becomes a minimum height once rows are stacked inside it, so nothing is clipped. `ConditionRow` renders one row per enabled rule scheduled today: icon, name and number on one line, its bar under it, the state `domain/conditionState` computes, and the zero to two unlock pills `unlockEntries` returns. An entry pill sits on its own rule's row, so a gym pill and a step-goal row appear together. Home renders no second condition list. Onboarding retains its original single card.

Home and onboarding share `BlockingScheduleCard`, the literal orange schedule card from `design/mockups/onboarding-orange/002-block-apps-preview.png`. Home supplies every window scheduled today through `blockingSchedule`, which projects the domain's `mergedLockIntervals` union onto the day's minutes so the timeline and the native monitors never disagree about schedule geometry; the window containing now is the bright one. The lock decision picks the rule whose sentence the card prints for locked, upcoming, completed, and walking states. Status title, subtitle and the resume line ride inside the card, so no state duplicates them below it; empty, paused, and permission states keep their actionable `StatusCard` presentation. Overnight and all-day labels explicitly identify the next day.

Owns status presentation, per-condition progress, and the dashboard composition. Status and progress models are pure; a single app-level port subscription writes live progress into persisted RuleDays. The visual order follows Otter's dominant status, daily facts, then secondary actions. No screen owns fake counters or permission APIs.

Capture-only deep links `/home?steps=5000` and `/home?advance=3600000` update the existing Home instance so the live state transition remains visible. The regular dev menu also offers Add 1,000 steps, clock controls and Pause all conditions. These controls belong to the local Phase-1 runtime.

The state and progress snapshot tests live under `demo/__tests__` because feature modules must not import fake fixtures. Home itself depends only on ports, selectors and domain functions.

The claim signal Home reads for the "Checking today's activity…" line lives in `claimState.ts`; it is a documented stub until P2-T05's progressSync exposes `lastClaimAt`.
