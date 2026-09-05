import { FixtureGymSearchClient } from "../FixtureGymSearchClient";
import { getGymSearchClient } from "../gymSearchAccessor";

describe("GymSearchClient composition seam", () => {
  it("keeps the fixture geocoder as the singleton test default", async () => {
    expect(getGymSearchClient()).toBe(getGymSearchClient());
    expect(getGymSearchClient()).toBeInstanceOf(FixtureGymSearchClient);
    await expect(getGymSearchClient().search("iron")).resolves.toMatchObject([
      { name: "Iron Works Gym" },
    ]);
  });
});
