import type { GymTransitionRecord, GymVisitLog } from '../GymVisitLog';
import { GeofenceEventProcessor, PRESENCE_CONFIRMATION_MS } from '../GeofenceEventProcessor';
import { readFileSync } from 'node:fs';
describe('GeofenceEventProcessor', () => {
  it('persists raw enter before notifying and never waits thirty seconds', async () => {
    const order: string[] = [];
    const log = new RecordingGymVisitLog(order);
    const processor = new GeofenceEventProcessor({
      log,
      now: () => 1_005,
      onPresence: () => order.push('presence'),
      onTransition: () => order.push('transition'),
    });
    await processor.process({ type: 'enter', regionId: 'gym-a', atMs: 1_000 });
    expect(PRESENCE_CONFIRMATION_MS).toBe(30_000);
    expect(order).toEqual(['persist', 'presence']);
    expect(log.records).toEqual([
      { id: 'gym-a:enter:1000', regionId: 'gym-a', type: 'enter', atMs: 1_000, receivedAtMs: 1_005 },
    ]);
    expect(processor.isInside('gym-a')).toBe(true);
  });
  it('does not notify when durable persistence fails', async () => {
    const notify = jest.fn();
    const processor = new GeofenceEventProcessor({
      log: {
        append: async () => {
          throw new Error('storage failed');
        },
        readAll: async () => [],
      },
      onPresence: notify,
      onTransition: notify,
    });
    await expect(processor.process({ type: 'exit', regionId: 'gym-a', atMs: 1_000 })).rejects.toThrow('storage failed');
    expect(notify).not.toHaveBeenCalled();
  });
});
test('background geofence processor contains no timer-based dwell', () => {
  const source = readFileSync(require.resolve('../GeofenceEventProcessor'), 'utf8');
  expect(source).not.toMatch(/setTimeout|setInterval/);
});
class RecordingGymVisitLog implements GymVisitLog {
  readonly records: GymTransitionRecord[] = [];
  constructor(private readonly order: string[]) {}
  async append(record: GymTransitionRecord): Promise<void> {
    this.records.push(record);
    this.order.push('persist');
  }
  async readAll(): Promise<readonly GymTransitionRecord[]> {
    return this.records;
  }
}
