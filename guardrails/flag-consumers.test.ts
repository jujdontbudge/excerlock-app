import { describe, expect, it } from "vitest";

import { fromRoot, readUtf8 } from "./repo-files";

/** The one registry every PostHog flag must be declared in to be readable. */
const ADAPTER = "app-next/src/runtime/analytics/PostHogAnalyticsAdapter.ts";
const COMPOSITION = "app-next/src/runtime/createRealRuntime.ts";

function strings(source: string): string[] {
  return [...source.matchAll(/'([^']+)'/g)].flatMap((match) =>
    match[1] === undefined ? [] : [match[1]],
  );
}

function registryFlags(): { value: string[]; payload: string[] } {
  const source = readUtf8(fromRoot(ADAPTER));
  const union = /export type FlagName =([^;]+);/.exec(source)?.[1] ?? "";
  const payloadBody =
    /const allowedPayloadFlags = \{([^}]*)\} as const;/.exec(source)?.[1] ?? "";
  return {
    value: strings(union),
    payload: [...payloadBody.matchAll(/([A-Za-z_$][\w$]*)\s*:/g)].flatMap((match) =>
      match[1] === undefined ? [] : [match[1]],
    ),
  };
}

type Site = { readonly file: string; readonly contains: string };

/**
 * One row per registered flag, naming the production chain that consumes it:
 * the read through the allow-listed controller, the runtime field composition
 * assigns, and the surfaces that actually call it. A flag added to the registry
 * without a row — or a row whose rail is deleted — fails this guardrail.
 */
type FlagConsumer = {
  readonly flag: string;
  readonly read: Site;
  readonly wired: Site;
  readonly consumers: readonly Site[];
};

const FLAG_CONSUMERS: readonly FlagConsumer[] = [
  {
    flag: "paywall_variant",
    read: { file: ADAPTER, contains: "flags.get('paywall_variant')" },
    wired: { file: COMPOSITION, contains: "experiments: client.experiments" },
    consumers: [
      {
        file: "app-next/src/features/subscription/PaywallSlot.tsx",
        contains: "experiments.getPaywallVariant()",
      },
      {
        file: "app-next/src/features/subscription/PaywallSlot.tsx",
        contains: "trackPaywallVariantExposure(",
      },
      {
        file: "app-next/src/features/subscription/PaywallScreen.tsx",
        contains: "defaultPlanHandle(",
      },
    ],
  },
  {
    flag: "signInRequired",
    read: { file: ADAPTER, contains: "flags.get('signInRequired')" },
    wired: { file: COMPOSITION, contains: "signInRequired: client.signInRequired" },
    consumers: [
      {
        file: "app-next/src/features/setup/useSignInRequiredSource.ts",
        contains: "isRequired()",
      },
      {
        file: "app-next/src/features/setup/SetupRoute.tsx",
        contains: "useSignInRequiredSource()",
      },
      {
        file: "app-next/src/features/onboarding/welcome/WelcomeFooter.tsx",
        contains: "useSignInRequiredSource()",
      },
      { file: "app-next/app/sign-in.tsx", contains: "useSignInRequiredSource()" },
      {
        file: "app-next/src/features/setup/SignInScreen.tsx",
        contains: "resolveSignInRequired(",
      },
    ],
  },
  {
    flag: "onboarding_variant",
    read: {
      file: "app-next/src/runtime/createClientServices.ts",
      contains: "getPayload('onboarding_variant')",
    },
    wired: { file: COMPOSITION, contains: "onboardingFlow: client.onboardingFlow" },
    consumers: [
      {
        file: "app-next/src/onboarding/flowOrder.ts",
        contains: "parseOnboardingFlowOrder(",
      },
      {
        file: "app-next/src/features/onboarding/useOnboarding.ts",
        contains: "runtime.onboardingFlow",
      },
      { file: "app-next/src/onboarding/flow.ts", contains: "pathFor(state.answers, applicableOrder(state, order))" },
    ],
  },
  {
    flag: "review_preset",
    read: { file: ADAPTER, contains: "flags.get('review_preset')" },
    wired: { file: COMPOSITION, contains: "reviewPreset: client.reviewPreset" },
    consumers: [
      {
        file: "app-next/src/features/onboarding/useOnboarding.ts",
        contains: "runtime.reviewPreset",
      },
    ],
  },
  {
    flag: "shield_copy",
    read: { file: COMPOSITION, contains: "getPayload('shield_copy')" },
    wired: { file: COMPOSITION, contains: "createShieldCopyWriter(" },
    consumers: [
      {
        file: "app-next/src/runtime/NativeRuntimeEffects.tsx",
        contains: "runtime.shieldCopy?.sync()",
      },
    ],
  },
  {
    flag: "stride_gate_config",
    read: { file: COMPOSITION, contains: "getPayload('stride_gate_config')" },
    wired: { file: COMPOSITION, contains: "createStrideGateConfigPort(" },
    consumers: [
      {
        file: "app-next/src/runtime/NativeRuntimeEffects.tsx",
        contains: "runtime.strideGate?.sync()",
      },
      {
        file: COMPOSITION,
        contains: "detection.motion.applyStrideGateConfig(report)",
      },
      {
        file: "app-next/src/runtime/detection/MotionAdapter.ts",
        contains: "applyStrideGateConfig(report: StrideGateReport): void",
      },
    ],
  },
];

function assertSite(site: Site, label: string): void {
  const source = readUtf8(fromRoot(site.file));
  expect(source, `${label}: ${site.file} must contain ${site.contains}`).toContain(
    site.contains,
  );
}

describe("PostHog flag consumers", () => {
  it("reads both allow-lists from the controller source", () => {
    const { value, payload } = registryFlags();
    expect(value).toContain("paywall_variant");
    expect(value).toContain("signInRequired");
    expect(payload).toContain("shield_copy");
    expect(payload).toContain("onboarding_variant");
  });

  it("gives every registered flag one production consumer chain", () => {
    const { value, payload } = registryFlags();
    const registered = [...value, ...payload];
    const declared = FLAG_CONSUMERS.map((row) => row.flag);
    expect(
      [...registered].sort(),
      "Every flag in the controller registry needs a consumer row in FLAG_CONSUMERS",
    ).toEqual([...new Set(declared)].sort());
    expect(new Set(declared).size, "one row per flag").toBe(declared.length);

    for (const row of FLAG_CONSUMERS) {
      assertSite(row.read, `${row.flag} read`);
      assertSite(row.wired, `${row.flag} runtime wiring`);
      expect(row.consumers.length, `${row.flag} needs a consumer`).toBeGreaterThan(0);
      for (const site of row.consumers) assertSite(site, `${row.flag} consumer`);
    }
  });

  it("keeps one step-id vocabulary for the persisted store and the remote onboarding rail", () => {
    const vocabulary = readUtf8(fromRoot("app-next", "src", "onboarding", "stepId.ts"));
    expect(vocabulary).toContain("onboardingStepIdPattern");
    expect(
      readUtf8(fromRoot("app-next", "src", "state", "onboardingStore.ts")),
      "the store must validate persisted steps with the shared predicate",
    ).toContain("isOnboardingStepId");
    expect(
      readUtf8(fromRoot("app-next", "src", "onboarding", "flowOrder.ts")),
      "the remote rail must validate payload steps with the shared predicate",
    ).toContain("isOnboardingStepId");
  });
});
