# T16 evidence index

Final handoff: `ACCEPTANCE.md` (written after the run). Checks and generated media remain local; markdown indexes are committed.

The simulator was shut down and erased, the Expo SDK 57 development client rebuilt in generic build-only mode, then installed and cold-launched. Build: zero errors, two upstream warnings. First-run URL confirmation and Expo developer-menu introduction are preserved in `first-run-host-setup.mp4`; those host controls were acknowledged, and the untouched product was cold-launched into O01 in `cold-L0-O01.mp4`.

`accept-branches.py` drives each complete onboarding branch. W3 resume explicitly checks the adjustable's value text (`5000 steps`) and checked walking choices. The initial harness incorrectly queried the duplicate static label and later assumed lowercase `alex`; native evidence shows the fresh iOS keyboard entered `Alex` and Home preserved it. These driver corrections are preserved in attempt logs. The first walking-goal recording still contains the complete successful product journey and resumed choices; final Home assertions were checked against the actual entered name.

Acceptance fixes: today's Analytics now shares step/workout/usage facts with the fake ports; gym minutes update current-day activity; local search can reach five gyms with six candidates, at fixed 100 m radius. Recap activity totals use whole numbers to match chart labels. The shared sheet animates intrinsic layout changes, addressing initial content settling seen in T15. Overnight gym attribution is covered by dedicated red/green integration tests before final verification.

Only the owned ExcerLock-Next simulator is controlled. An unrelated persona-Recovi-Checkout simulator and Simulator.app were already running in another session; this task did not open Simulator.app or stop that other session.

Final edge automation was completed in checkpoint recordings. The initial unit tap was swallowed by scroll deceleration; `visible_tap` now waits for a stable AX frame and uses a held tap. Saved-gym rows expose name plus address, so assertions match that combined accessible label. A lower picker choice initially overlapped the sticky Save footer; the driver now scrolls targets above modal footers as well as tabs. The unchanged product correctly selected/saved the place after scrolling. Initial and continuation logs/movies are retained; the consolidated edge index names the successful source for each checkpoint.

Final checks after the overnight fix: 419 tests, 113 suites, 14 snapshots; domain branch coverage 100%. Typecheck, lint and iOS export passed. Doctor passed 21/21 and dependencies are current. Read ACCEPTANCE.md for coverage percentages and links.

The first five-gym screenshot exposed cramped side-by-side name/address text. A failing subtitle/navigation-label test preceded a stacked-address row fix; `gyms-and-delete-final.mp4` recaptures the final layout. The deletion driver now identifies rule cards by their Delete accessibility action, including the “Unlock while walking” rule omitted by the original name-prefix filter.

Detailed picker frame inspection showed layout animation alone did not prevent a sharp query-dependent height change. The native `accept-picker-stability.py` test failed with heading y=142→334; expanded sheet sizing then passed at y=142→142. Final picker evidence supersedes the earlier reflow strips. The first green attempt was blocked by the deliberately open modal left by the failing test; this is retained in open-modal-attempt files, and the harness now closes prior sheets before starting.

The final Switch replay asserts native values, not taps alone. Its initial scroll attempt never moved the target into the viewport; the driver now specifies swipe event spacing, verifies visibility, and fails before any offscreen tap. These driver attempts are retained separately.
