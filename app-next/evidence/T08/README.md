# T08 — Post-purchase setup

X1–X5 now resume through setup, with walking, gym and workout permission branches; aggregate-only app selection; reusable app/gym sheets; persisted saved gyms; optional provider/email sign-in; and a checklist of actual grants and saved account state.

## Verification

- TDD: setup route/branch/resume, denied primers, aggregate app selection/search, email error/resend and provider cancellation, gym name/five-place limit, distinct Always upgrade. Initial failing logs are retained locally.
- 242 tests / 89 suites passed; typecheck and lint passed. Expo Doctor 21/21; dependency check and iOS export passed. Existing native development client launched headlessly with current Metro bundle.
- Native captures: `setup-walking-email.mp4` covers Screen Time, app selection, denied Motion and wrong email code; `email-recovery.mp4` completes resend, corrected code, X5 and Home. `setup-denied-and-health.mp4` covers denied Screen Time and all non-gym X3 branches. `setup-gym.mp4` covers save and Always denial/grant. `setup-health-location-prompts.mp4` covers Health and When-in-use grants/denials.
- `app-picker-selected.png` verifies selected App A and Done above the software keyboard. The original failure is in `picker-filter-state.png`. A keyboard-event regression test verifies sheet inset restoration and listener cleanup.

## Native findings

The absolute sheet was outside ScreenShell's keyboard avoidance. It now animates both its bottom inset and scrollable maximum height; the footer stays above the keyboard. Native verification passed. The universal fix and idb's shifted-punctuation injection issue were recorded in the cross-app ledger, commit `24a5362`.

Email recovery requires scrolling after validation text grows; it remains reachable with the keyboard open. Automation must wait for scroll deceleration before tapping. The recorder uses AX-discovered fields and the native email keyboard's @ key, since idb text injected 2 for @.

## Motion

Studied Otter OT01-M029 (sheet recedes over retained dashboard) and OT00-M015 (permission sheet dismissal), plus actual AppBlock replay 8, 40 and 120. Sheets preserve the underlying screen, rise on the shared spring, fade their scrim, and drag down to dismiss. Picker rows stagger, selection highlights animate, setup direction is retained, each primer has a living glyph, and errors/checklist rows reveal. Reduce Motion uses fades and immediate final values.

Map is a fictional local raster; STYLE Family D viewport interpretation, full prompt and validation are in assets/images/FOUNDRY.md. No real map, permission, sign-in or purchase service is called.

Gemini and Johan review remain deferred under the latest instruction to continue with existing material.

Final native review also caught intrinsic raster height overriding the map aspect ratio. The wrapper now owns the 2:1 viewport, verified in gym-picker.png; ledger commit cec3c92. X5 includes the actual trial-notification grant alongside branch permission and optional account status.
