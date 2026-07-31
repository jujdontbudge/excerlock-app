import {
  decodeShieldCopyPayload,
  EXPERIMENT_KEYS,
  isExperimentVariant,
} from "..";

describe("typed experiment registry", () => {
  it("registers shield copy on the exp- rail with a closed variant set", () => {
    expect(EXPERIMENT_KEYS).toEqual(["exp-shield-copy-v1"]);
    expect(isExperimentVariant("exp-shield-copy-v1", "control")).toBe(true);
    expect(isExperimentVariant("exp-shield-copy-v1", "treatment")).toBe(true);
    expect(isExperimentVariant("exp-shield-copy-v1", "variant-c")).toBe(false);
    expect(isExperimentVariant("exp-shield-copy-v1", true)).toBe(false);
  });

  it("accepts only a complete four-cause copy payload", () => {
    const payload = {
      balanceEmpty: { title: "Pause for now.", subtitle: "Move to unlock more time." },
      fullLock: { title: "Move first.", subtitle: "Your fastest unlock is ready." },
      walkAndScrollEnded: { title: "Walking paused.", subtitle: "Walk again to continue." },
      lockWindow: { title: "Apps are resting.", subtitle: "Come back after the window." },
    };

    expect(decodeShieldCopyPayload(payload)).toEqual(payload);
    expect(
      decodeShieldCopyPayload({
        ...payload,
        fullLock: { ...payload.fullLock, deepLink: "https://example.com" },
      }),
    ).toBeNull();
    expect(decodeShieldCopyPayload({ balanceEmpty: payload.balanceEmpty })).toBeNull();
  });
});
