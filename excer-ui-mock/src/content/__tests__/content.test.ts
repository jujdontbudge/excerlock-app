import {
  analysisNaturalFixture,
  assetRegistry,
  builderOptions,
  conditionCatalog,
  firstHomeFixture,
  firstManageFixture,
  getSubscriptionPresentation,
  heatMapFixture,
  milestoneFixtures,
  onboardingScreens,
  shieldVariants,
  simulatedNativeSurfaces,
} from "..";

describe("content contract", () => {
  it("keeps natural first-run screens free of showcase conditions", () => {
    expect(firstHomeFixture.conditions).toEqual([]);
    expect(firstManageFixture.conditions).toEqual([]);
    expect(analysisNaturalFixture.history).toBe("empty");
  });

  it("publishes the complete 17-row condition catalog", () => {
    expect(conditionCatalog).toHaveLength(17);
    expect(new Set(conditionCatalog.map(({ id }) => id)).size).toBe(17);
    expect(new Set(conditionCatalog.map(({ kind }) => kind))).toEqual(
      new Set(["event", "state", "rate"]),
    );
  });

  it("starts every create-mode economy choice blank", () => {
    expect(builderOptions.rateMinutes.initial).toBeNull();
    expect(builderOptions.eventRewards.fixedMinutes.initial).toBeNull();
    expect(builderOptions.eventRewards.setPeriodMinutes.initial).toBeNull();
    expect(builderOptions.eventRewards.perDayCap.initial).toBeNull();
    expect(builderOptions.eventRewards.cooldown.initial).toBeNull();
    expect(builderOptions.eventRewards.repeatable.initial).toBeNull();
  });

  it("contains complete analysis, shield, and native registries", () => {
    expect(heatMapFixture).toHaveLength(28);
    expect(milestoneFixtures).toHaveLength(22);
    expect(shieldVariants).toHaveLength(4);
    expect(simulatedNativeSurfaces).toHaveLength(20);
    expect(simulatedNativeSurfaces.every(({ simulatedNative }) => simulatedNative)).toBe(true);
  });

  it("exports every approved runtime asset family", () => {
    expect(Object.keys(assetRegistry.branding)).toHaveLength(2);
    expect(Object.keys(assetRegistry.heroes)).toHaveLength(8);
    expect(Object.keys(assetRegistry.glyphs)).toHaveLength(26);
    expect(Object.keys(assetRegistry.banners)).toHaveLength(21);
    expect(Object.keys(assetRegistry.badges)).toHaveLength(22);
  });

  it("keeps onboarding notification-free", () => {
    const serialized = JSON.stringify(onboardingScreens).toLowerCase();
    expect(serialized).not.toContain("notification");
  });

  it("derives subscription truth from the persisted selected plan", () => {
    expect(getSubscriptionPresentation('active', 'monthly')).toEqual({
      status: 'Active',
      plan: 'ExcerLock Premium · Monthly',
      accessThrough: 'Renews Sep 7, 2026',
      renewal: '$9.99/month',
    });
    expect(getSubscriptionPresentation('trial', 'annual').plan).toBe(
      'ExcerLock Premium · Annual',
    );
    expect(getSubscriptionPresentation('active', 'annual', 'annual-winback')).toMatchObject({
      plan: 'ExcerLock Premium · Annual offer',
      renewal: '$29.99/year',
    });
  });
});
