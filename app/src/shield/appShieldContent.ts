import type { ConfiguredCondition } from "@excerlock/condition-model";

import { EMPTY_READING, type SignalReading } from "@/home/model/reading";
import type { NotificationAuthorizationStatus } from "@/notifications";

import {
  ShieldContentCoordinator,
  type ShieldCopySource,
} from "./ShieldContentCoordinator";
import type { ShieldContentPublisher } from "./ShieldContentPublisher";
import { resolveCheapestUnlockOffer } from "./unlockOffer";

export type AppShieldContentDependencies = Readonly<{
  publisher: Pick<ShieldContentPublisher, "publish">;
  activeConditions(): readonly ConfiguredCondition[];
  readSignals(): Promise<SignalReading>;
  notificationAuthorization(): Promise<NotificationAuthorizationStatus>;
  copySource: ShieldCopySource;
}>;

/** Composes app-owned live facts without widening the ScreenTimeModule seam. */
export function createAppShieldContentCoordinator(
  dependencies: AppShieldContentDependencies,
): ShieldContentCoordinator {
  return new ShieldContentCoordinator({
    publisher: dependencies.publisher,
    copySource: dependencies.copySource,
    offerSource: {
      current: async (cause, context) => {
        const reading = await dependencies.readSignals().catch(
          () => EMPTY_READING,
        );
        return resolveCheapestUnlockOffer({
          cause,
          conditions: dependencies.activeConditions(),
          reading,
          ...context,
        });
      },
    },
    routeHomeSource: {
      available: async () =>
        dependencies.notificationAuthorization().then(
          (status) => status === "approved",
          () => false,
        ),
    },
  });
}
