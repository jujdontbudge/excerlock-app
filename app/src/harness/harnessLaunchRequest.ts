import { HARNESS_TEST_DEFINITIONS } from "./testDefinitions";

/**
 * A launch URL lets a tester (or a Mac driving the phone over USB) open a
 * specific task and start it without touching the screen:
 *
 *   excerlock://?test=c1-treadmill-walking&start=1
 *
 * The path must stay "/" — the harness is mounted inside the expo-router root
 * layout, and any other path makes the router replace it with "Unmatched
 * Route".
 *
 * Anything that does not name a known test is ignored so a stray link can
 * never put the harness into an undefined state.
 */
export interface HarnessLaunchRequest {
  readonly testId: string;
  readonly autoStart: boolean;
}

export function parseHarnessLaunchRequest(
  url: string | null | undefined,
): HarnessLaunchRequest | null {
  if (!url) return null;
  const query = url.split("?")[1];
  if (!query) return null;
  const params = new URLSearchParams(query);
  const testId = params.get("test");
  if (!testId || !HARNESS_TEST_DEFINITIONS.some((d) => d.id === testId)) {
    return null;
  }
  return { testId, autoStart: params.get("start") === "1" };
}
