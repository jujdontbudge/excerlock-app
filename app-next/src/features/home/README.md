# Home

Current silhouette follows the user’s September 7 inset-lock reference while preserving page width: body height 88% of width, corner radius 13%, shackle width 72%, exposed height 43.5%, and thickness 13%. Home shows the personalized greeting and date above the lock.

The Home schedule enables the shared card’s native lock silhouette: a full-width orange body with an 88pt shackle above it. The schedule occupies the first 154pt section; compact live progress sections below show only the bar and count, separated by white dividers. Repeated condition icons and titles are omitted inside the lock; progress bars retain accessible condition labels. Condition actions remain interactive and the separate duplicate condition list is hidden. Onboarding retains its original single card.

Home and onboarding share `BlockingScheduleCard`, the literal orange schedule card from `design/mockups/onboarding-orange/002-block-apps-preview.png`. Home supplies the selected rule’s actual time range, activity icon, and full unlock goal through `blockingSchedule`; its white timeline labels update with the rule. The lock decision selects the relevant rule for locked, upcoming, completed, and walking states. Unlocked state details remain below the card; empty, paused, and permission states retain their actionable status presentation. Overnight and all-day labels explicitly identify the next day.

Owns status presentation, per-condition progress, and the dashboard composition. Status and progress models are pure; a single app-level port subscription writes live progress into persisted RuleDays. The visual order follows Otter's dominant status, daily facts, then secondary actions. No screen owns fake counters or permission APIs.

Capture-only deep links `/home?steps=5000` and `/home?advance=3600000` update the existing Home instance so the live state transition remains visible. The regular dev menu also offers Add 1,000 steps, clock controls and Pause all conditions. These controls belong to the local Phase-1 runtime.

The state and progress snapshot tests live under `demo/__tests__` because feature modules must not import fake fixtures. Home itself depends only on ports, selectors and domain functions.
