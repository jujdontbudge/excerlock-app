import { Redirect } from "expo-router";

/**
 * Exists so the scenario deep link matches a route.
 *
 * Expo Router resolves the launch URL before the root layout mounts: a URL
 * matching no route renders its built-in Unmatched Route screen and the layout
 * — and therefore `E2ERuntimeRoot` and its gate — never renders at all. That is
 * why intercepting the URL inside the layout could not work, and why every flow
 * died on Unmatched Route while the gate looked correct in unit tests.
 *
 * With this route present the URL matches, the layout mounts, and the gate
 * above this screen loads the scenario and replaces to "/". This component
 * therefore renders nothing in an E2E build — the gate is already showing its
 * loading state over it.
 *
 * In a production build there is no gate, so send the user home rather than
 * stranding them on a blank screen.
 */
export default function E2EScenarioRoute() {
  return process.env.EXPO_PUBLIC_E2E === "1" ? null : <Redirect href="/" />;
}
