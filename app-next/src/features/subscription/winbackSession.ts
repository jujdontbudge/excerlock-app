/**
 * The win-back rail for one JS session. Home asks the paywall route for the
 * `winback` placement when a lapsed entitlement comes back, and the paywall
 * slot records that it presented it. Both facts are in memory only, so a new
 * app session starts clean; the once-per-install onboarding decline lives in
 * the persisted `onboardingStore`.
 */
let requested = false;
let shown = false;

/** Home asks the paywall route to present the win-back placement next. */
export function requestWinbackPaywall(): void {
  requested = true;
}

/** True while a win-back request is waiting for the paywall route to adopt it. */
export function winbackPaywallRequested(): boolean {
  return requested;
}

/** The slot adopted a win-back placement: the request is spent and the session is marked. */
export function markWinbackShown(): void {
  requested = false;
  shown = true;
}

/** True once the win-back paywall has been presented in this session. */
export function winbackShownThisSession(): boolean {
  return shown;
}

/** Test seam: the flags belong to one JS session, not to one Jest module registry. */
export function resetWinbackSession(): void {
  requested = false;
  shown = false;
}
