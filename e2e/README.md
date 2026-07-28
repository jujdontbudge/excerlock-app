# e2e — Maestro simulator suite (TEMPLATE — app not built yet)

> **Status: skeleton.** The app does not exist yet; everything here is a template
> sized to the future app (tab bar: Home / Manage / Analysis / Settings) so the
> harness prototype has a shape to fill in. App IDs, schemes, and testIDs are TBD.
> Design + rationale: `docs/research/e2e-loop.md` (ticket #20). Locked strategy:
> wayfinder map #1 — every screen runs on simulator against the mocked signal
> boundary, looped until functionally and visually perfect.

## Layout (target shape)

```
e2e/
  config.yaml            # workspace config: flow discovery, global tags (TBD)
  flows/                 # one flow per scenario; tags scope suites
    smoke-home.yaml      # ← the one existing template flow
  baselines/             # per-screen baseline PNGs (git-committed; a baseline is a design sign-off)
  scripts/               # odiff sweep + bless scripts (built by the harness prototype)
  out/                   # gitignored: report.xml, artifacts/, debug/, diffs/
```

## The contract (once the app exists)

- **Build under test:** release-style **simulator** build from an `e2e` EAS profile
  (`withoutCredentials` + `ios.simulator: true`, **no** `developmentClient`) with
  `EXPO_PUBLIC_E2E=1` swapping the signal boundary to fixture implementations.
  Never point Maestro at the expo-dev-client launcher.
- **Mock state:** flows select a scenario via deep link
  (`excerlock://e2e/scenario/<name>`); mid-flow signal events via the in-app
  E2E control server (`http.post` from `runScript`). No `launchApp` boolean
  arguments (broken on iOS — Maestro #2113).
- **Simulator:** one pinned device (`ExcerLock-E2E`, model + runtime fixed),
  light appearance, status bar overridden (9:41 / full battery / wifi). All
  lifecycle commands: `docs/research/e2e-loop.md` §simulator-lifecycle.
- **Run:** `maestro test e2e/flows --include-tags=smoke --format junit \
  --output e2e/out/report.xml --test-output-dir e2e/out/artifacts \
  --debug-output e2e/out/debug --flatten-debug-output --udid $E2E_UDID`
- **Visual gate:** in-flow `assertScreenshot` (threshold 99.5 → ratchet to 100),
  then the odiff zero-tolerance sweep against `baselines/`. Baselines update
  only on deliberate, reviewed visual change — never to silence a red gate.

## Tags (planned vocabulary)

| Tag | Meaning |
|---|---|
| `smoke` | app launches, tab bar navigates, nothing crashes |
| `home` / `manage` / `analysis` / `settings` | per-surface suites |
| `visual` | screenshot-gate steps (excluded until functional green) |
| `wip` | excluded from full runs |
