# Test harness

The harness is an isolated, on-phone recorder for physical-device signal tests.
Its public seam is `HarnessRunEngine`: a declarative test definition plus
injectable signal sources and a recorder produces one persisted run. The engine
owns countdown, markers, extension and termination; it never applies product
policy or renders a pass/fail verdict.

Harness storage must remain separate from product storage. Cheap motion and
placement sources attach to every run; camera sources attach only to definitions
that explicitly request them.

## A run outlives a pocketed phone

The tests that matter most are the ones where putting the phone away is the
correct gesture — an outdoor walk, scrolling in another app — and iOS suspends
JavaScript the moment it can. Two independent mechanisms keep a run honest
through that.

**The phone is held awake the way the product holds it.** For the length of a
run the engine opens the same background location updates
`WalkingSessionController` uses for a walk (`createLocationKeepAlive` →
`getLocationProvider()`), and closes them when the run ends. A refusal — denied
permission, no provider — is recorded as a `keep-alive` event with the reason
and the run continues; the export then explains why a run went quiet.

**The end is computed from the wall clock, never from a timer tick.** A run ends
at its declared deadline (`startedAtMs + defaultDurationMs`, plus any
extension), whoever notices it. The engine also checks the deadline on every
app-state change, so a run whose deadline passed while the app was suspended is
closed on the next foreground rather than running on. How late the noticing was
picks the end reason:

| End reason | Meaning |
| --- | --- |
| `stopped` | The tester ended the run. |
| `timeout` | The deadline arrived and something was awake to see it (within 2 s). |
| `stranded` | The deadline passed unwatched: the phone was asleep, or the app was killed. `endedAtMs` is reconstructed, not observed. |

`finalizeStrandedRuns` runs at every launch and closes any persisted run that
still has no `endedAtMs`, stamping the last instant there is evidence for — its
final event, or its start. Nothing stays "in progress" across a launch, and the
task list prints a stranded or unfinished run as **needs attention** instead of
filing it with the clean results.

## Tracks

The motion adapter records provider payloads unchanged as `raw.activity` and
`raw.cadence`. It runs the production `WalkVerifier` without a session, unlock,
or lease callback and records those conclusions as `derived.verdict`.

## Analyze an export

From `app/`, run:

```sh
npm run analyze:harness -- /path/to/export.jsonl
```

The analyzer treats every unique `source` + `track` pair as a signal layer. For
each declared marker it prints the first sample from every observed layer before
the next declaration, including the elapsed time from declaration to sample. A
missing sample is printed as `never responded`; empty and incomplete runs are
reported explicitly. This keeps the comparison generic as new signal providers
and tracks are added.

`PlacementHarnessSignalSource` decorates the production
`PhonePlacementProvider` and feeds every raw device-motion sample through the
production `PhonePlacementClassifier`. It records `raw-device-motion` and
`placement-classification` as separate tracks; the latter includes pickup and
set-down transitions. The native composition is installed by
`createDefaultHarnessSources`, while Jest uses
`FixturePhonePlacementProvider` through the same provider interface.

## Camera runs

`HarnessCameraSource` decorates the production `GaitVisionProvider` and
`GaitPeriodicityDetector`. It records landmarks and detector results on separate
tracks without applying a pass/fail decision. Camera sources may prepare during
the countdown so the native preview is live before the fixed hands-free window
begins; sources that are not declared by the task are never prepared or started.

The native capture override is harness-only. It stores 640×480 H.264 footage in
the app's Application Support directory at the camera session's configured 15
fps. A run retains the sandbox URI so footage can be associated locally, but
`serializeHarnessJsonLines` deliberately removes that field. The task list's
single delete action removes every captured movie and then strips all retained
URIs from saved runs.

## Run context

Definitions may declare structured parameters. The setup screen records every
declared key, preserving a blank value rather than inventing one, plus a free
note for unanticipated circumstances. Both live in the run header and therefore
round-trip through persistence and JSON Lines export.

## Launching a task from a Mac

The harness accepts a launch url so a task can be opened and started without
touching the phone (see `harnessLaunchRequest.ts`):

```sh
xcrun devicectl device process launch --device <uuid> --terminate-existing \
  --payload-url "excerlock://?test=c1-treadmill-walking&start=1" \
  com.johansardar.excerlock
```

`test` must be a known definition id; `start=1` presses "Start run" on mount.
Keep the path at `/`: any other path is swallowed by expo-router's "Unmatched
Route" screen. A cold launch can drop the url before JS listens, so open the
app first and send the url to the running app (omit `--terminate-existing`).

## Which task tests what

| Product step | Task |
| --- | --- |
| Walking with the phone in hand (motion only) | M2, M4 |
| Standing or sitting while scrolling (must read not walking) | M6, M7 |
| Placement sensor says "propped" while the belt vibrates (no camera) | P3 |
| Camera sees a walker / an empty belt while propped | C1, C2 |
| The whole propped flow: prop → camera confirms → pick up → set down | T1 |
