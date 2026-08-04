# `app/src/home` — the Home dashboard

Tab 1. The lock hero, today's condition cards, and the builder that creates them.

The route is thin by ARCHITECTURE.md §1: `app/app/(tabs)/index.tsx` is three lines that re-export
`HomeScreen`. Everything below is this module's.

## The one rule

**Home decides nothing.** Every number, verdict and unit it shows is computed somewhere else:

| Question | Answered by |
| --- | --- |
| What is my balance? Are the shields down? | `@excerlock/ledger` (`reduceLedger`, `desiredOsState`) |
| What daily allowance did the user choose? | This module's `useHomeStore.ledgerConfig` — the one persisted owner |
| Which conditions can I build, and from which source? | `@excerlock/condition-model` (`listPickerVerdicts`) |
| What does this catalog entry measure, and in what unit? | `@excerlock/condition-model` (`getCatalogEntry`) |
| How many steps have I taken? Am I walking right now? | `app/src/signals` (SignalKit providers) |

This module composes those three and formats the result. When something looks like a rule here, it is
a rendering of a rule owned elsewhere — the one genuine exception is documented in `model/lockState.ts`
(a live state condition holds the shields open, which the ledger cannot see).

## Layout

| File | Responsibility |
| --- | --- |
| `screens/HomeScreen.tsx` | Composes hero + cards + builder. Owns one `useState`: is the sheet open. |
| `model/lockState.ts` | The hero's view model — status, balance, headline, the one detail line |
| `model/conditionCards.ts` | One card model per condition, in its kind's variant |
| `model/duration.ts` | Every string with a number in it. Nothing else formats. |
| `model/reading.ts` | `SignalReading` — today's totals plus what is true right now |
| `model/clock.ts` | The single conversion to the local wall-clock ms the ledger wants |
| `signals/homeSignalFeed.ts` | Flattens SignalKit's providers into one `SignalReading` |
| `signals/appRuntime.ts` | Holds the one build-selected feed and clock installed by the app composition root |
| `signals/fixtureFeed.ts` | Phase-2 composition root: fixture providers, real-time playback |
| `signals/useHomeSignals.ts` | Subscribes a mounted screen to a feed |
| `signals/gymPresenceController.ts` | Owns manual arrival check-in, explicit auto-detect opt-in, and persisted visit claims |
| `signals/walkingSessionController.ts` | Owns explicit live verification sessions, the watchdog, active window, and sensor lifetime. Every composition root must hand it to the feed as `walkingState` — with `walking: null` and no `walkingState`, `activeSignals` can never report walking and the hold state is unreachable (this silently broke the E2E composition once, 2026-08-04) |
| `signals/SignalRuntimeHosts.tsx` | Reconciles persisted condition/settings changes after build-specific composition is installed |
| `store/homeState.ts` | Owned state shape, Unlimited default, and projections used by Home/Manage/lock |
| `store/homeStore.ts` | Mutates conditions, journal and ledger config; wires the state to AsyncStorage |
| `store/homeStorePersistence.ts` | Validates and revives persisted store fields, including Unlimited's JSON sentinel |
| `model/allowance.ts` | Base-allowance grid and Full Lock's zero/restore transitions |
| `components/` | Presentational only — every one renders a model and computes nothing |
| `builder/` | The create-condition sheet (below) |
| `testing/stubFeed.ts` | A feed that reports one fixed reading, for screen tests |

## The builder

`builder/ConditionBuilderSheet.tsx` walks **catalog → source → configure → banner → preview → save**. The source
step only appears when more than one source can supply the signal; a single selectable source is chosen
for the user.

Availability is not this module's call. `builder/builderCatalog.ts` reads `listPickerVerdicts` and only
groups, orders and drops `hidden` — so promoted / weak / impossible coverage, "already taken" and
"connect Strava first" all render straight from the picker's own verdicts and reasons.

`builder/builderDraft.ts` is the whole flow as a pure reducer, which is why the sheet is a renderer
rather than a state machine. `draftFromCondition` is its inverse — the draft that re-opens a *saved*
condition on the configure step — and with the sheet's `initialDraft` prop it is how Manage (#45)
edits through this surface instead of forking a second builder. The sheet reads `initialDraft` once,
on mount, and `Back` never goes behind the step it opened on.

**No picker is ever pre-filled** (PRD §8, decided 2026-07-28): a draft carries `undefined` until the
user chooses, and `canAdvance` will not leave the configure step until `draftCondition` can produce a
complete condition. The preview step renders that exact condition, so
the card the user approves is the card they get.

## Current boundaries

- **Health is native only in an iOS dev client; other feeds remain fixtures.** Home authorizes and
  claims Health on mount and foreground, while tests and non-dev-client builds retain fixtures.
  Persistence remains AsyncStorage and there is no server-side Apple Health API.
- **Walking is an explicit session, never an ambient feed.** Creating the condition does not start
  Motion or Location. Its card starts the shared session; the same verified snapshot drives Home and
  Lock, and removing/disabling the condition stops native work. The condition's active window is the
  only precedence restraint.
- **Gym check-in is foreground-first.** The arrival card samples the saved circle on demand with
  When-In-Use permission. Settings presents auto-detect as an optional hands-free upgrade and is the
  only `Always` permission boundary. Runtime reconciliation never promotes permission on its own.
- **The base allowance has one owner here.** It lives inside `ledgerConfig`, beside the journal the
  ledger consumes. Manage calls the store's setter; lock reads and subscribes through
  `lock/controller/ledgerSource.ts`. Full Lock is the same value going to zero and restoring
  `allowanceBeforeFullLock`, not a second mode or store. Until the user chooses, the owner holds
  `UNLIMITED`; the app does not invent a daily budget.
- **Rate conditions do not bank yet.** A rate card shows what today's activity *would* be worth.
  Health event snapshots run through ConditionEngine; detected outcomes are journaled idempotently by
  the store. Thresholdless events still use the explicit completion action. Continuous rate crediting
  remains separate Phase-3 orchestration.
- **Builder step 5 — the condition's banner — is owed.** The 21-banner library does not exist, so every
  condition wears the default card treatment. Repeatability, per-day cap and cooldown save their
  decided "off" values rather than offering controls.
- **A condition switched off in Manage leaves the dashboard.** `disabledConditionIds` lives in this
  store; `selectActiveConditions` is what the cards are built from, and `recordEventPayout` refuses a
  switched-off condition. Off is not deleted — the condition keeps its uniqueness key in the picker
  context, so its catalog slot stays taken.
- **Screen-time spend is whatever the journal holds.** Nothing reports usage yet, so `spentLabel` is 0
  until the shield module lands.

## Tests

`npm run test:app`. Screen tests inject a `stubFeed` and a fixed `now`, so no test depends on the wall
clock or on fixture playback timing.

Two traps worth naming: **`render` and `fireEvent.press` are async in React Native Testing Library
14** and both must be awaited. An un-awaited press leaves its `act` scope open and every state update
after it is silently dropped — the tree keeps rendering the old step and the failure surfaces
several presses later. Also, do not call `unmount()` and then `render()` inside one test: it detaches
the global `screen` for later tests. Force a real remount with a changed `key` on `rerender` instead.
