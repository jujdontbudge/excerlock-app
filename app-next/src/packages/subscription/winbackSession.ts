let requested = false;
let shown = false;

export function requestWinbackPaywall(): void {
  requested = true;
}

export function winbackPaywallRequested(): boolean {
  return requested;
}

export function markWinbackShown(): void {
  requested = false;
  shown = true;
}

export function winbackShownThisSession(): boolean {
  return shown;
}

export function resetWinbackSession(): void {
  requested = false;
  shown = false;
}
