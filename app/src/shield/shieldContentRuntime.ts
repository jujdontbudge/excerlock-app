import { selectActiveConditions } from "@/home/store/homeState";
import { useHomeStore } from "@/home/store/homeStore";
import { getHomeAppRuntime } from "@/home/signals/appRuntime";
import { getNotificationModule } from "@/notifications/accessor";

import { createAppShieldContentCoordinator } from "./appShieldContent";
import { nativeShieldContentPublisher } from "./native/nativeShieldContentPublisher";
import { shieldCopySource } from "./shieldCopySource";

let coordinator: ReturnType<typeof createAppShieldContentCoordinator> | undefined;

/** The app-lifetime writer; fixtures can still inject a coordinator in tests. */
export function getShieldContentCoordinator() {
  coordinator ??= createAppShieldContentCoordinator({
    publisher: nativeShieldContentPublisher,
    activeConditions: () => selectActiveConditions(useHomeStore.getState()),
    readSignals: () => getHomeAppRuntime().feed.read(),
    notificationAuthorization: () =>
      getNotificationModule().getAuthorizationStatus(),
    copySource: shieldCopySource,
  });
  return coordinator;
}
