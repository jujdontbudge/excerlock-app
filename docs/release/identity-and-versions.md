# Identity, version and build number continuity

Decision A3 (`plans/rebuild/00-decisions.md`): the rebuilt app is the same app. Nothing new is created in
App Store Connect, EAS or Adapty. `guardrails/release/identity.test.ts` holds every value below.

## The identity that never changes

| Field | Value | Where it lives |
| --- | --- | --- |
| Name / slug / scheme | `ExcerLock` / `excerlock` / `excerlock` | `app-next/app.json` |
| Bundle identifier | `com.johansardar.excerlock` | `app-next/app.json` `ios.bundleIdentifier` |
| Apple team | `AX3C2B78YD` | `app-next/app.json`, `eas.json` submit profiles |
| App group | `group.com.johansardar.excerlock` | added by P2-T03 with the Screen Time targets; the guardrail rejects any other group |
| EAS project | `9a358379-d939-4c56-bcea-de3ac5699be2`, owner `johansardar` | `app-next/app.json` `extra.eas.projectId`, `updates.url` |
| App Store Connect record | app id `6787265352`, sku `excerlock-ios-001` | `eas.json` `submit.*.ios.ascAppId`; `asc apps list` |
| Adapty | same app, access level `premium`, same product ids | Adapty dashboard; `app/src/subscription/README.md` in the archive |
| Sentry | org `edge-ix`, project `excerlock-mobile` | P2-T07 |

Verified on 2026-09-07 with read-only calls:

- `asc apps list` → one record with this bundle id; `asc versions list` → version `1.0` in
  `PREPARE_FOR_SUBMISSION`; `asc builds list --app 6787265352` → **zero builds**.
- `eas build:list --platform ios` → **no EAS builds** for the project; `eas whoami` → `johansardar`.
- `eas env:list --environment production` → `EXPO_PUBLIC_POSTHOG_KEY`, `POSTHOG_HOST`,
  `SENTRY_AUTH_TOKEN`, `SENTRY_DSN_MOBILE`. No Clerk variable on EAS.

So there is no build-number history to preserve. The old app never reached TestFlight through EAS or
App Store Connect; every earlier device install was a local dev client.

## Marketing version

- Old app: `0.0.0` (`app/app.json`, `app/package.json`). Never uploaded.
- New app: `1.0.0` (`app-next/app.json`, `app-next/package.json`, kept equal by the guardrail). Matches
  the `1.0` version record already sitting in App Store Connect.

Bump `version` in both files together; the About row reads `Constants.expoConfig.version`.

## Build number

`app-next/eas.json` sets `cli.appVersionSource: "remote"` and `autoIncrement: true` on `preview` and
`production`. EAS stores the iOS build number per project and bumps it on every store build, so two
machines cannot mint the same number and no commit carries one. `app.json` therefore has **no**
`ios.buildNumber`; the guardrail fails if one is added.

First-time seeding (once, by Johan, because App Store Connect has no builds):

```sh
cd app-next            # `app` after the rename
eas build:version:get --platform ios        # "not set" the first time
eas build:version:set --platform ios        # enter 1
```

Every `eas build --profile preview|production` then produces 1, 2, 3 … App Store Connect rejects a
reused number for the same version, which is exactly the property remote versioning gives.

The About row's build value comes from `Constants.expoConfig.ios.buildNumber`, which a remote-versioned
store build may leave undefined. When P2-T10 wires Settings, read `expo-application`'s
`nativeBuildVersion` there instead (dependency already present); until then the row shows the content
default. Not a release blocker.

## Runtime version and updates

`runtimeVersion` policy is not declared and `updates.enabled` is `false`: the new app ships no OTA
updates and does not depend on `expo-updates`. Channels are therefore absent from `eas.json`. If OTA is
ever turned on, set `runtimeVersion: { policy: "appVersion" }` as the old app did, add `channel` to the
store profiles, and re-run the guardrails.

## Deviation from the old `eas.json`, and why

The old `preview` profile was `distribution: "internal"` (ad hoc). Ad-hoc builds cannot be submitted, so
"build a preview and push to TestFlight" needs a store build. The new `preview` is a store build with the
dev menu off; `development` stays the signed dev client for device work; the `e2e` profile is gone with
Maestro.
