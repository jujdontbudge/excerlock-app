/**
 * App Review 3.1.2 asks every subscription screen to carry tappable Terms of Use and Privacy Policy
 * links, the price, and the renewal disclosure. With the Paywall Builder that screen is designed in the
 * Adapty dashboard, outside this repo, so the app can only inspect the payload it is handed.
 *
 * This is a text scan, not a renderer: it catches the realistic failure — a paywall published without the
 * legal block — and cannot prove that a link is reachable or that a price is the right one. Violations on a
 * fetched paywall are reported, never blocking (refusing to show a live paywall would cost the purchase);
 * a fallback bundled into the binary is ours to fix, so `assertCompliantFallback` refuses it outright.
 */
export type PaywallRequirement = 'terms' | 'privacy' | 'price' | 'renewal';

const URL_PATTERN = /https?:\/\/\S+/i;
const REQUIREMENTS: { name: PaywallRequirement; pattern: RegExp; needsLink: boolean }[] = [
  { name: 'terms', pattern: /\bterms\b/i, needsLink: true },
  { name: 'privacy', pattern: /\bprivacy\b/i, needsLink: true },
  { name: 'price', pattern: /[$€£¥]\s?\d|\d+(?:[.,]\d{2})?\s?(?:usd|eur|gbp)\b|\$\{\s*price|<price>/i, needsLink: false },
  { name: 'renewal', pattern: /renew|cancel anytime|unless (?:you )?cancel/i, needsLink: false },
];

/** Every requirement the payload cannot be shown to meet, in the order App Review reads them. */
export function paywallComplianceViolations(payload: unknown): PaywallRequirement[] {
  const strings = collectStrings(payload);
  const linked = strings.some((value) => URL_PATTERN.test(value));
  return REQUIREMENTS.filter(
    ({ pattern, needsLink }) => !(strings.some((value) => pattern.test(value)) && (!needsLink || linked)),
  ).map(({ name }) => name);
}

/** The bundled fallback ships inside the binary, so a non-compliant one is a build-time mistake. */
export function assertCompliantFallback(payload: unknown): void {
  const violations = paywallComplianceViolations(payload);
  if (violations.length === 0) return;
  throw new Error(
    `The bundled Adapty fallback paywall is missing ${violations.join(', ')}; App Review 3.1.2 requires tappable Terms of Use and Privacy Policy links, the price and the renewal disclosure.`,
  );
}

function collectStrings(payload: unknown, depth = 0): string[] {
  if (depth > 12) return [];
  if (typeof payload === 'string') {
    const parsed = parseJson(payload);
    return parsed === undefined ? [payload] : collectStrings(parsed, depth + 1);
  }
  if (Array.isArray(payload)) return payload.flatMap((item) => collectStrings(item, depth + 1));
  if (typeof payload === 'object' && payload !== null) {
    return Object.values(payload).flatMap((value) => collectStrings(value, depth + 1));
  }
  return [];
}

function parseJson(value: string): unknown {
  try {
    const parsed: unknown = JSON.parse(value);
    return typeof parsed === 'object' && parsed !== null ? parsed : undefined;
  } catch {
    return undefined;
  }
}
