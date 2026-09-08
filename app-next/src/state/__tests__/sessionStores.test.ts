import { gymVisitsStore } from '../gymVisitsStore';
import { historyStore } from '../historyStore';

test('history and gym visits stores accept valid facts and reject malformed replacements', () => {
  const history = {
    day: '2026-09-07',
    usageMinutes: null,
    activity: { walking: 12, gym: 30, running: 0, biking: 0 },
    met: true,
    scheduled: true,
    sealedAt: '2026-09-08T00:00:00.000Z',
  };
  const visit = {
    id: 'visit-1',
    placeId: 'gym-1',
    enteredAt: '2026-09-07T14:00:00.000Z',
    exitedAt: null,
    source: 'manual' as const,
  };

  historyStore.getState().patch({ days: [history] });
  gymVisitsStore.getState().patch({ visits: [visit] });
  expect(historyStore.getState().data.days).toEqual([history]);
  expect(gymVisitsStore.getState().data.visits).toEqual([visit]);

  historyStore.getState().patch({ days: [{} as never] });
  gymVisitsStore.getState().patch({ visits: [{} as never] });
  expect(historyStore.getState().data.days).toEqual([history]);
  expect(gymVisitsStore.getState().data.visits).toEqual([visit]);
});
