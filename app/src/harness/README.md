# Test harness

The harness is an isolated, on-phone recorder for physical-device signal tests.
Its public seam is `HarnessRunEngine`: a declarative test definition plus
injectable signal sources and a recorder produces one persisted run. The engine
owns countdown, markers, extension and termination; it never applies product
policy or renders a pass/fail verdict.

Harness storage must remain separate from product storage. Cheap motion and
placement sources attach to every run; camera sources attach only to definitions
that explicitly request them.

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
