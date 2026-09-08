import { FakeContext } from '../demo/FakeContext';
import { AuthFake } from '../demo/fakes/AuthFake';
import { GaitFake } from '../demo/fakes/GaitFake';
import { GymFake } from '../demo/fakes/GymFake';
import { HealthFake } from '../demo/fakes/HealthFake';
import { NotificationsFake } from '../demo/fakes/NotificationsFake';
import { ScreenTimeFake } from '../demo/fakes/ScreenTimeFake';
import { StepsFake } from '../demo/fakes/StepsFake';
import { SubscriptionFake } from '../demo/fakes/SubscriptionFake';
import { SyncFake } from '../demo/fakes/SyncFake';
import { WalkingFake } from '../demo/fakes/WalkingFake';
import { scenarios } from '../demo/scenarios';
import { AuthPort } from '../ports/AuthPort';
import { ClockPort } from '../ports/ClockPort';
import { GaitPort } from '../ports/GaitPort';
import { GymPort } from '../ports/GymPort';
import { HealthPort } from '../ports/HealthPort';
import { NotificationsPort } from '../ports/NotificationsPort';
import { ScreenTimePort } from '../ports/ScreenTimePort';
import { StepsPort } from '../ports/StepsPort';
import { SubscriptionPort } from '../ports/SubscriptionPort';
import { SyncPort } from '../ports/SyncPort';
import { WalkingPort } from '../ports/WalkingPort';

export type FallbackPorts = {
  screenTime: ScreenTimePort;
  steps: StepsPort;
  walking: WalkingPort;
  gait: GaitPort;
  gym: GymPort;
  health: HealthPort;
  auth: AuthPort;
  subscription: SubscriptionPort;
  notifications: NotificationsPort;
  sync: SyncPort;
  dispose(): void;
};

/**
 * What a real build uses for a port it could not construct.
 *
 * Every README in `adapters/` says the same thing — a keyless build keeps the fake, so a missing key
 * is never a crash and never a branch at a call site — and this is where a real runtime honours it.
 *
 * It deliberately does **not** call `FakeRuntime()`. That function starts the demo machinery:
 * scenario persistence, the walking script, and `activityHistory`, which writes the scenario's steps
 * and usage minutes into the history store. On a device those writes would overwrite what the user
 * actually did. A bare `FakeContext` is only a container for prompt state and a clock, so the fakes
 * below are inert until something calls them.
 */
export function createFallbackPorts(clock: ClockPort): FallbackPorts {
  const context = new FakeContext(scenarios[0]);
  // The fakes stamp instants from the context's own clock; a real build's is the device's.
  context.clock.set(clock.now(), clock.timezone());
  const walking = WalkingFake(context);
  const gait = GaitFake(context);
  return {
    screenTime: ScreenTimeFake(context),
    steps: StepsFake(context),
    walking,
    gait,
    gym: GymFake(context),
    health: HealthFake(context),
    auth: AuthFake(context),
    subscription: SubscriptionFake(context),
    notifications: NotificationsFake(context),
    sync: SyncFake(),
    dispose: () => {
      walking.disconnect();
      context.dispose();
    },
  };
}
