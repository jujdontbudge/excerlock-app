jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import { getNotificationModule } from "..";

describe("Notification composition seam", () => {
  it("returns one module instance from the Phase-3 swap point", () => {
    expect(getNotificationModule()).toBe(getNotificationModule());
  });

  it("reads native authorization in production", async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    const getPermissionsAsync = jest.fn().mockResolvedValue({
      status: "granted",
      ios: { status: 2 },
    });
    jest.doMock(
      "expo-notifications",
      () => ({
        getPermissionsAsync,
        setNotificationHandler: jest.fn(),
        IosAuthorizationStatus: {
          NOT_DETERMINED: 0,
          DENIED: 1,
          AUTHORIZED: 2,
          PROVISIONAL: 3,
          EPHEMERAL: 4,
        },
        PermissionStatus: {
          DENIED: "denied",
          GRANTED: "granted",
          UNDETERMINED: "undetermined",
        },
      }),
    );

    try {
      await jest.isolateModulesAsync(async () => {
        const { getNotificationModule: getProductionNotificationModule } =
          require("../accessor") as typeof import("../accessor");

        await expect(
          getProductionNotificationModule().getAuthorizationStatus(),
        ).resolves.toBe("approved");
      });
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
      jest.dontMock("expo-notifications");
    }

    expect(getPermissionsAsync).toHaveBeenCalledTimes(1);
  });
});
