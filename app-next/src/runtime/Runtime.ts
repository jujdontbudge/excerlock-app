import { SupportPort } from '../ports/SupportPort';
import { ScreenTimePort } from '../ports/ScreenTimePort';
import { StepsPort } from '../ports/StepsPort';
import { WalkingPort } from '../ports/WalkingPort';
import { GymPort } from '../ports/GymPort';
import { HealthPort } from '../ports/HealthPort';
import { AuthPort } from '../ports/AuthPort';
import { SubscriptionPort } from '../ports/SubscriptionPort';
import { AnalyticsPort } from '../ports/AnalyticsPort';
import { NotificationsPort } from '../ports/NotificationsPort';
import { SyncPort } from '../ports/SyncPort';
import { ClockPort } from '../ports/ClockPort';
import { RuntimeControls } from '../ports/RuntimeControls';
import { GaitPort } from '../ports/GaitPort';
import { ReachabilityPort } from '../ports/ReachabilityPort';

/**
 * How the paywall screen presents itself. `builder` means Adapty's Paywall Builder view is bound and
 * the screen has a real paywall to open; `standIn` is the Phase 1 local screen, which is what a
 * keyless build and every test see. The screen asks the composition rather than the vendor, so
 * nothing above a port learns that Adapty exists.
 */
export type PaywallPresentation = 'standIn' | 'builder';

export type Runtime = {
  /** `real` means the composition bound the real adapters it could; `fake` is the demo runtime. */
  readonly kind: 'fake' | 'real';
  readonly paywall: PaywallPresentation;
  screenTime: ScreenTimePort;
  steps: StepsPort;
  walking: WalkingPort;
  gait: GaitPort;
  gym: GymPort;
  health: HealthPort;
  auth: AuthPort;
  subscription: SubscriptionPort;
  analytics: AnalyticsPort;
  notifications: NotificationsPort;
  sync: SyncPort;
  support: SupportPort;
  clock: ClockPort;
  dev: RuntimeControls;
  reachability: ReachabilityPort;
  /**
   * Composition work for a foreground transition — refreshing the session, re-reading the pedometer,
   * reconciling background gym visits. `runtime/EnforcementHost` owns the app's one `AppState`
   * subscription and calls this, so no adapter listens for itself.
   */
  onForeground?: () => Promise<void>;
  dispose: () => void;
};
