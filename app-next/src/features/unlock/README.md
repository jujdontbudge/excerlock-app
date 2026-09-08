# Unlock ceremonies

Home routes active gym and treadmill walking-state rules to the shared square lock ceremony. Step targets and outdoor walking keep their existing progress flow.

Developer-menu unlock scenarios pair with each ceremony route using the `preview` query parameter set to `1`. Preview providers are isolated: gym previews finish in three seconds; treadmill previews replay recorded gait landmarks through the original detector. They never start a walking session, check in, or change exercise credit.

`UnlockLockFrame` owns the square surface, border ring and shackle. `Confetti` uses one UI frame clock for forty particles. Reduced motion omits particles and spatial movement. `useCeremony` times the success announcement and Done button.

`gait/` ports the original app's periodicity detector, fixture provider and scan controller. Native Swift camera/Vision sources are copied from the original local Expo module. Physical iPhones use that provider; the simulator uses fixture surfaces. No camera is available in iOS Simulator.

`useGymUnlock` uses foreground coordinates and presence subscriptions. A cancellable 30-second confirmation books gym credit only if presence holds; losing presence or closing cancels it. The existing Phase 1 runtime still owns exercise credit and shield decisions: device enforcement, instant-relief shielding, background geofencing, lease renewal notifications and handheld hand-off remain Phase 2 work. Native camera framing/throughput/orientation still require physical-device validation before TestFlight, as specified in ticket #113.

Scenarios named `unlock-*` cover inside/outside gym, treadmill walking/framing/denied and reduced motion. `setGait` and `setPresence` drive fixture inputs; switch presence to outside mid-confirmation for the lost-presence case.

Checks: unlock tests cover the original gait fixture, preview isolation, full confirmation, lost presence, rounded-ring geometry and confetti lifetime. Simulator recordings live in `evidence/T-unlock/`.
