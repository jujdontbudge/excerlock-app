jest.mock("@sentry/react-native", () => ({ init: jest.fn() }));
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { expoConfig: { extra: {} } },
}));
jest.mock("./src/analytics", () => ({
  analytics: {},
  initializePostHog: jest.fn(),
}));
jest.mock("./src/observability", () => ({
  buildSentryOptions: jest.fn().mockReturnValue(null),
  readClientObservabilityConfig: jest.fn().mockReturnValue({}),
}));
jest.mock("./src/subscription", () => ({
  getSubscriptionModule: jest.fn(),
}));
jest.mock("expo-router/entry", () => ({}));

import { getSubscriptionModule } from "./src/subscription";

describe("app bootstrap", () => {
  it("starts the subscription runtime before mounting the router", () => {
    jest.isolateModules(() => {
      require("./index");
    });

    expect(getSubscriptionModule).toHaveBeenCalledTimes(1);
  });
});
