# Local Maestro loop

These flows exercise the Phase-2 UI that exists now:

- `launch.yaml` proves a clean install opens on Home's empty-start state.
- `tabs.yaml` visits Home, Manage, Analysis, and Settings. The Analysis assertion targets its
  fixture-backed earned/spent card, so the empty branch cannot satisfy the flow.
- `settings-grace.yaml` selects a two-minute stop grace, restarts the app process without clearing
  AsyncStorage, and proves the selection survives.

The flows use screen `testID`s for stable identity and user-visible or accessibility text for the
behavior being proved. Maestro automatically waits for assertions and interactions; there are no
fixed sleeps.

## One-time local setup

Install Maestro and make an iOS simulator named `ExcerLock-E2E` available. The app under test is the
Expo development client with bundle ID `com.johansardar.excerlock`, not Expo Go.

Keep Metro running in one terminal:

```bash
npm run start --workspace app
```

Then start the loop in another:

```bash
scripts/e2e-loop.sh
```

The script boots the simulator, waits for it to finish booting, and builds/installs the development
client with `expo run:ios --no-bundler` only when the bundle is absent. Force a rebuild after native
dependency or Expo config changes:

```bash
BUILD_DEV_CLIENT=1 scripts/e2e-loop.sh
```

Select a different simulator by exact name or UDID:

```bash
SIMULATOR_NAME="iPhone 17 Pro" scripts/e2e-loop.sh
E2E_UDID="<simulator-udid>" scripts/e2e-loop.sh
```

Each attempt runs `maestro test .maestro/`. A failure leaves Maestro artifacts and the complete CLI
transcript under `.maestro/artifacts/`, then waits for you to fix the app or flow and press Enter.
Enter `q` to stop. A non-interactive invocation returns after the first failed attempt.

## Static checks

These checks do not boot a simulator:

```bash
bash -n scripts/e2e-loop.sh
ruby -e 'require "yaml"; ARGV.each { |path| YAML.load_stream(File.read(path)) }' .maestro/*.yaml
yamllint -c .maestro/.yamllint .maestro/*.yaml
for flow in .maestro/*.yaml; do maestro check-syntax "$flow"; done
```

The installed Maestro CLI has no `test --dry-run` option; `check-syntax` is its device-free
validation command. Do not substitute a real `maestro test` invocation for static validation.

## CI boundary

CI intentionally does **not** build a simulator app, boot a simulator, or run Maestro. Per
`ARCHITECTURE.md`, CI remains the fast unit-plus-guardrail gate; this suite is the local Mac feedback
loop. Adding Maestro to CI is a separate architecture decision, not an extension of this script.
