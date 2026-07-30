/**
 * One place that decides whether a URL selects an E2E scenario.
 *
 * iOS hands the same link to the app in two shapes: `excerlock://e2e/scenario/x`
 * when it arrives warm as an `onURLReceived` event, and `excerlock:///e2e/scenario/x`
 * when it cold-launches the app and is read back through `getLinkingURL()` —
 * the authority is empty and `e2e` slides into the path. Matching the raw
 * two-slash string missed the cold form, which is why the gate stood down and
 * Expo Router rendered Unmatched Route instead.
 */
const SCHEME = "excerlock:";
const PATH_PREFIX = "e2e/scenario/";

/**
 * Returns everything after `e2e/scenario/` — the encoded name plus any query
 * and fragment — or `null` when the URL does not select a scenario at all.
 */
export function matchScenarioDeepLink(url: string | null): string | null {
  if (url === null || !url.startsWith(SCHEME)) {
    return null;
  }
  // Collapse both authority shapes: whatever slashes follow the scheme, the
  // scenario path is what remains after them.
  const path = url.slice(SCHEME.length).replace(/^\/+/, "");
  if (!path.startsWith(PATH_PREFIX)) {
    return null;
  }
  const remainder = path.slice(PATH_PREFIX.length);
  return remainder.length === 0 ? null : remainder;
}
