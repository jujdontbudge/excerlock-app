import type { LegacyFlowScreen } from "@excerlock/analytics-events";
import { useEffect, useRef, type ComponentType } from "react";
import type { AccountModule } from "@/account";

import { flowTracker } from "../analytics";
import { FLOW } from "./flow";
import { ConfessionScreen } from "./screens/ConfessionScreen";
import { MirrorScreen } from "./screens/MirrorScreen";
import { PaywallScreen } from "./screens/PaywallScreen";
import { PermissionsPrimerScreen } from "./screens/PermissionsPrimerScreen";
import { PickAppsScreen } from "./screens/PickAppsScreen";
import { SignUpScreen } from "./screens/SignUpScreen";
import {
  ValuePropScreen,
  type OnboardingScreenProps,
} from "./screens/ValuePropScreen";
import { useConfessionStore } from "./store/confessionStore";
import { useOnboardingStore } from "./store/onboardingStore";

const SCREEN_BY_STEP = {
  "value-prop": ValuePropScreen,
  confession: ConfessionScreen,
  mirror: MirrorScreen,
  "permissions-primer": PermissionsPrimerScreen,
  "pick-apps": PickAppsScreen,
  paywall: PaywallScreen,
  "sign-up": SignUpScreen,
} satisfies Record<LegacyFlowScreen, ComponentType<OnboardingScreenProps>>;

type OnboardingFlowProps = {
  account?: AccountModule;
  onComplete: () => void;
};

/** The rail's only screen chooser; leaf screens own neither state nor navigation. */
export function OnboardingFlow({ account, onComplete }: OnboardingFlowProps) {
  const currentStep = useOnboardingStore((state) => state.currentStep);
  const advance = useOnboardingStore((state) => state.advance);
  const back = useOnboardingStore((state) => state.back);
  const ScreenComponent = SCREEN_BY_STEP[currentStep];
  const isFinalStep = currentStep === FLOW.at(-1)?.screen;
  const viewedSteps = useRef(new Set<LegacyFlowScreen>());

  useEffect(() => {
    if (viewedSteps.current.has(currentStep)) {
      return;
    }

    viewedSteps.current.add(currentStep);
    flowTracker.trackOnboardingScreen(currentStep);
  }, [currentStep]);

  const handleContinue = () => {
    if (currentStep === "confession") {
      const confessedDailyMinutes =
        useConfessionStore.getState().confessedDailyMinutes;

      if (confessedDailyMinutes !== null) {
        flowTracker.trackOnboardingAnswer(
          currentStep,
          confessedDailyMinutes,
        );
      }
    }

    advance();

    if (isFinalStep) {
      onComplete();
    }
  };

  return (
    <ScreenComponent
      account={account}
      onContinue={handleContinue}
      onBack={back}
    />
  );
}
