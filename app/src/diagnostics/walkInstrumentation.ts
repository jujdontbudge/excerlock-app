import type { WalkingSessionDependencies } from "@/home/signals";
import type {
  ActivitySample,
  CadenceSample,
  MotionProvider,
} from "@/signals";

import type { DiagnosticsLog } from "./DiagnosticsLog";

/**
 * Decorates the real walking dependency set so a device run leaves a record.
 *
 * It decorates rather than rebuilds on purpose. The previous recorder assembled
 * its own dependency object, and when `createPlacement` and `leaseWarning` were
 * added to the production set the copy silently lacked them -- propped mode was
 * dead in the one build meant to prove it. Spreading the real set means a new
 * dependency is carried through whether or not anyone remembers this file.
 */
export function instrumentWalkingSessionDependencies(
  dependencies: WalkingSessionDependencies,
  log: DiagnosticsLog,
): WalkingSessionDependencies {
  const { createMotion, createPlacement, getLocation } = dependencies;

  return {
    ...dependencies,
    createMotion: () => instrumentMotion(createMotion(), log),
    createPlacement:
      createPlacement === undefined
        ? undefined
        : () => {
            log.append("placement.created");
            return createPlacement();
          },
    getLocation: () => {
      const location = getLocation();
      return {
        startWalkKeepAlive: async () => {
          log.append("location.startWalkKeepAlive");
          await location.startWalkKeepAlive();
        },
        stopWalkKeepAlive: async () => {
          log.append("location.stopWalkKeepAlive");
          await location.stopWalkKeepAlive();
        },
      };
    },
  };
}

function instrumentMotion(
  provider: MotionProvider,
  log: DiagnosticsLog,
): MotionProvider {
  log.append("motion.created", {
    availability: provider.getAvailability(),
    authorization: provider.getAuthorizationStatus(),
  });

  return {
    getAvailability: () => provider.getAvailability(),
    getAuthorizationStatus: () => provider.getAuthorizationStatus(),
    requestAuthorization: async () => {
      const status = await provider.requestAuthorization();
      log.append("motion.authorization", { status });
      return status;
    },
    start: async () => {
      log.append("motion.start");
      await provider.start();
    },
    stop: async () => {
      log.append("motion.stop");
      await provider.stop();
    },
    queryActivity: (fromMs, toMs) => provider.queryActivity(fromMs, toMs),
    querySteps: (fromMs, toMs) => provider.querySteps(fromMs, toMs),
    on: ((event: "activity" | "cadence", callback: (sample: never) => void) => {
      if (event === "activity") {
        return provider.on("activity", (sample: ActivitySample) => {
          log.append("motion.activity", {
            classes: sample.classes,
            confidence: sample.confidence,
            startedAt: sample.startedAt,
            receivedAt: sample.receivedAt,
          });
          (callback as (sample: ActivitySample) => void)(sample);
        });
      }
      return provider.on("cadence", (sample: CadenceSample) => {
        log.append("motion.cadence", {
          stepsPerSecond: sample.stepsPerSecond,
          cumulativeSteps: sample.cumulativeSteps,
          asOf: sample.asOf,
        });
        (callback as (sample: CadenceSample) => void)(sample);
      });
    }) as MotionProvider["on"],
  };
}
