# Unlock ceremonies

Home routes active gym and treadmill walking-state rules to the shared square lock ceremony. Step targets and outdoor walking keep their existing progress flow.

Home's **Test gym unlock** and **Test treadmill unlock** open `?preview=1`. Preview providers are isolated: gym previews finish in three seconds; treadmill previews replay recorded gait landmarks through the original detector. They never start a walking session, check in, or change exercise credit.

`UnlockLockFrame` owns the square surface, border ring and shackle. `Confetti` uses one UI frame clock for forty particles. Reduced motion omits particles and spatial movement. `useCeremony` times the success announcement and Done button.

**No exit is silent.** The treadmill screen holds two terminal failures instead of navigating away: the framing grace expiring ("We couldn't see you walking") and a scan that verified but whose session would not book ("We couldn't start your walk"). Both offer **Try again** and **Continue with phone in hand**; the handheld exit starts the session and asks Home to open its walking sheet, so the verifying wait is explained rather than blank. The failure lives in a ref as well as state because the scan effect must not re-run and quietly clear it.

**The booking is the gate.** The shackle, confetti and success haptic wait for `completeProppedScan()` to return true *and* the lease to exist. A duration rule takes this in two stages: the scan verifying earns a body settle and "{goal} minutes counts the day" with the lock still shut, and only reaching the goal lifts it.

**Camera permission** is requested by the screen, not the provider: the idle heading and privacy line render first, `GaitPort.permission()` answers, the answer is written to `permissionsStore.camera` for Settings to show, and the scan starts only on `granted`. `restricted` is treated as denied. `NativeGait.permission()` still probes by starting and stopping the camera; P2-T03 replaces that with an `AVCaptureDevice` read.

`gait/` ports the original app's periodicity detector, fixture provider and scan controller. Native Swift camera/Vision sources are copied from the original local Expo module. Physical iPhones use that provider; the simulator uses fixture surfaces. No camera is available in iOS Simulator.

`useGymUnlock` uses foreground coordinates and presence subscriptions. It reports four situations the ceremony renders in order — location denied, no gym saved, still locating, inside/outside — so a user who has granted location but saved no gym is offered the gym list rather than a Settings link. A cancellable 30-second confirmation books gym credit only if presence holds; losing presence aborts the in-flight check-in through the hook's own `AbortController` rather than relying on the port to reject, and closing cancels it too.

**Ceremony timing runs on `ClockPort`**, not `Date.now`: `ceremonyClock.ts` reads `monotonicMs` and waits on `at` when the port provides them, so the confirmation window, the ring and the dev clock always agree. That file is a compatibility shim until P2-T15 makes those methods required. The existing Phase 1 runtime still owns exercise credit and shield decisions: device enforcement, instant-relief shielding, background geofencing, lease renewal notifications and handheld hand-off remain Phase 2 work. Native camera framing/throughput/orientation still require physical-device validation before TestFlight, as specified in ticket #113.

Scenarios named `unlock-*` cover inside/outside gym, treadmill walking/framing/denied and reduced motion. `setGait` and `setPresence` drive fixture inputs; switch presence to outside mid-confirmation for the lost-presence case.

Checks: unlock tests cover the original gait fixture, preview isolation, full confirmation, lost presence, rounded-ring geometry and confetti lifetime. Simulator recordings live in `evidence/T-unlock/`.
