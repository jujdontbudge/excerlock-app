# T01 scaffold evidence

Branch: rebuild/phase-1, based on wip/pre-rebuild-snapshot-2026-09-06.

The rendered-router boot test and fake-runtime test were written first. The initial failure is in red-tests.txt; the implemented tests pass.

Checks: typecheck, Jest (3 tests), lint, Expo Doctor (21/21), Expo install check, iOS export. Full output: checks.log. Expo MCP was used for creation, dependencies, Router, testing, monorepo resolution and the dev-client build recipe.

Headless deviation: the installed Expo CLI calls ensureSimulatorAppRunningAsync even in noninteractive mode. scripts/simulator.sh uses the supported generic build-only destination and installs/launches using simctl. Simulator: ExcerLock-Next, B68873CD-B6ED-4961-85AF-0C807E657999, iPhone 17 Pro, iOS 26.4. No custom native product adapters or permission requests.

Root overrides keep the old and new workspace's React Native, Reanimated, Worklets and React Native Jest preset on compatible patch versions. All protected reference directories remain byte-for-byte unchanged against the snapshot baseline.

An initial build exhausted disk space. Regenerable old ExcerLock DerivedData and npm cache were removed; the build was retried. See build.log for the final result.

Final result: native build succeeded (0 errors; two upstream build-phase warnings). Dev client installed and launched; launch.png shows the approved running-lock boot surface. The live accessibility tree confirms the React boot image at 140 × 140 pt. An added failing accessibility test exposed the missing image role; the fix is now covered. Final Jest count: 4 passing tests. Root npm install also succeeded. Simulator.app remains closed; the simulator was shut down at task completion.
