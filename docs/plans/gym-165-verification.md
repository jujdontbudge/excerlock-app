# Gym issue #165 implementation and verification

Implemented on 2026-10-03 from `213ba6ac` in the isolated gym worktree. Nothing was pushed, merged, published or uploaded. Native code, the treadmill/propped files and notification files were not changed.

## Commits

| Commit | Change |
| --- | --- |
| `c958e34a` | Picker follows the first phone fix, uses last-known fallback, preserves edited or moved pins, and times out the neutral view to search. Removes Chicago starting points. |
| `7cbdb090` | Unlock map always draws the gym circle and pin, shows an orange dashed line to its nearest edge, frames the circle and user, and formats distance in Settings units. |
| `14fd764e` | Fresh-fix acceptance and bounded uncertainty retry; cancelable 30-second confirmation with repeated fixes; manual saved-gym writes authorized by account epoch; arrivals published; celebration gated on an applied open Lock decision. |
| `ea79fb42` | Contextual Always offer after saving, during Gym Condition creation and once for existing gyms; durable opt-out memory; foreground-only note; confirmed visits retained and current presence rechecked. ADR 0062 records the decision. |
| `52663764` | Simulator presence uses the production transition processor, AsyncStorage visit log, confirmation helper, gym reducer and Progress projection. |
| `11cb12ac` | Fixes a discovered iOS modal bug that hid notices; verifies that the applied native policy matches the requested gym unlock. |
| `039c8d1f` | Seven focused gym proofs, real simulator location actions, intermediate transition captures and durable visit/Progress diagnostics. |
| `72ce083b` | Fixes a discovered native-map readiness race: the picker camera now follows its first fix after MapKit is ready. Corrects the restart proof to check Home after cold launch, then inspect the visit. |

All 20 `./excer check` checks passed before each implementation commit. The final report commit also requires a passing check; its output is retained in `.excer/gym-165/check.log`.

## Focused simulator proofs

Only the requested named proofs were run, each with a five-minute outer timeout, on `ExcerLock-gym` (`33BF9A88-6CEC-4002-B73B-D87D3031D863`) and Metro 8093. Every proof directory contains `result.json`, labels and screenshots. These are dev-runtime proofs with a real Expo Location simulator fix and shared production gym processing; Screen Time enforcement and system permission answers remain fake.

| Proof | Result | Evidence directory |
| --- | --- | --- |
| `picker-phone-location` | Passed; frame inspected over UIUC with the pin and circle centered. | `.excer/proof/gym/2026-10-04_02-20-59/` |
| `unlock-map-circle-line` | Passed; frame inspected with the whole circle, gym pin, user point and dashed line in view. | `.excer/proof/gym/2026-10-04_02-20-12/` |
| `manual-inside-auto-off` | Passed; captures confirmation, Done, then one durable confirmed visit with background detection off. | `.excer/proof/gym/2026-10-04_02-06-57/` |
| `outside-distance-message` | Passed; message appears above the modal with distance in the user's units. | `.excer/proof/gym/2026-10-04_02-12-02/` |
| `uncertain-fix-retry` | Passed; captures “Getting a better fix…” and then the explicit accuracy retry result. | `.excer/proof/gym/2026-10-04_02-22-16/` |
| `arrival-while-open` | Passed; moves outside then inside without remounting the unlock screen. | `.excer/proof/gym/2026-10-04_02-14-19/` |
| `restart-mid-visit-progress` | Passed; establishes one confirmed target visit and one minute of Progress, kills the process, checks Home presence, then verifies the retained visit and Progress. | `.excer/proof/gym/2026-10-04_02-17-57/` |

No simulator proof remained stalled or blocked. The old picker failed at `.excer/proof/gym/2026-10-04_01-44-24/`. The outside proof first exposed the hidden-notice bug. A later label-only picker run at `.excer/proof/gym/2026-10-04_02-19-31/` reported a passing address while its image still showed the world view; that frame is rejected as picker-camera evidence, and the readiness fix was verified with the final frame above. Map proofs require inspecting their frames, because matching an address alone cannot prove camera framing.

The first restart run at `.excer/proof/gym/2026-10-04_02-15-00/` failed because it expected diagnostics immediately after cold launch. The app reopened Home with the confirmed visit; the corrected proof checks that user path before reopening diagnostics.

Cancellation, edited-pin preservation, last-known fallback and camera pan behavior were reviewed in code; the seven focused proofs do not individually exercise those branches.

The contextual background offer was also driven manually with `gym-uiuc-background`: a demo grant switched Home to “Auto-detect on”; a refused Always upgrade retained manual check-in, showed the foreground-only note, and kept auto-detect off without repeating the offer after a cold relaunch. Frames: `.excer/gym-165/background-offer.png`, `background-on.png`, `background-refused.png` and `background-refused-relaunch.png`. These verify app orchestration with fake system answers, not real iOS prompts or background delivery.

## OTA and privacy review

Build 17's archive names `ExpoLocation`, `ExpoLocalSearch`, `ExpoTaskManager`, `react-native-maps` and `RNScreens`. Evidence: `.excer/gym-165/build17-native-manifest.txt`. The task's `app-next/modules` diff from `213ba6ac` is empty: `.excer/gym-165/task-native-diff.patch`.

The requested diff against `1508e366` is saved as `.excer/gym-165/native-baseline-diff.patch`. It contains earlier motion-purpose-string and guarded StoreEnvironment changes inherited before this task. None was introduced by these commits. The gym changes use existing native APIs and add no native modules or methods.

Gym coordinates, names, distance, accuracy and visits remain on-device. No location, gym or distance details were added to analytics, production logs or server contracts. Simulator proof artifacts contain only their scripted fixture details and local screenshots.

## Remaining limitation and iPhone verification

The discovered manual-location coverage gap is filed as [#166](https://github.com/JohanSardar/excerlock-app/issues/166): with When In Use and auto-detect off, a user who leaves while ExcerLock is suspended can receive Gym target Progress for unobserved time until a definitive resume fix. An uncertain or failed resume fix can leave the interval open. Foreground departures are now sampled, and cold launch rechecks presence, but a bounded policy for unobserved manual time remains unresolved. Confirmed historical Progress must remain intact. This is a code-confirmed limitation; physical reproduction is pending.

Johan's iPhone still needs to verify:

- **When In Use at the gym:** turn background detection off, press “I'm at the gym”, stay through confirmation, and check that the distracting app's actual shield opens and the visit is recorded. Leave while ExcerLock is open and verify the relevant Condition's departure behavior.
- **Always with the app closed:** grant the contextual offer, verify auto-detect registers, then arrive with ExcerLock closed. Check the actual shields and arrival notification. The later execution opportunity needed for confirmation is not guaranteed by a JS timer.
- **Force-quit and reboot:** distinguish deliberate force-quit from system termination. Check retained confirmed Progress, current-presence recovery, locked-phone arrival, account access and watchdog/shield behavior after reopening and reboot. Force-quit relaunch is not promised; existing #133 and #162 device gates remain relevant.
- **Indoor accuracy near the edge:** tune the named starting thresholds (fix age at most 10 seconds, accuracy at most min(50 m, radius/2)), inspect uncertainty and clearly-outside messages, and verify cancellation and departure during confirmation.

These physical-device cases, real OS Always grant/refusal behavior, actual Screen Time shields and closed-app notifications are unverified. Simulator success does not certify them.
