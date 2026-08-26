# diagnostics

An on-device event recorder for physical-device testing.

## Why it exists

Device tests happen where the Mac isn't: on a treadmill, on a gym trip, on a
walk with no Wi-Fi, with the app deliberately backgrounded, force-quit and
rebooted. Under those conditions `console.log` goes nowhere — there is no Metro
attached and nothing to attach it to. Anything worth knowing has to be written
where the next launch can read it back, and read back **on the phone**.

## Shape

| File | Responsibility |
|---|---|
| `DiagnosticsLog.ts` | Append-only ring buffer with AsyncStorage persistence. No React, no globals, fully injectable. |
| `walkInstrumentation.ts` | Decorates the real walking dependency set to record cadence, activity and keep-alive. |
| `installDiagnostics.ts` | Composition root: hydrate, periodic flush, flush on background, install the instrumented controller. |
| `DiagnosticsScreen.tsx` | Reads the log on the phone; Share exports it. |
| `accessor.ts` | The singleton and the build gate. |

## Two rules worth keeping

**Recording is synchronous.** `append` never awaits. A walk produces a cadence
sample about every second, and putting storage I/O inside a sensor callback
would place the recorder in the path of the thing it measures. Persistence is a
periodic flush plus a flush when the app backgrounds — the moment before iOS may
suspend or kill the process, and exactly when a device test begins.

**Instrumentation decorates, never rebuilds.** `instrumentWalkingSessionDependencies`
spreads `createDefaultWalkingSessionDependencies()`. The previous recorder
hand-assembled its own dependency object, and when `createPlacement` and
`leaseWarning` were later added to the production set, the copy silently lacked
them — propped treadmill mode was dead in the one build meant to prove it, with
nothing failing to say so. A test asserts key parity for that reason.

## Enabling

Off unless `EXPO_PUBLIC_DIAGNOSTICS=1` is set at build time. App Store builds
never set it, so the recorder and the `/diagnostics` route cost a shipped app
nothing. The route redirects home when the flag is absent.

```sh
EXPO_NO_DOTENV=1 EXPO_PUBLIC_E2E=0 EXPO_PUBLIC_DIAGNOSTICS=1 \
  npx expo run:ios --device <udid> --configuration Release
```

Release configuration matters: it embeds the JS bundle, so the app runs with no
Metro and no network. A Debug build cannot do that.

Reach the screen at `excerlock://diagnostics`.
