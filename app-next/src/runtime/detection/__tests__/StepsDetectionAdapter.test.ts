import { StepsDetectionAdapter } from '../StepsDetectionAdapter';

test('queries Apple pedometer steps inside the exact analytics interval', async () => {
  const querySteps = jest.fn(async () => ({ steps: 4321 }));
  const motion = {
    getAuthorizationStatus: () => 'authorized' as const,
    requestAuthorization: async () => 'authorized' as const,
    querySteps,
    on: () => () => undefined,
  } as any;
  const port = new StepsDetectionAdapter(motion);
  await expect(port.stepsBetween('2026-09-19T05:00:00.000Z', '2026-09-20T05:00:00.000Z')).resolves.toBe(4321);
  expect(querySteps).toHaveBeenCalledWith(Date.parse('2026-09-19T05:00:00.000Z'), Date.parse('2026-09-20T05:00:00.000Z'));
});
