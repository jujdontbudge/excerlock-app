import { createIncidentLog, INCIDENT_LOG_KEY, type IncidentLogEvent } from '../IncidentLog';

function memoryStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  return {
    store,
    getItem: jest.fn(async (key: string) => store.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
  };
}
const shield = (at: string): IncidentLogEvent => ({ at, state: 'shield', openReason: null, relief: null, result: 'applied' });
const open = (at: string): IncidentLogEvent => ({ at, state: 'open', openReason: 'earned', relief: null, result: 'applied' });

test('keeps transitions, drops repeats of the same decision, and persists a bounded ring', async () => {
  const storage = memoryStorage();
  const log = createIncidentLog(storage, 3);
  await log.ready();
  log.record(shield('2026-09-18T07:00:00.000Z'));
  log.record(shield('2026-09-18T07:05:00.000Z'));
  log.record(open('2026-09-18T08:00:00.000Z'));
  log.record(shield('2026-09-18T09:00:00.000Z'));
  log.record(open('2026-09-18T10:00:00.000Z'));
  expect(log.read().map((event) => event.at)).toEqual([
    '2026-09-18T08:00:00.000Z',
    '2026-09-18T09:00:00.000Z',
    '2026-09-18T10:00:00.000Z',
  ]);
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(JSON.parse(storage.store.get(INCIDENT_LOG_KEY)!)).toEqual(log.read());
});

test('loads the persisted ring under anything recorded before the load finished', async () => {
  const storage = memoryStorage({ [INCIDENT_LOG_KEY]: JSON.stringify([shield('2026-09-17T20:00:00.000Z'), { junk: true }]) });
  const log = createIncidentLog(storage, 10);
  log.record(open('2026-09-18T08:00:00.000Z'));
  await log.ready();
  expect(log.read()).toEqual([shield('2026-09-17T20:00:00.000Z'), open('2026-09-18T08:00:00.000Z')]);
});

test('a corrupt persisted ring is ignored', async () => {
  const log = createIncidentLog(memoryStorage({ [INCIDENT_LOG_KEY]: '{not json' }));
  await log.ready();
  expect(log.read()).toEqual([]);
});
