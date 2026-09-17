# T15 — Performance budgets

> Formal measurements deferred to `../post-ship/README.md` F02 by Johan on 2026-09-10. Not completed.

Facts: audit finding — rule set re-sorted every second while Home mounted; `research/recovery-postmortem.md`
§PERF (startup gates).

## Budgets (release build, iPhone 12 or the T00 device if older)

- Cold start to first frame ≤ 1.5 s; time to interactive Home ≤ 2.5 s; airplane-mode fresh install ≤ 3.5 s.
- Boot gate: Supabase ≤ 5 s bound, entitlement ≤ 3 s bound, updates ≤ 3 s bound, all concurrent, never
  serial; splash never waits on the network beyond the longest bound.
- Historical 4 MB Hermes cap removed by Johan on 2026-09-10; size is informational. Camera and map modules remain lazy-loaded.
- Home steady-state: zero work per second when nothing changed (replace the 1 s sort with a derived selector
  invalidated by store changes).

## Steps

1. `scripts/measure-startup.sh` (`--sim-log <udid>` reads the simulator's own
   os_signpost stage medians out of its unified log — ADR 0037; `--trace/--xpath`
   parses an `xcrun xctrace` recording on device; `simctl` launch timing on sim).
   Device diagnostics are recorded: 11 cold launches on `Il` of the manual-signed
   preview Release gave cumulative medians `FirstReactRender` 200.485 ms →
   `BootGateRedirect` 269.404 ms (`app-next/evidence/T15/device-startup-stage-medians/`).
   These are delegate-relative diagnostics; the acceptance below still needs the
   signed distribution build.
2. Fix the Home sort; lazy routes for `unlock/propped`, gym picker map, Analytics charts.
3. React Compiler already on; verify no `useMemo` regressions.

## Acceptance

- [ ] Numbers recorded in `evidence/T15/` for release build; every budget met.
