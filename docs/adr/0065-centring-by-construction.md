---
status: accepted
date: 2026-10-04
---

# 0065: Text and icons are centred by construction and every proof measures it

## Decision

Centring is a property of the `ui` components, and checks enforce it.

- **Text.** `Label` moves its glyphs so the capital letters sit in the middle of the line box. The shift is `capShift(fontSize, lineHeight)`, computed from Baloo 2's metrics in `tokens.fontMetrics` and scaled with Dynamic Type. Raw Baloo text outside `Label` uses `useCapShift` or `capShift`. A single-line `TextInput` uses `TextField` or `useInputType`, which drops the line height so iOS centres the text by the font's own metrics, and keeps the token's height. Hand-tuned offsets are gone (`tokens.optical`, the `p.badge.nudge` token, one-sided negative margins on numbers).
- **Icons.** Every glyph's ink is centred in its 24-unit box and stays inside it. Library silhouettes are fitted with a `<g transform>`, never a nested `<svg>`.
- **Close and back.** `CloseButton` and `BackButton` lay out as their 24 pt glyph and get the 44 pt touch target from `PressableScale`'s hit slop. Their glyph box lines up with the page margin on every screen, so no screen compensates for padding any more.
- **Option rows.** When setup presentation centres text, `ChoiceRow` gives the leading and trailing elements equal-width slots, so the title is centred on the card, not in the space beside the radio.
- **Checks.**
  - `./excer check` runs `icon-centring`, which measures every icon's geometry.
  - Lint runs `excerlock/no-raw-input-type`, which rejects a type token on a single-line `TextInput` unless the line height is cleared.
  - Lint runs `excerlock/no-text-nudge`. It rejects transforms, `top`/`bottom` offsets, one-sided negative vertical margins and one-sided vertical padding on text. Allowed: a `capShift` translate, percentage `translateX` pins, and symmetric `marginVertical` trims.
  - Every `./excer prove` measures its final screenshot against the accessibility tree. Text and icons inside buttons, rows and tiles must sit centred (1 pt; 1.5 pt for stacked content) or against an edge. Content counts as against an edge only when it is near one edge and clear of the other, or when it pairs text with an icon or badge. An icon alone in a small tile must be centred. Anything that moves between two screenshots 0.6 s apart is skipped, and so is an axis on which the frame cuts the ink off. Glyphs cut at a side still count for the vertical check, so a title flush with its button's edge is measured by its full cap height. A proof can name deliberate exceptions with `centring-ignore`.
  - The `dev?stage=type` and `dev?stage=icons` specimens are proofs.

## Context

The owner found off-centre text and icons all over the app (2026-10-04). A pixel audit of 96 screens traced them to five shared causes:

1. **Text sat high.** Every type token sets a line height below Baloo 2's natural 1.602 em. React Native then leaves iOS to pin the baseline 0.524 em above the bottom of the line box, so the capitals sat 1.2 to 10.7 pt above centre, depending on the style. The measured offsets matched the font-metric model within 0.2 pt. Four screens had tried to fix this with a hand-tuned 0.27 em push. That push overshot primary buttons by 2.7 pt, while secondary buttons stayed 2.2 pt high.
2. **Nested `<svg>`.** react-native-svg ignores the `x` and `y` of a nested `<svg>`. The walking, gender and flame glyphs therefore rendered 2 units up and left, which is 5.3 pt on a Condition card.
3. **Off-centre artwork.** Eleven glyphs were drawn 0.35 to 1 unit off centre.
4. **Glyph insets.** Close and back glyphs sat 10 pt inside their 44 pt boxes. Some screens compensated for that and others did not.
5. **Option rows.** Centred option text was centred in the space left of the radio, about 24 pt off the card's centre.

A sixth cause appeared after the fix. Setup presentation stretched labels across the cross axis, which made PrimaryButton's label taller than its line and put it 3 pt high.

A seventh was found while proving the checks. The two animated counters (plan build and free time) are `TextInput`s styled with the `metric` token. With a line height below the font's, iOS draws input text far higher than `Text`: 20 pt above centre at 48 pt, enough to draw the free-time number above its own frame. `TextField` already avoided this by clearing the line height.

Alternatives considered:
- **Raising every line height to the font's natural height.** That would change spacing on every screen.
- **Centring icons at runtime from their measured bounds.** That hides broken artwork instead of fixing it.
- **Checking by eye.** The audit showed eyes miss 1 to 3 pt offsets, and agents keep reintroducing them.

## Consequences

- Text in buttons, rows, badges and tiles is centred on every screen without per-screen tweaks.
- Big numbers sit lower in their line boxes than before. Layouts that trimmed space under them now trim both sides equally.
- Proofs take about 1 s longer, for the second screenshot and the analysis. Screens with animation that never settles are skipped, not failed.
- Text that `adjustsFontSizeToFit` shrinks keeps the full-size shift, which is slightly too much. That is accepted: the only users are stat tiles, and the error stays well under the tolerance unless the text shrinks a lot.
- The analyzer judges ink, not intent. Artwork tiles and regions without their own surface get only the same-row alignment check. Intentional exceptions need a `centring-ignore` line that says why.

## References

- `app-next/src/packages/ui/Label.tsx` (`capShift`, `useCapShift`, `useInputType`), `tokens.ts` (`fontMetrics`), `lib/solidGlyphs.ts`, `paths.ts`, `lib/ChoiceRow.tsx`, `lib/CloseButton.tsx`, `BackButton.tsx`.
- `tools/excer/lib/centring.ts`, `lib/png.ts`, `lib/svgBounds.ts`, `checks/icons.ts`, `commands/prove.ts`; `packages/eslint-plugin-excerlock/index.cjs` (`no-text-nudge`, `no-raw-input-type`).
- `node_modules/react-native/Libraries/Text/RCTAttributedTextUtils.mm` (baseline offset applies only when the line height is at least the font's).
- Audit evidence: `.excer/centering/` (before and after screenshots, `findings.json`).
