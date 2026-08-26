import { AppState } from "react-native";

import {
  createDefaultWalkingSessionDependencies,
  installWalkingSessionController,
  WalkingSessionController,
} from "@/home/signals";

import { getDiagnosticsLog, isDiagnosticsEnabled } from "./accessor";
import { instrumentWalkingSessionDependencies } from "./walkInstrumentation";

/** Long enough to be cheap, short enough that a crash loses little. */
const FLUSH_INTERVAL_MS = 5_000;

/**
 * Installs the recorder before any surface asks for a walking session.
 *
 * Flushing is deliberately periodic rather than per-append: a walk generates a
 * cadence sample about every second, and awaiting storage inside a sensor
 * callback would put the recorder in the path of the thing it measures.
 */
export function installDiagnostics(): () => void {
  if (!isDiagnosticsEnabled()) {
    return () => {};
  }

  const log = getDiagnosticsLog();
  void log.hydrate().then(() => {
    log.append("app.launch");
  });

  const interval = setInterval(() => {
    void log.flush();
  }, FLUSH_INTERVAL_MS);

  // Backgrounding is the moment before iOS may suspend or kill us, and it is
  // also exactly when a device test starts: phone pocketed, app out of sight.
  const subscription = AppState.addEventListener("change", (appState) => {
    log.append("app.state", { appState });
    void log.flush();
  });

  const controller = new WalkingSessionController(
    instrumentWalkingSessionDependencies(
      createDefaultWalkingSessionDependencies(),
      log,
    ),
  );
  // The session snapshot is the line that answers most device questions: did
  // walking verify, when did it stop, which treadmill phase are we in.
  controller.subscribe(() => {
    log.append("session", {
      ...controller.getSnapshot(),
      ...controller.getTreadmillSnapshot(),
    });
  });
  installWalkingSessionController(controller);

  return () => {
    clearInterval(interval);
    subscription.remove();
  };
}
