import {
  EXPERIMENT_KEYS,
  isExperimentVariant,
} from "../experiments";

describe("typed experiment registry", () => {
  it("registers shield copy on the exp- rail with a closed variant set", () => {
    expect(EXPERIMENT_KEYS).toEqual(["exp-shield-copy-v1"]);
    expect(isExperimentVariant("exp-shield-copy-v1", "control")).toBe(true);
    expect(isExperimentVariant("exp-shield-copy-v1", "treatment")).toBe(true);
    expect(isExperimentVariant("exp-shield-copy-v1", "variant-c")).toBe(false);
    expect(isExperimentVariant("exp-shield-copy-v1", true)).toBe(false);
  });
});
