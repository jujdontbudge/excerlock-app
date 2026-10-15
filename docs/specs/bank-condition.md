# Bank Condition: earn Points, buy screen time

Status: **spec, building**. Decisions: [ADR 0081](../adr/0081-bank-condition.md) (the Condition and its economy), [ADR 0080](../adr/0080-reward-motion.md) (reward motion). Words: `CONTEXT.md` (Bank, Points, Difficulty, Shop, Offer).

## The product in one paragraph

On the "how does this unlock" step (W2 for walking, G1 for gym) the person can pick **Buy screen time**. That creates a **Bank Condition**: no goal, no Schedule, a Difficulty instead. Their activity earns **Points**. A new **Shop** tab sells screen time for Points. Bought time goes into the **Bank**, shown on Home. Locked apps are open whenever the Bank is above zero and locked when it is empty. The Bank drains only while Locked apps are actually in use.

## Rules (all settled; do not re-decide)

| Rule | Value |
|---|---|
| Where it is chosen | A third option on W2 (walking) and G1 (gym) |
| Steps after it | Difficulty picker replaces the goal step (W3 / G2); the Schedule step (S1) is skipped |
| How many | One Bank Condition at a time; no other Condition beside it (onboarding "Add another Condition" hidden; editor refuses) |
| Starting Bank | 12 h, every time a Bank Condition is created (re-adding gives 12 h again) |
| Removal | Removing the Condition deletes its Points and Bank; nothing stays locked |
| Expiry and caps | None on Points or Bank |
| Earning starts | From the moment the Condition is created; no backfill |
| Evidence | Same verified step and gym-minute evidence that Progress uses |
| Difficulty change | Allowed in the editor; applies from the next Day |
| Drain | Only while Locked apps are in use (DeviceActivity usage-threshold ladder, iOS 17.4 `includesPastActivity`), re-locks at zero with the app closed |
| Emergency unlock, notifications | None in v1 |
| Streak | A Bank Condition Day is met at the Difficulty's daily minimum |

### Economy

