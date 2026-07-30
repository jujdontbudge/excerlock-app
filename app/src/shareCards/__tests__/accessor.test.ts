import { getShareCardModule } from "..";

describe("share-card composition seam", () => {
  it("returns one deterministic mock from the real-adapter swap point", () => {
    expect(getShareCardModule()).toBe(getShareCardModule());
  });
});
