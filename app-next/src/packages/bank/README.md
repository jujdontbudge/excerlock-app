# Bank

The UI contract is `Bank.ts`. It exports `Difficulty`, `OfferId`, `Offer`, `BankView`, `offers`, `useBank()`, `collectPoints()`, `buyOffer(id)` and `activityToGo(view, offer)` with the signatures in `docs/specs/bank-condition.md`.

`bankStore.ts` alone owns the persisted `excerlock-next.bank.v1` data. `AccountData.ts` joins AccountDataCoordinator; older account snapshots without Bank data restore an empty Bank store. Condition removal clears the account data. Turning a Condition off preserves it and hides Shop.

`BankEvidence.ts` consumes the same exact step measurements and confirmed gym intervals as Progress. Ranges start at Condition creation, then follow local Days. Each Day keeps its Difficulty, amount, total whole Points already projected and measurement cursor. Collect moves pending Points into Points without resetting those cursors. Difficulty changes are pending until the next Day; the Difficulty timeline preserves rates for delayed evidence.

`BankLifecycle.ts` owns the drain subscription and monitor arms. Usage is cumulative since the last arm; only its unapplied difference is deducted. Changes to Bank time re-arm the monitor, removal or pausing disarms it. No wall clock drains Bank time.

The real runtime uses `enforcement/NativeBankDrain`. The simulator does not establish physical-device threshold accuracy or closed-app re-locking. See ADR 0081's device spike.

Home `BankSection.tsx`, Shop `ShopScreen.tsx`, and Conditions `DifficultyStep.tsx` are functional components intended for the visual-design handoff. The existing Condition demo uses its walking fallback until the Bank demo worker's implementation is integrated.
