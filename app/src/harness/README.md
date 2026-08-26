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
