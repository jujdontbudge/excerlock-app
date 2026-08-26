# Test harness

The harness is an isolated, on-phone recorder for physical-device signal tests.
Its public seam is `HarnessRunEngine`: a declarative test definition plus
injectable signal sources and a recorder produces one persisted run. The engine
owns countdown, markers, extension and termination; it never applies product
policy or renders a pass/fail verdict.

Harness storage must remain separate from product storage. Cheap motion and
placement sources attach to every run; camera sources attach only to definitions
that explicitly request them.

`PlacementHarnessSignalSource` decorates the production
`PhonePlacementProvider` and feeds every raw device-motion sample through the
production `PhonePlacementClassifier`. It records `raw-device-motion` and
`placement-classification` as separate tracks; the latter includes pickup and
set-down transitions. The native composition is installed by
`createDefaultHarnessSignalSources`, while Jest uses
`FixturePhonePlacementProvider` through the same provider interface.
