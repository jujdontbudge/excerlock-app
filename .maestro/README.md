# Maestro entrypoint

The canonical suite lives in `e2e/`. Run it through
`e2e/scripts/run-suite.sh` against the release-style simulator build described
in `e2e/README.md`.

The earlier flows in this directory were retired because they launched the
Expo launcher instead of the `e2e` EAS-profile build, did not load bundled
scenarios, and could not cover deterministic states. Keeping a second runnable
flow tree would let the two contracts drift again.
