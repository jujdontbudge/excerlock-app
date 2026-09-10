import { SupportPort } from '../ports/SupportPort';
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
  dataExport: ExportPort;
  clock: ClockPort;
  status: RuntimeStatusPort;
  /** Simulation-only surface. Real runtimes do not implement it. */
  dev?: RuntimeControls;
  dispose: () => void;
};

export function requireRuntimeControls(runtime: Runtime): RuntimeControls {
  if (!__DEV__ || runtime.kind !== 'fake' || !runtime.dev) throw new Error('Development controls are unavailable');
  return runtime.dev;
}
