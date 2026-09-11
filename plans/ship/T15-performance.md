# T15 — Performance budgets

Facts: audit finding — rule set re-sorted every second while Home mounted; `research/recovery-postmortem.md`
§PERF (startup gates).

## Budgets (release build, iPhone 12 or the T00 device if older)

- Cold start to first frame ≤ 1.5 s; time to interactive Home ≤ 2.5 s; airplane-mode fresh install ≤ 3.5 s.
- Boot gate: Supabase ≤ 5 s bound, entitlement ≤ 3 s bound, updates ≤ 3 s bound, all concurrent, never
  serial; splash never waits on the network beyond the longest bound.
- JS bundle ≤ 4 MB Hermes bytecode; camera and map modules lazy-loaded.
- Home steady-state: zero work per second when nothing changed (replace the 1 s sort with a derived selector
  invalidated by store changes).

## Steps

1. `scripts/measure-startup.sh` (os_signpost / `xcrun xctrace` on device; `simctl` launch timing on sim).
2. Fix the Home sort; lazy routes for `unlock/propped`, gym picker map, Analytics charts.
3. React Compiler already on; verify no `useMemo` regressions.

## Acceptance

- [ ] Numbers recorded in `evidence/T15/` for release build; every budget met.
