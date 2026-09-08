import { waitFor } from '@testing-library/react-native';
import { createRuntime } from '../../../runtime/createRuntime';
import { startEnforcement } from '../../../runtime/EnforcementHost';
import { progressContent } from '../progressContent';
import { ruleDaysStore } from '../../../state/ruleDaysStore';
import { rulesStore } from '../../../state/rulesStore';
import { permissionsStore } from '../../../state/permissionsStore';
import { homeCopy as c } from '../../../content/home';

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

test('a run added to the Health fake while the app is backgrounded reaches the progress row after a foreground event', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('runner-claim-on-open');
  const appState = appStateSource();
  const stop = startEnforcement(runtime, { appState: appState.source });
  await waitFor(() => expect(ruleDaysStore.getState().data.days[0].progress).toBe(0));

  jest
    .spyOn(runtime.health, 'workoutsToday')
    .mockImplementation(async (kind) => (kind === 'running' ? [{ kind: 'running', minutes: 32, km: 6.4 }] : []));
  appState.active();

  await waitFor(() => expect(ruleDaysStore.getState().data.days[0].met).toBe(true));
  stop();
  runtime.dispose();
});

test('the running card shows the claim-on-open line while it has no action and the goal is unmet', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('runner-claim-on-open');
  const rule = rulesStore.getState().data.rules[0];
  const row = ruleDaysStore.getState().data.days[0];

  const model = progressContent(rule, row, permissionsStore.getState().data, null, runtime.clock.now(), false);

  expect(model.action).toBeUndefined();
  expect(model.detail).toContain(c.claimOnOpen);
  runtime.dispose();
});

test('a met running goal drops the claim-on-open line', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('runner-claim-on-open');
  const rule = rulesStore.getState().data.rules[0];

  const model = progressContent(
    rule,
    { ...ruleDaysStore.getState().data.days[0], progress: 3, met: true },
    permissionsStore.getState().data,
    null,
    runtime.clock.now(),
    false,
  );

  expect(model.detail).not.toContain(c.claimOnOpen);
  runtime.dispose();
});

test('a missing Health permission is reported instead of the claim-on-open line', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('runner-claim-on-open');
  permissionsStore.getState().patch({ health: 'denied' });

  const model = progressContent(
    rulesStore.getState().data.rules[0],
    ruleDaysStore.getState().data.days[0],
    permissionsStore.getState().data,
    null,
    runtime.clock.now(),
    false,
  );

  expect(model.detail).toBe(c.healthNeeded);
  runtime.dispose();
});
