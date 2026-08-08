import type { DemoFixture } from "./types";

export const fixture = <T>(
  value: T,
  renderedBadge?: DemoFixture<T>["renderedBadge"],
): DemoFixture<T> => ({
  dataOrigin: "fixture",
  ...(renderedBadge ? { renderedBadge } : {}),
  value,
});

export const selectedDemoAppIds = ["loop", "clips", "orbit"] as const;

export const diagnosticDeviceFixture = {
  device: "iPhone 15 Pro sample",
  os: "iOS 18.6 sample",
  locale: "en-US",
  timeZone: "America/New_York",
  lowPowerMode: "Off",
  backgroundRefresh: "On",
  userId: "user_demo_001",
} as const;
