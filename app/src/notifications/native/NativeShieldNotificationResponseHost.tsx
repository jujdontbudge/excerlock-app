import { useRouter } from "expo-router";
import { useCallback } from "react";
import { Platform } from "react-native";

import {
  ShieldNotificationResponseHost,
  type NotificationDestination,
} from "./ShieldNotificationResponseHost";

export function NativeShieldNotificationResponseHost() {
  const router = useRouter();
  const navigate = useCallback(
    (destination: NotificationDestination) => router.push(destination),
    [router],
  );

  if (Platform.OS !== "ios") {
    return null;
  }

  const { expoShieldNotificationResponseSource } = require(
    "./ExpoShieldNotificationResponseSource",
  ) as typeof import("./ExpoShieldNotificationResponseSource");

  return (
    <ShieldNotificationResponseHost
      source={expoShieldNotificationResponseSource}
      navigate={navigate}
    />
  );
}
