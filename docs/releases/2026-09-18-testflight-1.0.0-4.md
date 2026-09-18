# TestFlight 1.0.0 (4) — 2026-09-18

Background-walking candidate built locally from branch `fm/walk-bg-unlock-w1`
(a fast-forward of `main` at `f0553d04`) with `ios.buildNumber = "4"`:

- `341bae3d` fix(walking): ask for background walking grants on Home and report shield moves — ADR 0040.
- `ab758c59` chore(ios): build number 4.
- `be1d2695` fix(settings): permission copy says what Motion and Always location do for walking
  (committed before the archive's JS bundle phase; the IPA bundles this tree).

## What changed for the tester

- The walking card on Home now shows "Turn on background walking" until Motion &
  Fitness is granted **and** Location is **Always**; one tap runs both system
  prompts. Anything still missing afterwards, or a denied grant, shows "Open Settings".
- With both granted and a lock window active, backgrounding ExcerLock keeps it
  resident (ADR 0036 keep-alive), so a pocket walk lifts the shields without
  opening ExcerLock; stopping re-shields after the grace period.
- PostHog now receives `permission_resolved`, `unlock_completed`, `shields_lifted`
  and `shields_applied` with `app_state` (`background` = ExcerLock was closed) and
  `source`.
- Location purpose strings say what Always is for.

## Phone proof (canary protocol)

1. Fresh install or Settings → ExcerLock → reset Motion and Location to "Ask".
2. Home → walking card → "Turn on background walking" → allow Motion, then
   "Allow While Using" (iOS grants provisional Always). Card falls back to
   "Check walking" only.
3. Inside a lock window, open a locked canary app: shielded. Background ExcerLock
   (do **not** force-quit), pocket the phone, walk 60 s, open the canary without
   opening ExcerLock: unshielded. Stand still ~40 s: shielded again.
4. PostHog person timeline: `unlock_completed {method: walking, app_state: background}`
   then `shields_applied {cause: relock, app_state: background}`.

Known, unchanged: the keep-alive stops at window end, so a window that starts while
ExcerLock is already suspended needs one app open before pocket walks lift shields
(ADR 0040 consequences). Force-quit is never covered.

## Apple artifact

- App `6787265352`, bundle `com.johansardar.excerlock`, team `AX3C2B78YD`.
- Build ID `7aa26009-a0bc-4700-9504-b64233554ece`, `1.0.0 (4)`, uploaded
  2026-09-18 12:22 PT, processing `VALID`, audience `APP_STORE_ELIGIBLE`,
  `usesNonExemptEncryption: false`. Upload-only: not added to any beta group,
  nothing submitted for beta or App Review.
- What to Test (en-US, localization `b03ebff3-62e8-4c1a-a716-32da136bbc36`):
  the canary protocol above.
- IPA SHA-256 `5c8d32b62cc06a2a815ed46aeb25cfc2d7f0a61cc3b1b67c60c4668a0a8e8ba8`
  (`app-next/build/tf/ExcerLock-1.0.0-4.ipa`, untracked). Embedded `Expo.plist`:
  runtime `2`, channel `production`. `verify-binary.sh --distribution` passed for
  the main bundle and all four extensions; `main.jsbundle` contains the new card,
  Settings and event strings; the signed `Info.plist` carries `CFBundleVersion 4`
  and the new Always purpose string.

## Lane

Same as `2026-09-17-testflight-1.0.0-2.md`, with the build number set in
`app.json` **before** the single `prebuild --clean` (no second prebuild needed).
`asc` credentials came from `~/.excerlock/env` (`ASC_KEY_ID`, `ASC_ISSUER_ID`)
plus `ASC_PRIVATE_KEY_PATH=~/.excerlock/AuthKey_<ASC_KEY_ID>.p8` exported for
the shell: the stored keychain profile belongs to another app, so without the env
set `asc` would sign requests with the wrong key.
