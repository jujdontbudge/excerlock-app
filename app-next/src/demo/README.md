# demo

Local scenarios and fake ports. Never imported by features.

`contextPersistence` stores adapter metadata (scenario id, clock, step override and prompt controls) independently of the eight product stores. Cold launch restores those signals without resetting edited rules. Loading holds progress and navigation until all scenario facts have been replaced. Health/step signals are scoped to their calendar day. Clock persistence observes ticks without starting a background timer.

`FakeClock` owns every product deadline. `at(deadline, callback)` is evaluated on each tick, so a dev-menu time jump fires the gym confirmation, the walking lease and the framing grace in the same pass, and `monotonicMs` never rewinds when the clock is set backwards. `WalkingFake` drives the pure session machine in `domain/sessions` with scripted events and holds no timers of its own.

`stepCount` is shared by the fake pedometer and current-day history. `activityHistory` reconciles today's sensor/workout facts without rewriting prior days, and seals each past day through yesterday while pruning rule days beyond the retention window. Gym and workout credit reaches rule days only through `progressSync`; the fakes record visits and workouts and never write progress themselves. Canned discovery exposes six places for deterministic tests. Saved radii preserve the selected 50–200 m value in 10 m increments. The iOS app runtime replaces discovery with real on-device Apple Maps search; exercise signals and saved-place persistence are still local.
