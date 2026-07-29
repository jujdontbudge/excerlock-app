import type { FlowScreen } from "@excerlock/analytics-events";
import type { ComponentType } from "react";

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
import { useOnboardingStore } from "./store/onboardingStore";

const SCREEN_BY_STEP = {
  "value-prop": ValuePropScreen,
  confession: ConfessionScreen,
  mirror: MirrorScreen,
  "permissions-primer": PermissionsPrimerScreen,
  "pick-apps": PickAppsScreen,
  paywall: PaywallScreen,
  "sign-up": SignUpScreen,
} satisfies Record<FlowScreen, ComponentType<OnboardingScreenProps>>;

type OnboardingFlowProps = {
  onComplete: () => void;
};

/** The rail's only screen chooser; leaf screens own neither state nor navigation. */
export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const currentStep = useOnboardingStore((state) => state.currentStep);
  const advance = useOnboardingStore((state) => state.advance);
  const back = useOnboardingStore((state) => state.back);
  const ScreenComponent = SCREEN_BY_STEP[currentStep];
  const isFinalStep = currentStep === FLOW.at(-1)?.screen;

  const handleContinue = () => {
    advance();

    if (isFinalStep) {
      onComplete();
    }
  };

  return <ScreenComponent onContinue={handleContinue} onBack={back} />;
}
