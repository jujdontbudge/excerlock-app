import {
  APP_GROUP_SHIELD_KEYS,
  ShieldContentPublisher,
  type AppGroupWriter,
  type ShieldCause,
} from "../ShieldContentPublisher";

describe("ShieldContentPublisher", () => {
  it.each<ShieldCause>([
    "balanceEmpty",
    "fullLock",
    "walkAndScrollEnded",
    "lockWindow",
  ])("publishes the real %s cause instead of a balance-empty fallback", (cause) => {
    const set = jest.fn<ReturnType<AppGroupWriter["set"]>, Parameters<AppGroupWriter["set"]>>();
    const publisher = new ShieldContentPublisher({ set });

    publisher.publish({
      cause,
      offerSubtitle: "A 10-min walk gets you 15 more minutes.",
      routeHomeAvailable: true,
      copyOverrides: {
        [cause]: { title: `Remote ${cause}` },
      },
    });

    expect(set.mock.calls).toEqual([
      [APP_GROUP_SHIELD_KEYS.currentCause, cause],
      [
        APP_GROUP_SHIELD_KEYS.runtimeContext,
        {
          cause,
          offerSubtitle: "A 10-min walk gets you 15 more minutes.",
          routeHomeAvailable: true,
        },
      ],
      [
        APP_GROUP_SHIELD_KEYS.copyOverrides,
        { [cause]: { title: `Remote ${cause}` } },
      ],
    ]);
  });
});
