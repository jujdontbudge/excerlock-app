import type {
  LegacyTrackOnboardingAnswer,
  LegacyTrackOnboardingScreen,
} from "@excerlock/analytics-events";

import type { AnalyticsKit } from "./AnalyticsKit";

/**
 * The two FLOW helpers the registry declares (PRD §10.5). Both are called from
 * the onboarding rail's single central renderer — never per screen — so a
 * screen added to `FLOW_SCREENS` is instrumented with zero new code, and the
 * PostHog funnel is one insight stepping `onboarding_screen_viewed` per
 * `screen` value.
 */
export interface FlowTracker {
  trackOnboardingScreen: LegacyTrackOnboardingScreen;
  trackOnboardingAnswer: LegacyTrackOnboardingAnswer;
}

export function createFlowTracker(kit: AnalyticsKit): FlowTracker {
  return {
    trackOnboardingScreen(screen) {
      // $screen first: the funnel step reads as arriving on an already-tracked screen.
      kit.trackScreen(screen);
      kit.track("onboarding_screen_viewed", { screen });
    },
    trackOnboardingAnswer(screen, _value) {
      kit.track("onboarding_answer", { screen });
    },
  };
}
