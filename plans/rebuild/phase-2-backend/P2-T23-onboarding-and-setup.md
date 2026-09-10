# P2-T23 — Onboarding and setup

Decisions: B10, B11, B24, B26, B33. Findings: 20, 26, 27, 70, 71, 72, 73, 104. Per-finding detail:
`docs/audit/fix-map.md` § P2-T23. Independent of the domain lane; can run any time after P2-T13.

## 1. Where the inventory wins (B33; findings 26, 27, 71, 72, 73, 104)

- **O19 is built** from the copy already in `content/onboarding.ts` (26). Land first: adding a screen shifts
  every path-length assertion.
- The **"illustrative"** label renders on the O15 trend chart and the O02 badge (27).
- **O10 reverts to the specified 1–12 h slider** (71); the five shipped bands go, and the answer stays
  permanent ("never editable" stands).
- **O02 and O03 get their own headings**; the duplicate O01 heading and the `title.replace` hack go (72).
  The other six rewritten headings (O08, O15, O16–O18, setup X2) are **left as shipped** and listed as an
  open question for Johan in `fix-plan.md`; no decision-register edit.
- **O06/O07**: ship only the honesty fix (stop promising tailoring the app does not do); reverting the option
  lists to the inventory waits for Johan's answer (73).
- **O03 names the four activities** the same way as everywhere else (104).

## 2. Setup sequence (findings 20, 70)

- **X3 for gym is two parts**: the gym picker inside the setup shell, then the Location primer that actually
  asks for When-in-use (and explains Always is only for auto-detect). Land before #70.
- **X5 says what is missing and lets the user fix it**: each checklist row (Screen Time, apps, Motion/Location,
  reminders) is tappable and routes to the step that fixes it; an unchecked row states why.

## Tests first

`features/onboarding/__tests__/flow.test.ts` (the real file; not `onboarding.test.tsx`): "the path includes
O19"; "O10 renders a slider from 1 to 12 hours"; "O02 and O03 headings differ from O01"; "O03 lists walking,
gym". `features/setup/__tests__/setup-router.test.tsx`: "a gym user is asked for Location
in X3"; "an unchecked X5 row routes to its fix".

## Acceptance

- [ ] `02-screen-inventory.md` matches the shipped onboarding for every row this task touches; the six
      open headings are marked "pending Johan" in the inventory, not silently ratified.
