import { useLinkingURL, useURL } from "expo-linking";

import { matchScenarioDeepLink } from "./scenarioUrl";

/**
 * Which linking URL the scenario gate should act on.
 *
 * `useLinkingURL()` reads the Expo module's cached launch URL; `useURL()` is
 * backed by React Native's own `Linking` (`getInitialURL()` plus the `url`
 * event). Expo Router navigates off the React Native one, so on this app a
 * cold `openurl` reached the router -- it rendered Unmatched Route naming the
 * link -- while the Expo-module hook left the gate with `null` and the gate
 * stood down. Reading both removes the guess about which one fires.
 */
export function pickScenarioUrl(
  candidates: readonly (string | null)[],
): string | null {
  return (
    candidates.find(
      (candidate) => matchScenarioDeepLink(candidate) !== null,
    ) ?? null
  );
}

/** The scenario deep link, from whichever linking source delivered it. */
export function useScenarioUrl(): string | null {
  const linkingUrl = useLinkingURL();
  const reactNativeUrl = useURL();
  return pickScenarioUrl([linkingUrl, reactNativeUrl]);
}
