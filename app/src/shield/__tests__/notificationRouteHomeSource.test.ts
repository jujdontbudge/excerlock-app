import { IosAuthorizationStatus } from "expo-notifications";

import { createNotificationRouteHomeSource } from "../native/notificationRouteHomeSource";

describe("notificationRouteHomeSource", () => {
  it.each([
    [true, IosAuthorizationStatus.AUTHORIZED],
    [false, IosAuthorizationStatus.PROVISIONAL],
    [false, IosAuthorizationStatus.EPHEMERAL],
  ])("accepts an iOS authorization that can deliver the handoff", async (granted, status) => {
    const source = createNotificationRouteHomeSource(async () => ({
      granted,
      canAskAgain: false,
      expires: "never",
      status: granted ? "granted" : "undetermined",
      ios: { status },
    }));

    await expect(source.available()).resolves.toBe(true);
  });

  it.each([
    IosAuthorizationStatus.NOT_DETERMINED,
    IosAuthorizationStatus.DENIED,
  ])("hides the route for iOS authorization %s", async (status) => {
    const source = createNotificationRouteHomeSource(async () => ({
      granted: false,
      canAskAgain: status === IosAuthorizationStatus.NOT_DETERMINED,
      expires: "never",
      status: status === IosAuthorizationStatus.DENIED ? "denied" : "undetermined",
      ios: { status },
    }));

    await expect(source.available()).resolves.toBe(false);
  });

  it("fails closed when the native permission read is unavailable", async () => {
    const source = createNotificationRouteHomeSource(async () => {
      throw new Error("unavailable");
    });

    await expect(source.available()).resolves.toBe(false);
  });

  it("fails closed when a test or native shim returns no snapshot", async () => {
    const source = createNotificationRouteHomeSource(
      async () => undefined,
    );

    await expect(source.available()).resolves.toBe(false);
  });
});
