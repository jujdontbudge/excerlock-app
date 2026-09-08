jest.mock("react-native-device-activity", () => ({
  userDefaultsSet: jest.fn(),
}));

import { userDefaultsSet } from "react-native-device-activity";

import { APP_GROUP_SHIELD_KEYS } from "../ShieldContentPublisher";
import { nativeShieldContentPublisher } from "../native/nativeShieldContentPublisher";

const mockUserDefaultsSet = jest.mocked(userDefaultsSet);

describe("nativeShieldContentPublisher", () => {
  beforeEach(() => mockUserDefaultsSet.mockClear());

  it("writes the extension snapshot through the configured app-group store", () => {
    nativeShieldContentPublisher.publish({
      cause: "fullLock",
      offerSubtitle: "A 10-min walk gets you 15 more minutes.",
      routeHomeAvailable: false,
      copyOverrides: {},
    });

    expect(mockUserDefaultsSet.mock.calls).toEqual([
      [APP_GROUP_SHIELD_KEYS.currentCause, "fullLock"],
      [
        APP_GROUP_SHIELD_KEYS.runtimeContext,
        {
          cause: "fullLock",
          offerSubtitle: "A 10-min walk gets you 15 more minutes.",
          routeHomeAvailable: false,
        },
      ],
      [APP_GROUP_SHIELD_KEYS.copyOverrides, {}],
    ]);
  });
});
