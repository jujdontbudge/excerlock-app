---
status: accepted
date: 2026-09-30
---

# 0053: Screens stay still and never show error or status text

## Decision

No screen shows error, status or loading text, and nothing on a screen moves because a button was pressed. A button keeps its label and colour while its work runs and ignores extra taps (`loading` on `PrimaryButton` and `SecondaryButton`). Outcomes the user caused, such as cancelling Apple's purchase or sign-in sheet, say nothing. When the user must learn something (a failed purchase, no purchase found, approval pending, a schedule over the Screen Time limit), the app calls `notify()` from `ui/Notice`: one short, plain sentence in an outlined pill that floats over the top of the screen, never shifts the layout, lets taps pass through to the controls under it and fades out after `motion.hold.notice`. Background failures retry quietly first (plans load three times; sign-in requirements retry until they load; startup retries once). Raw error messages are reported, never shown.

This covers every shipping screen under `app-next/app` and `app-next/src/packages`, except `dev-harness` and `research`. Actionable product states remain designed content, not status text: Settings deep links for denied permissions, the Home schedule-repair card, the startup "Try again" screen and the sign-in verification "Try again" screen.

## Context

Pressing Start for free on the paywall showed "Starting your plan…", then red "Choose a plan to continue." after a cancel, and recovery text that overlapped the benefits, while the button changed to "Check purchase status". Around 25 screens had the same pattern: red `state.error` labels, `accessibilityRole="alert"` lines inserted into the layout, spinners replacing button labels, raw `error.message` in alerts and forms, and "…ing…" copy. Each inserted line pushed the rest of the screen around. The users are consumers who should not need to understand what the app is doing. Apple's guidance says not to show an alert when the user cancels a payment and not to show errors unless necessary.

Alternatives: per-screen inline banners with reserved space (still status text, and every screen reinvents it) and native `Alert.alert` (interrupts, and needs a tap to dismiss). One shared floating notice keeps screens still and the wording consistent.

## Consequences

- Screens look the same before, during and after a tap. Validation shows as a disabled Continue button or a silent correction, never red text. `TextField` and `NumberField` no longer take an `error` prop.
- `excerlock/no-status-text` fails `./excer check` on `accessibilityRole="alert"`, `ActivityIndicator`, `state.error` outside `ui`, `error.message` in `.tsx` files and "…ing…" copy.
- Proofs assert silence with the `absent:` field, which watches for four seconds after `expect` passes.
- A notice lasts 2.4 s, so a user who looks away can miss it. Every notice is also announced to VoiceOver.

## References

- `app-next/src/packages/ui/Notice.tsx`, `ui/PrimaryButton.tsx`, `ui/SecondaryButton.tsx`, `paywall/lib/PaywallScreen.tsx`
- `packages/eslint-plugin-excerlock/index.cjs` (`no-status-text`)
- [0024: Keep account access after subscription lapse](0024-keep-account-access-after-subscription-lapse.md) — **accepted**; the recovery exit stays on the verification failure screen.
- Apple, WWDC 2016 session 702, "Don't show an error alert unless necessary"; Human Interface Guidelines, Alerts.
