/** @excerlock/analytics-events — the one public surface. Everything else is internal. */
export { EVENTS } from './src/registry'
export type {
  AdaptyEventName,
  AnalyticsEvent,
  ClientEventName,
  EventName,
  EventRegistry,
  OwnerOf,
  PropsOf,
  ServerEventName,
} from './src/registry'
export {
  enumValuesOf,
  EVENT_NAMES,
  eventsOwnedBy,
  isRegisteredEvent,
  ownerOf,
  transmittedPropertiesOf,
} from './src/helpers'
export type { EmptyProps, EventOwner, EventProps, EventSpec, PropValue } from './src/types'
export { APP_SCREENS, FLOW_SCREENS, isFlowScreen, isTrackedScreen, TRACKED_SCREENS } from './src/flow'
export type { AppScreen, FlowScreen, TrackedScreen } from './src/flow'
export type {
  OnboardingFunnelEventName,
  OnboardingFunnelStep,
  PermissionName,
  PermissionResult,
  SignInProvider,
  TrackOnboardingAnswer,
  TrackOnboardingScreen,
} from './src/events/onboarding'
export type {
  ActivityKind,
  ConditionKind,
  Weekday,
  WindowBucket,
} from './src/events/conditions'
export type {
  ShieldCause,
  ShieldLiftReason,
  WalkingSessionEndReason,
  WalkingSessionSource,
} from './src/events/shield'
export type { CeremonyKind, TreadmillScanFailure } from './src/events/ceremony'
export type { PaywallPlacement } from './src/events/paywall'
export type { NotificationType } from './src/events/engagement'
export type { SupportCategory } from './src/events/support'
export type { AdaptyForwardedProps } from './src/events/subscription'

/**
 * Legacy surface for the `app/` workspace only — the retired seven-screen FLOW rail. Deleted with
 * `app/` by P2-T12's cutover; no other workspace may import it.
 */
export { isLegacyFlowScreen, LEGACY_FLOW_SCREENS } from './src/legacy'
export type {
  LegacyFlowScreen,
  LegacyPropsOf,
  LegacyTrackOnboardingAnswer,
  LegacyTrackOnboardingScreen,
} from './src/legacy'
