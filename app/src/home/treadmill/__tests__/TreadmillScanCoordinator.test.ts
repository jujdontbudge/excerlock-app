import { TreadmillScanCoordinator } from "../TreadmillScanCoordinator";

function dependencies(completeProppedScan = true) {
  const calls: string[] = [];
  return {
    calls,
    router: {
      back: jest.fn(() => calls.push("back")),
    },
    session: {
      completeProppedScan: jest.fn(() => completeProppedScan),
      start: jest.fn(async (conditionId: string, mode: "handheld") => {
        calls.push(`start:${conditionId}:${mode}`);
        return true;
      }),
      stop: jest.fn(async () => {
        calls.push("stop");
      }),
    },
  };
}

describe("TreadmillScanCoordinator", () => {
  it("dismisses only after the active propped session accepts verification", async () => {
    const accepted = dependencies(true);
    const coordinator = new TreadmillScanCoordinator(
      "walking-condition",
      accepted.session,
      accepted.router,
    );

    await coordinator.verified();

    expect(accepted.calls).toEqual(["back"]);

    const stale = dependencies(false);
    await new TreadmillScanCoordinator(
      "walking-condition",
      stale.session,
      stale.router,
    ).verified();
    expect(stale.calls).toEqual([]);
  });

  it("switches denied camera access to handheld before offering dismissal", async () => {
    const { calls, router, session } = dependencies();
    const coordinator = new TreadmillScanCoordinator(
      "walking-condition",
      session,
      router,
    );

    await coordinator.permissionDenied();
    expect(calls).toEqual([
      "stop",
      "start:walking-condition:handheld",
    ]);

    coordinator.continueHandheld();
    expect(calls).toEqual([
      "stop",
      "start:walking-condition:handheld",
      "back",
    ]);
  });

  it("ends the unverified session before leaving after the grace expires", async () => {
    const { calls, router, session } = dependencies();
    const coordinator = new TreadmillScanCoordinator(
      "walking-condition",
      session,
      router,
    );

    await coordinator.expired();

    expect(calls).toEqual(["stop", "back"]);
  });
});
