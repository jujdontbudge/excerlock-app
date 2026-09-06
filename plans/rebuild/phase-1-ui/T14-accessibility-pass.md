# T14 — Accessibility, Dynamic Type, Reduce Motion, VoiceOver pass

## Steps

1. Lint rule + test helper: every `Pressable`/row/switch has `accessibilityRole` and a label; sliders and
   number fields expose `adjustable` with value text; progress exposes `progressbar` with `now/max`.
   A repo-wide test walks every preview and every scenario-mounted screen asserting the rule.
2. Dynamic Type: run every screen at `UICTContentSizeCategoryAccessibilityL` via simctl defaults; fix any
   clipped CTA, overlapping row text, or truncated metric. Rule: layouts grow vertically and scroll; the
   footer CTA never shrinks below 54 pt or two lines.
3. Reduce Motion: run every animated screen with `ReduceMotionEnabled 1`
   (`xcrun simctl spawn <udid> defaults write com.apple.Accessibility ReduceMotionEnabled 1`), verify the
   fallback crossfades, no zero-duration jumps that hide state (e.g. S2 checklist still shows checks).
4. VoiceOver order: for Home and O01–O20, verify focus order matches visual order (use the accessibility
   inspector via `xcrun simctl` screenshot + `idb ui describe-all` for the tree). Fix with
   `accessibilityViewIsModal` on sheets and `importantForAccessibility` on decorative art.
5. Color: automated contrast test already in T02; verify state colors (`success`, `error`) are never the only
   signal (icon + text).
6. Evidence: XL screenshots of every screen; Reduce Motion recording of onboarding; a11y tree dumps for Home.

## Acceptance

- [ ] a11y lint/test suite green; zero screens with unlabeled controls.
- [ ] XL screenshots reviewed: no clipping (list in `evidence/T14/xl-review.md`).
- [ ] Reduce Motion path recorded for onboarding, Home unlock, sheets, Analytics period change.
