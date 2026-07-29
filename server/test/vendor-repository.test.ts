import { describe, expect, it } from "vitest";
import { createDrizzleVendorRepository } from "../src/vendors/index.js";

describe("vendor repository configuration", () => {
  it("fails loudly on first persistence use without DATABASE_URL", () => {
    expect(() => createDrizzleVendorRepository(null)).toThrow(
      "Vendor persistence is not configured; missing DATABASE_URL",
    );
  });
});
