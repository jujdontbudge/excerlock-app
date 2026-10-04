import { useState, useSyncExternalStore } from 'react';
import { useRuntime } from '../../ports/useRuntime';
import { useClock, useDevSnapshot } from '../../lock/selectors';
import { rulesStore } from '../../conditions/rulesStore';
import { ruleDaysStore } from '../../conditions/ruleDaysStore';
import { RuntimeEnforcementSource } from '../../enforcement/RuntimeEnforcementSource';
import { planWatchdog } from '../../ports/watchdog';
import { ScreenShell, Heading, Label } from '../../ui';
export function TreadmillEvidence() {
  const runtime = useRuntime();
  const walking = useSyncExternalStore(runtime.walking.observe, runtime.walking.snapshot, runtime.walking.snapshot);
  const now = useClock(),
    view = useDevSnapshot();
  const [source] = useState(
    () =>
      new RuntimeEnforcementSource(
        () => ({
          now: runtime.clock.now(),
          timezone: runtime.clock.timezone(),
          rules: rulesStore.getState().data.rules,
          ruleDays: ruleDaysStore.getState().data.days,
          walking: runtime.walking.snapshot(),
          gymPresence: null,
          entitlement: runtime.subscription.entitlement(),
          deleting: false,
          accountGeneration: 0,
          accountReady: true,
          screenTimeAuthorized: true,
          selection: rulesStore.getState().data.lockedApps,
          selectionVersion: 'fake-treadmill',
        }),
        -1,
      ),
  );
  const snapshot = source.read();
  const plan = planWatchdog({
    now: Date.parse(now),
    decision: snapshot.relief,
    entitlement: 'active',
    canEnforce: snapshot.state === 'conditional',
    deleting: false,
    context: snapshot.context,
    eligibleUntil: snapshot.eligibleUntil,
    previous: null,
  });
  const deadline = walking.proppedEligibleUntil;
  const bounded =
    plan.register !== null &&
    deadline !== null &&
    plan.register.end <= deadline &&
    deadline - Date.parse(walking.proppedSince!) === 15 * 60_000;
  const fired = view.events.some((event) => event.event === 'propped_warning_fired');
  return (
    <ScreenShell>
      <Heading title="Treadmill evidence" />
      <Label>{walking.proppedVerified ? 'Propped access active' : 'Propped access inactive'}</Label>
      <Label>{snapshot.state === 'shield' ? 'Apps locked' : 'Apps open'}</Label>
      <Label>{bounded ? 'Watchdog ends within 15 minutes of pass' : 'No propped watchdog'}</Label>
      <Label>{fired ? 'Warning fired 30 seconds before expiry' : 'Warning has not fired'}</Label>
    </ScreenShell>
  );
}
