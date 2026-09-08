import { render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { AppRuntimeProvider } from '../AppRuntimeProvider';
import { createRuntime } from '../createRuntime';
import { ruleDaysStore } from '../../state/ruleDaysStore';
import { startEnforcement } from '../EnforcementHost';
import { rulesStore } from '../../state/rulesStore';
import { enforcementStore } from '../../state/enforcementStore';
import { dayKey } from '../../domain/calendar';

function appStateSource() {
  let listener: ((state: string) => void) | undefined;
  return {
    source: {
      addEventListener: (_event: 'change', callback: (state: string) => void) => {
        listener = callback;
        return { remove: jest.fn() };
      },
    },
    active: () => listener?.('active'),
  };
}

test('the lock is applied while the user is still inside the post-purchase setup sequence, before the tabs exist', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('home-locked-walking');
  const applyLock = jest.spyOn(runtime.screenTime, 'applyLock');

  render(
    <AppRuntimeProvider runtime={runtime}>
      <Text>Post-purchase setup</Text>
    </AppRuntimeProvider>,
  );

  await waitFor(() => expect(applyLock).toHaveBeenCalledTimes(1));
});

test('progress keeps accruing after the tab stack unmounts', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('home-locked-walking');
  const view = await render(
    <AppRuntimeProvider runtime={runtime}>
      <Text>Tab stack</Text>
    </AppRuntimeProvider>,
  );
  view.rerender(<AppRuntimeProvider runtime={runtime}>{null}</AppRuntimeProvider>);

  runtime.dev.setSteps(5_000);

  await waitFor(() => expect(ruleDaysStore.getState().data.days[0].met).toBe(true));
});

test('returning to the foreground re-reads permissions, re-verifies the selection and re-applies the lock', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('home-locked-walking');
  const appState = appStateSource();
  const screenTimeStatus = jest.spyOn(runtime.screenTime, 'authorizationStatus');
  const healthStatus = jest.spyOn(runtime.health, 'authorizationStatus');
  const stepsStatus = jest.spyOn(runtime.steps, 'authorizationStatus');
  const describeSelection = jest.spyOn(runtime.screenTime, 'describeSelection');
  const stepsSince = jest.spyOn(runtime.steps, 'stepsSince');
  const applyLock = jest.spyOn(runtime.screenTime, 'applyLock');
  const stop = startEnforcement(runtime, { appState: appState.source });
  await waitFor(() => expect(applyLock).toHaveBeenCalledTimes(1));
  applyLock.mockClear();

  appState.active();

  await waitFor(() => expect(applyLock).toHaveBeenCalledTimes(1));
  expect(screenTimeStatus).toHaveBeenCalled();
  expect(healthStatus).toHaveBeenCalled();
  expect(stepsStatus).toHaveBeenCalled();
  expect(describeSelection).toHaveBeenCalled();
  expect(stepsSince).toHaveBeenCalled();
  stop();
});

test('the host applies the lock exactly once per distinct decision, not once per tick', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('home-locked-walking');
  const applyLock = jest.spyOn(runtime.screenTime, 'applyLock');
  const stop = startEnforcement(runtime, { appState: appStateSource().source });
  await waitFor(() => expect(applyLock).toHaveBeenCalledTimes(1));

  runtime.dev.advance(1_000);
  expect(applyLock).toHaveBeenCalledTimes(1);
  const data = rulesStore.getState().data;
  rulesStore.getState().patch({
    lockedApps: { ...data.lockedApps, handle: { token: 'new-selection' } },
  });
  await waitFor(() => expect(applyLock).toHaveBeenCalledTimes(2));
  rulesStore.getState().patch({ lockedApps: rulesStore.getState().data.lockedApps });
  await Promise.resolve();
  expect(applyLock).toHaveBeenCalledTimes(2);
  stop();
});

test('a registration failure leaves shields up and reports applied:false', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('home-locked-walking');
  runtime.dev.setOutcome('error');
  enforcementStore.setState({ enforcementStatus: null });
  const stop = startEnforcement(runtime, { appState: appStateSource().source });

  await waitFor(() => expect(enforcementStore.getState().enforcementStatus?.applied).toBe(false));
  expect(enforcementStore.getState().enforcementStatus?.shields).toBe('up');
  expect(runtime.dev.snapshot().events.map((event) => event.event)).toEqual(
    expect.arrayContaining(['shield_applied', 'monitor_registration_failed']),
  );
  stop();
});

test('a lapse clears shields before anything else', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('home-locked-walking');
  const applyLock = jest.spyOn(runtime.screenTime, 'applyLock');
  const stop = startEnforcement(runtime, { appState: appStateSource().source });
  await waitFor(() => expect(applyLock).toHaveBeenCalledTimes(1));

  runtime.dev.setEntitlement('billingIssue');

  await waitFor(() => expect(applyLock).toHaveBeenCalledTimes(2));
  expect(applyLock.mock.calls[1][1]).toMatchObject({ shields: 'clear', monitors: 'unregister' });
  expect(runtime.dev.snapshot().events.at(-2)?.event).toBe('shields_cleared');
  stop();
});

test('a window end fires the session teardown at the root', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('home-locked-walking');
  const rule = rulesStore.getState().data.rules[0];
  rulesStore.getState().patch({
    rules: [{ ...rule, schedule: { days: rule.schedule.days, window: { kind: 'range', startMinute: 540, endMinute: 661 } } }],
  });
  const startedAt = runtime.clock.now();
  ruleDaysStore.getState().patch({
    walkingSession: {
      id: `${rule.id}:${startedAt}`,
      ruleId: rule.id,
      placement: 'handheld',
      instanceDay: dayKey(startedAt, runtime.clock.timezone()),
      startedAt,
      verifiedAt: startedAt,
      leaseUntil: '2026-09-07T15:15:00.000Z',
      creditedThrough: startedAt,
      endedAt: null,
      endReason: null,
      graceUntil: null,
      phase: 'walking',
    },
  });
  const walkingStop = jest.spyOn(runtime.walking, 'stop').mockImplementation(() => undefined);
  const stop = startEnforcement(runtime, { appState: appStateSource().source });

  runtime.dev.advance(60_001);

  expect(walkingStop).toHaveBeenCalledTimes(1);
  expect(walkingStop).toHaveBeenCalledWith('windowEnded');
  stop();
});

test('the next interval boundary re-evaluates enforcement without a polling tick', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('home-before-window');
  const applyLock = jest.spyOn(runtime.screenTime, 'applyLock');
  const stop = startEnforcement(runtime, { appState: appStateSource().source });
  await waitFor(() => expect(applyLock).toHaveBeenCalledTimes(1));

  runtime.dev.advance(3_600_000);

  await waitFor(() => expect(applyLock).toHaveBeenCalledTimes(2));
  expect(applyLock.mock.calls[1][0].state).toBe('locked');
  stop();
});
