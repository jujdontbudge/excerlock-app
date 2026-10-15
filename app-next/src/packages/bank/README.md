# Bank

The UI contract is `Bank.ts`. It exports `Difficulty`, `OfferId`, `Offer`, `BankView`, `offers`, `useBank()`, `collectPoints()`, `buyOffer(id)` and `activityToGo(view, offer)` with the signatures in `docs/specs/bank-condition.md`.

`model/bankEconomy.ts` owns the Difficulty rates, daily minimums and Offers. Bank earning, Conditions copy (used by onboarding and the editor), and the onboarding demo read those tables. `economy.ts` keeps only BankView and the activity-to-go projection; copy and Offer duration formatting stay in their packages' copy files.

`bankStore.ts` alone owns the persisted `excerlock-next.bank.v1` data. `AccountData.ts` joins AccountDataCoordinator; older account snapshots without Bank data restore an empty Bank store. Condition removal clears the account data. Turning a Condition off preserves it and hides Shop.

`BankEvidence.ts` consumes the same exact step measurements and confirmed gym intervals as Progress. Ranges start at Condition creation, then follow local Days. Each Day keeps its Difficulty, amount, total whole Points already projected and measurement cursor. Collect moves pending Points into Points without resetting those cursors. Collect sets the persisted `collectedOnce` flag; `firstCollect` is true until then, so Home plays the one confetti burst. Accounts saved before the flag fall back to their history: Points held or Day Points beyond those pending mean a Collect already happened. Difficulty changes are pending until the next Day; the Difficulty timeline preserves rates for delayed evidence.

Missing or empty earning ranges resume after the latest persisted Day cursor, so imported Day totals cannot be counted again. New accounts have neither Days nor ranges and start at creation. Once ranges exist, their original starts and amounts survive persistence and account restoration; cumulative measurements add only the increase over each range's amount. Sealed Days are skipped by both measurement planning and projection.

`BankLifecycle.ts` owns the drain subscription and monitor arms. Usage is cumulative since the last arm; only its unapplied difference is deducted. Changes to Bank time re-arm the monitor, removal or pausing disarms it. No wall clock drains Bank time.

The real runtime uses `enforcement/NativeBankDrain`. The simulator does not establish physical-device threshold accuracy or closed-app re-locking. See ADR 0081's device spike.

Home `BankSection.tsx`, Shop `ShopScreen.tsx`, and Conditions `DifficultyStep.tsx` are functional components intended for the visual-design handoff. The existing Condition demo uses its walking fallback until the Bank demo worker's implementation is integrated.
