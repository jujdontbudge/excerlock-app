import { SupportPort } from '../ports/SupportPort';
import { IncidentReportPort } from '../ports/IncidentReportPort';
import { ScreenTimePort } from '../ports/ScreenTimePort';
import { StepsPort } from '../ports/StepsPort';
import { WalkingPort } from '../ports/WalkingPort';
import { GymPort } from '../ports/GymPort';
import { AuthPort } from '../ports/AuthPort';
import { SubscriptionPort } from '../ports/SubscriptionPort';
import { AnalyticsPort } from '../ports/AnalyticsPort';
import { NotificationsPort } from '../ports/NotificationsPort';
import { SyncPort } from '../ports/SyncPort';
import { ClockPort } from '../ports/ClockPort';
import { RuntimeControls } from '../ports/RuntimeControls';
import { GaitPort } from '../ports/GaitPort';
import { ExportPort } from '../ports/ExportPort';
import { RuntimeStatusPort } from '../ports/RuntimeStatusPort';
import { ReviewPresetPort } from '../ports/ReviewPresetPort';
import { ShieldCopyPort } from '../ports/ShieldCopyPort';
import type { StrideGateConfigPort } from './detection/createStrideGateConfigPort';
import type { OnboardingFlowPort } from '../onboarding/flowOrder';
import type { PaywallExperimentPort, SignInRequiredPort } from './analytics/PostHogAnalyticsAdapter';
export type Runtime = {
  readonly kind: 'fake' | 'real';
  screenTime: ScreenTimePort;
  steps: StepsPort;
  walking: WalkingPort;
  gait: GaitPort;
  gym: GymPort;
  auth: AuthPort;
  subscription: SubscriptionPort;
  analytics: AnalyticsPort;
  notifications: NotificationsPort;
  sync: SyncPort;
  support: SupportPort;
  /** In-app 'Something not working?' report: two answers plus the app's diagnostic snapshot, to our API. */
  incidentReports: IncidentReportPort;
  dataExport: ExportPort;
  clock: ClockPort;
  status: RuntimeStatusPort;
  reviewPreset?: ReviewPresetPort;
  /** PostHog `paywall_variant` rail read by the mounted paywall. */
  experiments?: PaywallExperimentPort;
  /** PostHog `signInRequired` gate behind every `SignInScreen` mount. */
  signInRequired?: SignInRequiredPort;
  /** PostHog `onboarding_variant` flow rail; absent means the bundled order. */
  onboardingFlow?: OnboardingFlowPort;
  /** Remote shield copy rail; absent means no payload flag consumer is wired. */
  shieldCopy?: ShieldCopyPort;
  /**
   * Remote stride-gate configuration rail (`stride_gate_config`); absent means
   * no payload flag consumer is wired and the adapter runs the shipped gate.
   * `report()` is the effective configuration: source, flag key, kill switch,
   * and every parameter as evaluated versus applied.
   */
  strideGate?: StrideGateConfigPort;
  /** Live production safety; absent means unknown, never safe by default. */
  safety?: () => { permissionPromptPending: boolean; cameraActive: boolean };
  /** Simulation-only surface. Real runtimes do not implement it. */
  dev?: RuntimeControls;
  dispose: () => void;
};

export function requireRuntimeControls(runtime: Runtime): RuntimeControls {
  if (!__DEV__ || runtime.kind !== 'fake' || !runtime.dev) throw new Error('Development controls are unavailable');
  return runtime.dev;
}
