import { getLocationProvider } from "@/signals";
import type { LocationProvider } from "@/signals";
import type { HarnessKeepAlive } from "./HarnessRunEngine";

type WalkKeepAlive = Pick<
  LocationProvider,
  "startWalkKeepAlive" | "stopWalkKeepAlive"
>;

/**
 * The harness stays awake exactly the way the product does. A walk survives a
 * pocketed phone because `WalkingSessionController` opens background location
 * updates for its duration; without the same hold, iOS suspends the harness
 * mid-run and the JavaScript timer that ends the run never fires.
 *
 * The provider is resolved per call, not per run: nothing is created — or any
 * permission asked for — until a run actually starts.
 */
export function createLocationKeepAlive(
  getLocation: () => WalkKeepAlive = getLocationProvider,
): HarnessKeepAlive {
  return {
    start: () => getLocation().startWalkKeepAlive(),
    stop: () => getLocation().stopWalkKeepAlive(),
  };
}
