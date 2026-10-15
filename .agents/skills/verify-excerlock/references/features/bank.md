---
id: bank
title: Bank Conditions and Shop
routes: [(tabs)/shop]
scenarios: [bank-fresh, bank-pending, bank-routine, bank-rich, bank-empty, bank-broke, bank-before-midnight, bank-onboarding, home-no-rules]
events: [bank_condition_created, offer_bought, points_collected, bank_emptied]
depends: [conditions, home, onboarding, enforcement]
---
## Sub-features
- One walking or gym Bank Condition, with Easy, Medium or Hard Difficulty and no Schedule.
- Verified steps and confirmed gym minutes after creation earn whole Points per Day at that Day's Difficulty.
- Home shows Bank time, Points, collect, and today's daily minimum. The Streak uses that minimum.
- Shop sells the four fixed Offers. Two taps confirm a purchase. Unaffordable Offers show activity to go.
- Bank time starts at 12 h, drains only from the BankDrainPort usage evidence, and persists per account.
- Editing Difficulty takes effect next Day. Removing the Condition deletes its Points and Bank and opens Locked apps.

## How to get to it (user POV)
Choose Buy screen time on the walking or gym unlock question, then choose Difficulty. Continue to the plan without a Schedule. After setup Home has the Bank and the Shop tab appears. Conditions opens Difficulty editing and deletion.

## Driving it with excer
Use `./excer demo bank-pending --open /home`. The other Bank scenarios open Home or Shop in a known state. Dev menu → Bank usage can simulate usage; it never substitutes wall-clock time for usage.

```proof
name: onboarding-choice
scenario: bank-onboarding
open: /onboarding/W2
actions: tap Buy screen time | tap Continue
expect: What should an hour of screen time cost? | Easy | Medium | Hard | 3,300 steps = 1 h
```

```proof
name: onboarding-plan
scenario: bank-onboarding
open: /onboarding/W2
actions: tap Buy screen time | tap Continue | tap Medium | tap Continue
expect: 3,300 steps = 1 h of screen time
absent: When should blocking be active? | Add another Condition
wait: 20
```

```proof
name: home-bank
scenario: bank-fresh
open: /home
expect: Bank | 12 h | 0 Points | 0 / 6,000 steps | Shop
absent: Uncaught (in promise | LogBox
```

```proof
name: collect
scenario: bank-pending
open: /home
tap: Collect 120 Points
expect: 120 Points | 12 h | 3,960 / 6,000 steps
absent: Collect 120 Points
```

```proof
name: shield-shop-link
scenario: bank-empty
open: excerlock://shop
expect: Shop | Points | 15 m | 1 h | 3 h | 6 h
```

```proof
name: shield-shop-notification
scenario: bank-empty
open: /dev?notification=shop
expect: Shop | Points | 15 m | 1 h | 3 h | 6 h
```

```proof
name: buy
scenario: bank-empty
open: /shop
tap: 1 h for 100 Points | Buy 1 h for 100 Points
expect: 0 Points | Shop
then-open: /home
then-expect: Bank | 1 h | 0 Points
```

```proof
name: cant-afford
scenario: bank-broke
open: /shop
tap: 15 min for 25 Points
expect: 5 Points | ≈ 660 steps to go
absent: Buy 15 min
```

```proof
name: shop-hidden
scenario: home-no-rules
open: /home
expect: Home | Conditions | Analytics | Settings
absent: Shop
```

```proof
name: removal-unlocks
scenario: bank-empty
open: /conditions
actions: tap More actions | tap Delete | expect Delete this Condition and its Bank? | tap Delete condition
expect: Your first condition starts here
then-open: /home
then-expect: Unlocked
absent: Shop | Uncaught (in promise | LogBox
```

```proof
name: difficulty-next-day
scenario: bank-before-midnight
open: /conditions
actions: tap Walking · Medium | tap Edit condition | expect Edit condition | tap Edit goal | expect What should an hour of screen time cost? | expect Difficulty changes apply from the next Day. | tap Hard | tap Continue | expect 6,000 steps = 1 h | tap Save condition | open /home | expect 0 / 6,000 steps | open /dev?advance=420000
expect: Bank | 12 h | 0 / 10,000 steps
```

```proof
name: drain
scenario: bank-fresh
open: /home
actions: expect 12 h | open /dev?scenario=bank-fresh&keep=1 | expect 12 h | open /dev
swipe: 0.5,0.8,0.5,0.6
expect: Use 15 Bank minutes
then-tap: Use 15 Bank minutes
then-open: /home
then-expect: Bank | 11 h 45 m
```

## Gotchas
- JS-only phase: createRealRuntime uses createNoopBankDrain in runtime/lib/NoopBankDrain.ts. Replace that factory with NativeBankDrain at integration. Native drain accuracy and closed-app re-lock require the physical-iPhone spike in ADR 0081.
- Bank has an all-week/all-day persisted Schedule for Rule validation and History; no Schedule is presented to the user. Enforcement excludes Bank from weekly windows and watchdogs.
- Home and Shop use the `ui` reward kit. Labels are accessibility labels ("Collect 120 Points", "1 h for 100 Points", "Buy 1 h for 100 Points"), not the visible chip text. `bank-routine` holds Points and has more waiting, for a routine Collect without confetti.
- The drain proof reloads the same scenario with edits retained before spending time, so the fake monitor must keep its armed state across that reload.
- Simulator proofs establish settled state and fake usage, not real Screen Time thresholds, HealthKit delivery or physical activity.
