import {
  MOTION_FIXTURE_NAMES,
  MOTION_FIXTURES,
  FixtureMotionProvider,
  WalkVerifier,
  type WalkVerdict,
} from "..";

const EXPECTED_FIXTURES = [
  "steady-walk",
  "red-light",
  "stop-for-good",
  "drive-off",
  "shaky-cheat",
  "late-classification",
  "denied-permission",
] as const;

async function playFixture(
  name: (typeof EXPECTED_FIXTURES)[number],
  evaluateAt: number,
): Promise<WalkVerdict> {
  const verifier = new WalkVerifier({ gracePeriodMs: 30_000 });
  const provider = new FixtureMotionProvider(MOTION_FIXTURES[name]);
  provider.on("activity", (sample) => verifier.processActivity(sample));
  provider.on("cadence", (sample) => verifier.processCadence(sample));
  await provider.start();
  provider.advanceTo(evaluateAt);

  if (provider.getAuthorizationStatus() === "denied") {
    return verifier.processAuthorizationDenied(provider.currentTimeMs);
  }
  return verifier.getVerdict(evaluateAt);
}

describe("canonical motion fixtures", () => {
  it("publishes the seven names fixed by research ticket #21", () => {
    expect(MOTION_FIXTURE_NAMES).toEqual(EXPECTED_FIXTURES);
    expect(
      MOTION_FIXTURE_NAMES.map((name) => MOTION_FIXTURES[name].name),
    ).toEqual(EXPECTED_FIXTURES);
  });

  it.each([
    ["steady-walk", 30_000, "verified"],
    ["red-light", 70_000, "verified"],
    ["stop-for-good", 50_000, "notWalking"],
    ["drive-off", 20_000, "notWalking"],
    ["shaky-cheat", 20_000, "notWalking"],
    ["late-classification", 40_000, "verified"],
    ["denied-permission", 1_000, "notWalking"],
  ] as const)("%s produces the expected walk verdict", async (name, atMs, phase) => {
    expect((await playFixture(name, atMs)).phase).toBe(phase);
  });

  it.each([
    ["steady-walk", 4_000],
    ["red-light", 4_000],
    ["stop-for-good", 4_000],
    ["drive-off", 4_000],
    ["late-classification", 32_000],
  ] as const)("%s establishes sustained walking before its transition", async (
    name,
    atMs,
  ) => {
    expect((await playFixture(name, atMs)).phase).toBe("verified");
  });

  it("represents drive-off as simultaneous walking and automotive activity", async () => {
    const provider = new FixtureMotionProvider(MOTION_FIXTURES["drive-off"]);
    await provider.start();
    provider.advanceTo(10_000);

    expect(await provider.queryActivity(10_000, 10_000)).toEqual([
      expect.objectContaining({ classes: ["walking", "automotive"] }),
    ]);
  });
});
