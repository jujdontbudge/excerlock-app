# T10 — Enforcement domain, watchdog, runtime root

Spec: `01-detection-model.md` §2, §5, §6, §7. Reuse P2-T14 §2–§9 (union monitor plan, earned unlock, clock
watermark, can-enforce, lapse plan, shield content) and P2-T17 (single root composition, one foreground
handler) except where §5/§6 replace them.

## Steps

1. `LockDecision` per §5; delete `WalkingSession`, `leaseUntil`, `unlockedProvisional` (→ `unlockedAtGym`);
   `resolveLock` per §6 with inputs `detection`, `placement`, `gymPresence`.
2. `src/domain/watchdog.ts`: pure planner — given `now`, current decision and the last registered deadline,
   returns `{ register: { start, end } | null, cancel: boolean }` using backdated start
   (`min(now, deadline - increment)`) and constants `WATCHDOG_MS`, `WATCHDOG_RENEW_MS`.
3. `ScreenTimePort` gains `registerWatchdog(plan)`/`cancelWatchdog()`; `applyLock` becomes
   `Promise<{ applied; reason? }>`; fail-closed (shield first, then report) when registration fails.
4. Enforcement host at the runtime root, above every guard: subscribes to the decision stream, applies
   shields, plans the watchdog, re-derives everything on foreground and on every background wake (task
   manager entry), never in a React hook inside a tab.
5. Monitor budget assertion (≤ 20: 7 weekday union schedules + watchdog + usage ladder).
6. Shield content per P2-T14 §9 with the new causes (`lockWindow`, `walkingStopped`, `leftGym`,
   `proppedEnded`, `watchdog`).
7. Doc edits: `01-product-model.md` §3 replaced by a pointer to `01-detection-model.md` §5–§6.

## Tests first

- `resolveLock.test.ts` rewritten for §7 scenarios (every bullet is a test).
- `watchdog.test.ts`: renewal always describes an interval ≥ platform minimum; deadline never in the past;
  cancel on lock; fires-when-dead scenario via a fake clock.
- `enforcementHost.test.ts`: applies on decision change; re-applies on foreground; survives Home unmount.

## Acceptance

- [ ] Simulator with real adapter: `applyLock` shields the selection; monitor count ≤ 20.
- [ ] Device: force-quit while `unlockedWalking` → shields return within 17 min without opening the app.
