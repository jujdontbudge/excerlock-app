# Bank Condition: earn Points, buy screen time

Status: **spec, building**. Decisions: [ADR 0081](../adr/0081-bank-condition.md) (the Condition and its economy), [ADR 0082](../adr/0080-reward-motion.md) (reward motion). Words: `CONTEXT.md` (Bank, Points, Difficulty, Shop, Offer).

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

| | Easy | Medium | Hard |
|---|---|---|---|
| Steps per Point | 20 | 33 | 60 |
| Points per gym minute | 8 | 5 | 3 |
| Daily minimum (Streak), walking | 3,000 steps | 6,000 steps | 10,000 steps |
| Daily minimum (Streak), gym | 20 min | 30 min | 45 min |

Offers, the same at every Difficulty: **25 → 15 min · 100 → 1 h · 250 → 3 h · 450 → 6 h**.

Points are whole numbers: `floor(stepsSinceCreation / stepsPerPoint)` accumulated per Day at that Day's Difficulty, so a Difficulty change never revalues Points already earned.

### Lock decision

When a Bank Condition is enabled it is the only Condition, and the decision is:
- Bank above zero → open (`unlockedBank`).
- Bank at zero → `locked`, with the hint that the Shop sells time.

### Analytics (no amounts, ever)

`bank_condition_created` (`activity`, `difficulty`), `offer_bought` (`offer_id`), `points_collected`, `bank_emptied`. Points, minutes and steps never leave the device. Follow `packages/analytics-events/README.md`.

## Screens

Read `app-next/src/packages/ui/UI-STYLE.md` first. Everything centred by construction (ADR 0065). No emoji. Reward motion only where a value moves (ADR 0082); everything else is still (ADR 0053).

### Points token

Our own SVG icon in the `ui` icon set: a round token with the walking or gym glyph inside, accent orange, matching the Bank Condition's activity. Must read at pill size (16–20 pt), hero size and as a flying token.

### Home (a Bank Condition is enabled)

Top to bottom, centred:
1. **Bank hero card**: the Bank as the one hero number ("3 h 12 m"), rolling digits, over a calm liquid level in a borderless soft grey card.
2. **Points pill** with the Points token, e.g. "340". Tapping opens the Shop.
3. **Collect chip** "+120" when Points are waiting. Tapping plays the arc: 5–8 tokens arc into the Points pill, each landing ticks the number and pulses the pill, one haptic at the end. Routine collect gets this and nothing more; the first collect ever gets one confetti burst.
4. **Today line**: "4,210 / 6,000 steps" toward the Difficulty's daily minimum (gym: minutes).
5. The **Locked apps** row.

The Condition cards are replaced by this; Streak badge stays.

### Shop tab

Tabs: **Home · Shop · Conditions · Analytics · Settings**; Shop exists only while a Bank Condition is enabled.

- Points balance as the centred hero with the token.
- 2×2 grid of the four Offers ("3 h" big, "250" with token small).
- **Buy**: first tap turns the card into "Buy · 250"; second tap buys. Sequence: Points roll down → a "+3 h" chip flies from the card toward the Home tab → the Home tab icon pulses once → unlock haptic if the Bank was empty (the Shield just lifted), success otherwise.
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

- `model`: `RuleMode` gains `{ kind: 'bank'; activity: 'walking' | 'gym'; difficulty: 'easy' | 'medium' | 'hard' }`; `LockDecision` gains `unlockedBank`.
- New package **`bank`**, layer between `progress` and `lock`: the persisted Points/Bank store (per-account through `AccountDataCoordinator`), the economy tables, earning projection, `collectPoints`, `buyOffer`, drain application, and hooks. Only `bank` writes its store.
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
  points: number;
  pendingPoints: number;
  bankMinutes: number;
  today: { amount: number; minimum: number; met: boolean };
};
export const offers: readonly Offer[];
export function useBank(): BankView | null;
export function collectPoints(): number;
export function buyOffer(id: OfferId): 'bought' | 'insufficient';
export function activityToGo(view: BankView, offer: Offer): number;
```

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

`bank-fresh` (just created, 12 h, 0 Points), `bank-pending` (Points waiting to collect), `bank-rich` (enough for every Offer), `bank-empty` (Bank 0, Shield up, some Points), `bank-broke` (Bank 0, too few Points for any Offer). Each opens Home and the Shop in a known state.

## Verification

- `./excer check` passes.
- Feature map: new `.agents/skills/verify-excerlock/references/features/bank.md` with proofs for onboarding choice → Difficulty → plan, Home Bank, collect, buy, can't afford, Shop tab hidden without a Bank Condition, removal unlocks.
- Drain accuracy cannot be proved on the simulator. A real-iPhone spike checks: ladder event ceiling, tick lag, re-lock at zero with the app closed. Gate before release, not before building.

## Out of scope for v1

Notifications, emergency unlock, Bank beside other Conditions, sharing Points across Conditions, share cards, escalating prices.