**One step is one Point**, at every Difficulty, so balances look big. A gym minute is 165 Points (Medium's 20 gym minutes buy 1 h, like 3,300 steps). **Difficulty sets the prices**, not the earning rate.

| | Easy | Medium | Hard |
|---|---|---|---|
| 1 h costs | 2,000 Points | 3,300 Points | 6,000 Points |
| Offers 15 m · 1 h · 3 h · 6 h | 500 · 2,000 · 5,000 · 9,000 | 825 · 3,300 · 8,250 · 14,850 | 1,500 · 6,000 · 15,000 · 27,000 |
| Daily minimum (Streak), walking | 3,000 steps | 6,000 steps | 10,000 steps |
| Daily minimum (Streak), gym | 20 min | 30 min | 45 min |

Points are whole numbers: one per verified step, 165 per verified gym minute. Prices follow the Difficulty in effect today; a Difficulty change applies from the next Day, prices included, so Points already held buy at the new prices from then on.

### Lock decision

When a Bank Condition is enabled it is the only Condition, and the decision is:
- Bank above zero → open (`unlockedBank`).
- Bank at zero → `locked`, with the hint that the Shop sells time.

### Analytics (no amounts, ever)

`bank_condition_created` (`activity`, `difficulty`), `offer_bought` (`offer_id`), `points_collected`, `bank_emptied`. Points, minutes and steps never leave the device. Follow `packages/analytics-events/README.md`.

## Screens

Read `app-next/src/packages/ui/UI-STYLE.md` first. Everything centred by construction (ADR 0065). No emoji. Reward motion only where a value moves (ADR 0080); everything else is still (ADR 0053).

### Points token

Our own SVG icon in the `ui` icon set: a round token with the walking or gym glyph inside, accent orange, matching the Bank Condition's activity. Must read at pill size (16–20 pt), hero size and as a flying token.

### Home (a Bank Condition is enabled)

Top to bottom, centred:
1. **Bank hero card**: the Bank as the one hero number ("3 h 12 m"), rolling digits, over a calm liquid level in a borderless soft grey card.
2. **Points pill** with the Points token, e.g. "11,220". Tapping opens the Shop.
3. **Collect chip** "+4,210" when Points are waiting. Tapping plays the arc: 5–8 tokens arc into the Points pill, each landing ticks the number and pulses the pill, one haptic at the end. Routine collect gets this and nothing more; the first collect ever gets one confetti burst.
4. **Today line**: "4,210 / 6,000 steps" toward the Difficulty's daily minimum (gym: minutes).
5. The **Locked apps** row.

The Condition cards are replaced by this; Streak badge stays.

### Shop tab

Tabs: **Home · Shop · Conditions · Analytics · Settings**; Shop exists only while a Bank Condition is enabled.

- Points balance as the centred hero with the token.
- 2×2 grid of the four Offers ("3 h" big, "8,250" with token small).
- **Bank chip, top right**: the Shop header carries a chip showing the Bank's screen time (e.g. "3 h 12 m"). It is where purchases land.
- **Buy**: first tap turns the card into "Buy · 8,250"; second tap buys. Sequence: a stream of Points tokens bursts from the Offer card and arcs into the top-right Bank chip while the Points hero rolls down; as they land the chip grows, rolls up to its new time with a "+3 h" chip popping from it, then settles → unlock haptic if the Bank was empty (the Shield just lifted), success otherwise. Big, vivid and filmable; nothing else on the screen moves.
- **Can't afford**: card dimmed, shows "≈ 1,400 steps to go" (or gym minutes) with a thin progress ring. Tap → gentle shake + warning haptic. No notice, no red text.

### Onboarding

- W2 / G1: third option **Buy screen time** (copy can be sharpened; one short line under it).
- Difficulty picker: three cards Easy / Medium / Hard. Each states its trade in plain words, e.g. "Medium · 3,300 steps = 1 h". Selected card expands, the others settle on a spring.
- Plan screen (S3 / imported plan): the Bank Condition card shows the trade ("3,300 steps = 1 h of screen time") beside the existing plan goals. No "you start with 12 h", no "normal day" line.
- Onboarding copy keeps its pain-and-commitment tone. It uses the person's own answers and real math; it never invents outcome claims.

### Condition demo (S3b), Bank scenario

The existing stage: a walking character on the left captioned **"You walk"**, a phone on the right captioned **"You buy screen time"**. Points tokens arc from the character into the phone; the phone's Shop buys an Offer; the Bank fills; the phone's Shield lifts. About 6 s. Hold to walk, like the walking demo.

### Conditions editor

A Bank Condition card shows activity, Difficulty and the trade. Editing changes Difficulty (from next Day). Delete removes it (and the Bank).

### Shield

Bank empty: title "Your Bank is empty", subtitle "Earn Points to buy more time", button opens ExcerLock at the Shop.

## Code shape

Follow `ARCHITECTURE.md`. Suggested placement; the implementer may adjust if `./excer check` demands it:

- `model`: `RuleMode` gains `{ kind: 'bank'; activity: 'walking' | 'gym'; difficulty: 'easy' | 'medium' | 'hard' }`; `LockDecision` gains `unlockedBank`. `bankEconomy.ts` owns the fixed earning rates, Difficulty prices, daily minimums and Offers, including the values used by Conditions copy and demos.
- New package **`bank`**, layer between `progress` and `lock`: the persisted Points/Bank store (per-account through `AccountDataCoordinator`), earning projection, `collectPoints`, `buyOffer`, drain application, and hooks. Only `bank` writes its store.
- `lock`: `resolveLock` handles the Bank Condition.
- `enforcement` + native: the drain ladder through `ports/BankDrainPort.ts`.
- `ui`: Points token icon and reward-motion primitives.
- New package **`shop`** (layer of `home`) for the Shop screen; `home` renders the Bank section; route `app/(tabs)/shop.tsx`.
- `onboarding`, `editor`, `conditions`: the option, Difficulty step, plan card, editor card.
- `dev-harness`: fakes and scenarios.

### Public `bank` API (the contract UI builds against)

```ts
export type Difficulty = 'easy' | 'medium' | 'hard';
export type OfferId = 'm15' | 'h1' | 'h3' | 'h6';
export type Offer = { id: OfferId; price: number; minutes: number };
export type BankView = {
  activity: 'walking' | 'gym';
  difficulty: Difficulty;
  offers: readonly Offer[];
  points: number;
  pendingPoints: number;
  firstCollect: boolean;
  bankMinutes: number;
  today: { amount: number; minimum: number; met: boolean };
};
export function offersFor(difficulty: Difficulty): readonly Offer[];
export function useBank(): BankView | null;
export function collectPoints(): number;
export function buyOffer(id: OfferId): 'bought' | 'insufficient';
export function activityToGo(view: BankView, offer: Offer): number;
```

`BankView.offers` contains the prices for the Difficulty in effect today. `buyOffer(id)` resolves those same prices at purchase time. `offersFor(difficulty)` is the pure price table. The legacy `offers` export contains Medium prices solely for the designer-owned Shop's API transition; switch Shop to `bank.offers` and remove that export when integrating.

### `ports/BankDrainPort.ts` (byte-for-byte; whoever lands first creates it)

```ts
import { Unsubscribe } from '../model/models';
export type BankDrainUsage = { usedMinutes: number; observedAt: string };
export interface BankDrainPort {
  arm(bankMinutes: number): Promise<void>;
  disarm(): Promise<void>;
  usage(): Promise<BankDrainUsage>;
  subscribe(callback: (usage: BankDrainUsage) => void): Unsubscribe;
}
```

`arm` (re)starts a monitor whose threshold ladder covers `bankMinutes` of Locked-app usage with `includesPastActivity`, and whose last threshold shields from the extension. `usage` reads minutes used since the last `arm`, recorded by the extension in the App Group. Every purchase and every collect that changes the Bank calls `arm` again. Tick size: 1 minute if the device spike passes, else 5.

## Demo scenarios (dev-harness)

`bank-fresh` (just created, 12 h, 0 Points), `bank-pending` (4,210 Points waiting, 12 h), `bank-routine` (11,220 Points held, 3,960 waiting, 3 h 12 m), `bank-rich` (33,000 Points, enough to buy all four Medium Offers, 12 h), `bank-empty` (Bank 0, Shield up, 3,300 Points), `bank-broke` (Bank 0, 300 Points, too few for any Medium Offer). Each opens Home and the Shop in a known state.

## Verification

- `./excer check` passes.
- Feature map: new `.agents/skills/verify-excerlock/references/features/bank.md` with proofs for onboarding choice → Difficulty → plan, Home Bank, collect, buy, can't afford, Shop tab hidden without a Bank Condition, removal unlocks.
- Drain accuracy cannot be proved on the simulator. A real-iPhone spike checks: ladder event ceiling, tick lag, re-lock at zero with the app closed. Gate before release, not before building.

## Out of scope for v1

Notifications, emergency unlock, Bank beside other Conditions, sharing Points across Conditions, share cards, escalating prices.

## Device spike

Run on a real iPhone with iOS 17.4 or later and the new **Debug** binary. This is
a release gate; simulator proofs cannot produce Locked-app usage or prove a
Shield blocks an app. Record device/iOS/build, tick size, observed callback lag,
re-lock delay, ladder size and extension memory locally; never send selection,
usage, minutes or Points to analytics or the server.

1. Clear any existing scheduled/watchdog enforcement through the ordinary
   Condition controls first. Use the dev runtime (Demo mode) for this isolated
   native spike so the Bank controller does not re-arm it in the foreground.
   Open **Developer menu → Bank drain diagnostic**, or
   `excerlock://diagnostics/bank-drain`. A new native Debug build is required;
   the diagnostic and spike-arm bridge are absent in release binaries.
2. Tap **Disarm Bank**. Confirm `Arm state: disarmed`, used minutes 0, Bank
   monitor stopped and Bank shield clear. Tap **Choose Locked apps**, grant
   Screen Time and select only Instagram. The selection stays opaque and native.
3. Leave **Bank minutes** at `15`, select **1 minute**, and tap **Arm Bank**.
   Confirm armed, 15 ladder events, one registered Bank monitor, used minutes 0
   and Bank shield clear. Note the arm timestamp and total monitor count.
4. Use Instagram for about three minutes. Reopen the diagnostic to inspect the
   ticks (used minutes and timestamps), comparing them with a local stopwatch.
   Spend the next two minutes in an unselected app, on the Home screen, or with
   the phone locked. Confirm this idle/unselected time does not advance usage.
5. Force-quit ExcerLock. Return to Instagram and spend the remaining selected-app
   usage. Confirm Instagram re-locks when the final 15-minute threshold arrives
   while ExcerLock is still closed. Measure threshold/re-lock lag. Reopen the
   diagnostic: used minutes must be 15, state exhausted, Bank shield configured,
   monitor stopped and the final tick timestamp retained.
6. For continuity, disarm and arm 15 minutes again after Instagram has already
   been used today. Usage must restart at zero without replaying today's earlier
   usage. Spend three minutes, read the actual highest reached tick, then arm
   `15 - usedMinutes + 15` (a 15-minute purchase after applying recorded drain).
   Confirm new-arm usage resets to zero and already-booked usage is excluded.
   Late, previously unrecorded usage may arrive immediately through
   `includesPastActivity`; it must be charged once. Re-lock must use the new
   final threshold; delayed
   callbacks from the old arm must not change the new arm's state.
7. Check the ladder ceiling at Bank minutes `180`, `720` (the initial 12 hours),
   `1440`, and `2880`. Expect 180, 720, 1440 and 1440 events respectively, with
   one Bank monitor at every arm. Inspect the monitor extension's memory/jetsam
   and registration failures. With 2880 armed, keep ExcerLock closed across the
   24-hour interval end: the extension must register the next interval, preserve
   recorded cumulative usage, and continue ticking/re-locking on the remaining
   usage. This interval continuation is a separate long device run.
8. Repeat the 15-minute, re-arm and ceiling checks with **5 minutes**. Expected
   15-minute ticks are 5, 10 and 15, and the 24-hour ladder has 288 events. If
   1-minute delivery, memory or the event ceiling fails, set the production
   `excerlockBankDrainTickMinutes` constant to 5 and repeat the device gate.
   Keep `excerlockBankDrainFallbackTickMinutes` at 5.
9. Tap **Disarm Bank** when finished. Confirm state/ticks/usage clear and the
   Bank shield lifts. Removing the Bank Condition in the integrated app must do
   the same. Confirm scheduled Conditions and the existing walking/gym watchdog
   still behave after the spike. No simulator result substitutes for this check.

Accept only if selected-app usage advances the Bank, idle/unselected usage does
not, re-arm does not double-charge earlier activity, the largest ladder registers
within extension memory limits, continuation preserves the Bank across Days, and
re-lock at zero survives force-quit. Record the measured tick lag and any sub-tick
interval rounding (one tick plus measured callback lag per boundary; a fresh
arm starts at the next whole second, while re-arm retains its interval anchor). Registration/continuation failures must show `failed` and keep the
Bank shield configured without reporting unmeasured usage as spent. If callback
delivery or that rounding is unacceptable, the drain remains blocked for release.
