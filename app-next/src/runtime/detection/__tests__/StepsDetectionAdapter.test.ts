import { StepsDetectionAdapter } from '../StepsDetectionAdapter';

test('queries Apple pedometer steps inside the exact analytics interval', async () => {
  const querySteps = jest.fn(async () => ({
    steps: 4321,
    distanceMeters: 3218,
    floorsAscended: 7,
    activeMinutes: 38,
  }));
  const motion = {
    getAuthorizationStatus: () => 'authorized' as const,
    requestAuthorization: async () => 'authorized' as const,
    querySteps,
    on: () => () => undefined,
  } as any;
  const port = new StepsDetectionAdapter(motion);
  const from = '2026-09-19T05:00:00.000Z';
  const to = '2026-09-20T05:00:00.000Z';
  await expect(port.stepsBetween(from, to)).resolves.toBe(4321);
  await expect(port.metricsBetween(from, to)).resolves.toEqual({
    steps: 4321,
    distanceMeters: 3218,
    floorsAscended: 7,
    activeMinutes: 38,
  });
  expect(querySteps).toHaveBeenCalledWith(Date.parse(from), Date.parse(to));
});
