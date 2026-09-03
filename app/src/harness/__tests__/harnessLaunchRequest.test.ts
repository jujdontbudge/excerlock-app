import { parseHarnessLaunchRequest } from "../harnessLaunchRequest";

describe("parseHarnessLaunchRequest", () => {
  it("opens and starts a known test", () => {
    expect(
      parseHarnessLaunchRequest(
        "excerlock://harness?test=c1-treadmill-walking&start=1",
      ),
    ).toEqual({ testId: "c1-treadmill-walking", autoStart: true });
  });

  it("opens without starting when start is absent", () => {
    expect(parseHarnessLaunchRequest("excerlock://harness?test=P3")).toEqual({
      testId: "P3",
      autoStart: false,
    });
  });

  it("ignores unknown tests and empty urls", () => {
    expect(parseHarnessLaunchRequest("excerlock://harness?test=nope&start=1")).toBeNull();
    expect(parseHarnessLaunchRequest("excerlock://harness")).toBeNull();
    expect(parseHarnessLaunchRequest(null)).toBeNull();
  });
});
