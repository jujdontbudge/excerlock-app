---
name: gym-unlock-bugs-165
description: "The 2026-10-03 gym failures (Chicago picker, hidden circle, dead \"I'm at the gym\" button, background detection off) — causes verified with Astra; fix plan in issue #165 awaiting Johan's go-ahead"
metadata:
  node_type: memory
  type: project
  originSessionId: 94f9b144-4a60-49b8-b663-76cca99ed25d
  modified: 2026-10-04T01:37:50.786Z
---

Johan hit four gym problems at UIUC on 2026-10-03. Issue #165 has the full plan.

Causes verified in code:
- The picker pin starts at a hard-coded Chicago `defaultCentre` and is never moved to the first location fix.
- `GymUnlockMap` hides the gym circle unless you're inside or tap the dumbbell.
- `useGymUnlock` trusts geofence presence only. Geofencing is off by default (`gymAutoDetect: false`), so the button silently re-reads location and does nothing.
- `GeofenceEventProcessor` forwards exits only.
- `AsyncStorageGymVisitLog` drops visits for gyms missing from the acceptance list.
- The simulator fake works out presence from live location, which is why the proofs passed while the phone failed.

The fix is all JS and OTA-safe. Evidence is in `.excer/gym-incident/`.

**Why:** Johan wants the gym unlock to work like a top consumer app: start where you are, show the way, always answer the button, and detect in the background by default.

**Built (2026-10-03):** Worker `thr_hc2x5ysa49` finished on branch `bb/gym-start-where-you-are-show-the-way-always-answ-thr_hc2x5ysa49`, commits c958e34a through c2022ba5. All 7 simulator proofs passed (report: docs/plans/gym-165-verification.md on that branch). Its simulator and Metro are deleted. It filed #166 (manual visits can count unobserved time after suspension). **Shipped 2026-10-04:** Johan said yes. The work is on main as 12d403d8..cf722456 plus fcf16c76, a proof fix: the picker proof had opened the picker before moving the simulator. Production OTA group 2c455837, tag ota-runtime4-20261004-fcf16c76. All 7 gym proofs passed on ExcerLock-Next. ADR 0062 is the gym ADR on main.

**How to apply:**
- Needs Johan's iPhone: When In Use at the gym, Always arrival with the app closed, force-quit and reboot, indoor accuracy near the edge.
- Background detection needs contextual Always permission and a one-time ask for existing users.
- Don't promise exact unlock minutes before a device proves it.
- Related: [[treadmill-false-unlock-163]], [[lifecycle-spec-162]].
