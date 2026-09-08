import { waitFor } from '@testing-library/react-native';
import { createRuntime } from '../createRuntime';
import { startEnforcement } from '../EnforcementHost';

type Entry = { event: string; data: Record<string, unknown> };

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

async function host(options: { record?: (event: string, data?: Record<string, unknown>) => void } = {}) {
  const runtime = createRuntime();
  await runtime.dev.load('home-locked-walking');
  const entries: Entry[] = [];
  const appState = appStateSource();
  const stop = startEnforcement(runtime, {
    appState: appState.source,
    record: options.record ?? ((event, data = {}) => entries.push({ event, data })),
  });
  const of = (event: string) => entries.filter((entry) => entry.event === event);
  await waitFor(() => expect(of('enforcement.apply').length).toBeGreaterThan(0));
  return { runtime, entries, of, appState, stop };
}

test('a compiled plan is recorded with the hash the apply will carry', async () => {
  const { of, stop, runtime } = await host();

  const plan = of('enforcement.plan').at(-1)!.data;
  expect(plan).toMatchObject({
    shields: expect.stringMatching(/^(apply|clear)$/),
    ruleCount: expect.any(Number),
    planHash: expect.any(String),
    horizonEnd: expect.any(String),
  });
  expect(plan.monitors).toEqual(
    expect.arrayContaining([{ name: expect.any(String), start: expect.any(String), end: expect.any(String) }]),
  );
  expect(of('enforcement.apply').at(-1)!.data.planHash).toBe(plan.planHash);

  stop();
  runtime.dispose();
});

test('the apply says what was decided and whether the shields went up', async () => {
  const { of, stop, runtime } = await host();

  expect(of('enforcement.apply').at(-1)!.data).toMatchObject({
    decision: expect.any(String),
    applied: expect.any(Boolean),
    shields: expect.stringMatching(/^(up|down)$/),
    monitors: expect.any(Number),
  });

  stop();
  runtime.dispose();
});

test('a clock that goes backwards is recorded, because a rewound phone is the thing being tested', async () => {
  const { of, runtime, appState, stop } = await host();
  const observed = new Date(Date.parse(runtime.clock.now()) - 60 * 60 * 1000).toISOString();

  runtime.dev.setTime(observed);
  appState.active();

  await waitFor(() => expect(of('watermark.rewind').length).toBeGreaterThan(0));
  const rewind = of('watermark.rewind').at(-1)!.data;
  expect(rewind.observed).toBe(observed);
  expect(Date.parse(rewind.effective as string)).toBeGreaterThan(Date.parse(observed));

  stop();
  runtime.dispose();
});

test('the app selection is recorded by count, never by name', async () => {
  const { of, appState, stop, runtime } = await host();

  appState.active();

  await waitFor(() => expect(of('screentime.selection').length).toBeGreaterThan(0));
  const selection = of('screentime.selection').at(-1)!.data;
  expect(selection).toEqual({
    appCount: expect.any(Number),
    categoryCount: expect.any(Number),
    hasHandle: expect.any(Boolean),
  });
  expect(JSON.stringify(selection)).not.toMatch(/token/i);

  stop();
  runtime.dispose();
});

test('a host with no recorder is silent, which is what a shipped build gets', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('home-locked-walking');
  const applyLock = jest.spyOn(runtime.screenTime, 'applyLock');

  const stop = startEnforcement(runtime, { appState: appStateSource().source });

  await waitFor(() => expect(applyLock).toHaveBeenCalled());
  stop();
  runtime.dispose();
});
