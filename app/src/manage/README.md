# `app/src/manage` — the Manage tab

Tab 2. The user's economy editor: the daily base allowance plus every condition they have built,
what it earns, whether it is switched on, and the two row edits — change it, or delete it.

The route is thin by ARCHITECTURE.md §1: `app/app/(tabs)/manage.tsx` is three lines that re-export
`ManageScreen`.

## The one rule

**Manage creates nothing and owns nothing.** Creating a condition is Home's (#40); the allowance,
conditions, on/off switch and every save live in Home's store. This module is an editor over that
one persisted owner.

| Question | Answered by |
| --- | --- |
| What is the daily base allowance? | `@/home` — `useHomeStore.ledgerConfig.baseAllowanceMinutes` |
| How does Full Lock remember what it replaced? | `@/home` — the same store's allowance transition |
| What conditions exist? What is switched off? | `@/home` — `useHomeStore` |
| What is this condition called, and what does it pay? | `@/home` — `toConditionCards`, via `model/conditionRows.ts` |
| How do I change one? | `@/home` — `ConditionBuilderSheet` + `draftFromCondition` |
| Can I build a new one here? | No. The empty state points at Home. |

## Layout

| File | Responsibility |
| --- | --- |
| `screens/ManageScreen.tsx` | Composes the allowance, list, builder in edit mode, and empty state. Owns two `useState`: which row is being edited, which row is asking to be deleted. |
| `components/AllowanceCard.tsx` | Stateless 0–4 h stepper with Full Lock at zero and Unlimited past the top |
| `model/conditionRows.ts` | One row model per condition — title, source, what it earns, on/off |
| `components/ConditionRow.tsx` | One row: switch, earn line, and either the actions or the delete confirmation |
| `components/RowAction.tsx` | The quiet in-row button (`PillButton` is the screen-level pill) |
| `components/ManageEmpty.tsx` | Nothing to manage yet → go to Home |

## Editing reuses Home's builder

There is no second builder. `draftFromCondition` turns a saved condition back into a `BuilderDraft`
on the **configure** step — the catalog entry and the source are what a condition *is*, so changing
either would be a create, not an edit — and the sheet's `createId` returns the existing id, so the
save replaces the condition in place. `Back` never goes behind the step the sheet opened on.

The sheet reads `initialDraft` once, on mount, so the screen mounts it under `key={condition.id}`:
editing a second condition is a second sheet, not a re-seeded one.

## Off is not deleted

A switched-off condition keeps its uniqueness key in the picker context — its catalog slot stays
taken, and turning it back on restores exactly what was built. What it loses is today: it leaves the
Home dashboard and the store refuses to bank its payouts (`store/homeStore.ts`).

Deleting asks first, inline in the row. One row can be asking at a time; the answer is `Yes, delete`
or `Keep`. There is no `Alert` — a native dialog cannot be driven by a test or by Maestro.

## The allowance is not a condition

The allowance card is always present, including the empty-condition state. It writes the 5-minute
grid (0–4 h plus Unlimited) straight to Home's `ledgerConfig`; it has no local state and no mirrored
value. Zero uses the same transition as lock's Full Lock switch, so entering remembers the prior
non-zero allowance and exiting restores it. Home's balance and the running lock controller both
react to that one write.

## Owed

- **The rest of the economy editor** — rollover and day boundary still need Manage controls.
- **Apps and rules** — the shield's app selection also belongs to this tab, and lands with
  `app/src/shield`.
- **Reordering** conditions is not offered; rows are listed in the order they were built.

## Tests

`npm run test:app` from the repository root, or `npm run test --workspace app -- manage`.

One trap worth naming, inherited from Home's README: **`fireEvent.press` is async in React Native
Testing Library 14** and must be awaited. Two more found here — do not call `unmount()` on a render
and then render again inside the same test (it detaches `screen` for every test that follows; force a
remount with a `key` on `rerender` instead), and `@/home`'s public surface reaches its store, so any
test that imports this module must mock `@react-native-async-storage/async-storage`.
