import { WalkingDurationLedger } from '../WalkingDurationLedger';
import { isMeasuredWalkingState } from '../DetectionService';
import { createWalkingState } from '../../../domain/walkingMachine';
import { createProppedState } from '../../../domain/proppedMachine';

function setup() {
  let raw: string | null = null;
  const storage = {
    getItem: jest.fn(async () => raw),
    setItem: jest.fn(async (_key: string, value: string) => { raw = value; }),
  };
  return { storage, ledger: new WalkingDurationLedger(storage), restart: () => new WalkingDurationLedger(storage), setRaw: (value: unknown) => { raw = JSON.stringify(value); } };
}
const sample = (at: number, verified = true, generation = 1, timezone = 'UTC') => ({ at, verified, generation, timezone });

test('credits only adjacent verified observations and caps an unobserved gap at five seconds', async () => {
  const { ledger } = setup();
  await ledger.observe(sample(1_000));
  await ledger.observe(sample(4_000));
  await ledger.observe(sample(20_000));
  expect((await ledger.read()).millisecondsByDay['1970-01-01']).toBe(8_000);
  expect((await ledger.read()).segments).toEqual([
    { from: 1_000, to: 9_000, day: '1970-01-01', timezone: 'UTC' },
  ]);
});

test('grace, unknown and handoff-equivalent unverified samples close rather than credit intervals', async () => {
  const { ledger } = setup();
  await ledger.observe(sample(0));
  await ledger.observe(sample(2_000, false));
  await ledger.observe(sample(3_000, false));
  await ledger.observe(sample(4_000));
  await ledger.observe(sample(5_000, false));
  expect((await ledger.read()).millisecondsByDay).toEqual({});
});

test('service mapping accepts only walking active or timestamp-verified propped active', () => {
  const walking = createWalkingState(0), propped = createProppedState(0);
  expect(isMeasuredWalkingState({ walking: { ...walking, phase: 'grace', activeSince: 0, graceEndsAt: 30_000 }, propped })).toBe(false);
  expect(isMeasuredWalkingState({ walking, propped: { ...propped, phase: 'handoff', deadlineAt: 60_000, verifiedSince: 0 } })).toBe(false);
  expect(isMeasuredWalkingState({ walking: { ...walking, phase: 'active', activeSince: 0, lastEvidenceAt: 0, lastQualifying: true }, propped })).toBe(true);
  expect(isMeasuredWalkingState({ walking, propped: { ...propped, phase: 'active', verifiedSince: 0 } })).toBe(true);
  expect(isMeasuredWalkingState({ walking, propped: { ...propped, phase: 'active', verifiedSince: null } })).toBe(false);
});

test('one union verdict cannot double-credit overlapping walking and propped evidence', async () => {
  const { ledger } = setup();
  await ledger.observe(sample(0));
  await ledger.observe(sample(1_000)); // both sources may be true, but input is their union
  await ledger.observe(sample(2_000));
  expect((await ledger.read()).millisecondsByDay['1970-01-01']).toBe(2_000);
});

test('splits by original timezone local midnight and retains replay intents', async () => {
  const { ledger } = setup();
  const midnight = Date.parse('2026-03-08T06:00:00Z'); // Chicago midnight on spring DST transition day
  await ledger.observe(sample(midnight - 2_000, true, 1, 'America/Chicago'));
  const state = await ledger.observe(sample(midnight + 2_000, true, 1, 'America/Chicago'));
  expect(state.millisecondsByDay).toEqual({ '2026-03-07': 2_000, '2026-03-08': 2_000 });
  expect(state.pending).toHaveLength(2);
  expect(state.segments).toEqual([
    { from: midnight - 2_000, to: midnight, day: '2026-03-07', timezone: 'America/Chicago' },
    { from: midnight, to: midnight + 2_000, day: '2026-03-08', timezone: 'America/Chicago' },
  ]);
});

test('atomic failure replays without double credit after restart and acknowledgement is idempotent', async () => {
  const { storage, ledger, restart } = setup();
  await ledger.observe(sample(0));
  storage.setItem.mockRejectedValueOnce(new Error('disk'));
  await expect(ledger.observe(sample(1_000))).rejects.toThrow('disk');
  const replayed = await restart().observe(sample(1_000));
  expect(replayed.millisecondsByDay['1970-01-01']).toBe(1_000);
  const again = await restart().observe(sample(1_000));
  expect(again.millisecondsByDay['1970-01-01']).toBe(1_000);
  await restart().acknowledge(replayed.pending.map((p) => p.idempotencyKey), 1);
  const acknowledged = await restart().read();
  expect(acknowledged.pending).toEqual([]);
  expect(acknowledged.segments).toEqual([{ from: 0, to: 1_000, day: '1970-01-01', timezone: 'UTC' }]);
});

test('generation change erases authority and fences stale callbacks; reset supports deletion', async () => {
  const { ledger } = setup();
  await ledger.observe(sample(0, true, 1));
  await ledger.observe(sample(1_000, true, 1));
  expect((await ledger.observe(sample(2_000, true, 2))).millisecondsByDay).toEqual({});
  await expect(ledger.observe(sample(3_000, true, 1))).rejects.toThrow('Obsolete');
  await ledger.reset();
  expect(await ledger.read()).toMatchObject({ generation: null, cursor: null, millisecondsByDay: {}, pending: [], segments: [] });
});
test('post-seal pruning preserves generation, cursor and pending replay intents', async () => {
  const { ledger } = setup();
  await ledger.observe(sample(0));
  const credited = await ledger.observe(sample(1_000));
  const pruned = await ledger.pruneBeforeDay('1970-01-02');
  expect(pruned.generation).toBe(credited.generation);
  expect(pruned.cursor).toEqual(credited.cursor);
  expect(pruned.pending).toEqual(credited.pending);
  expect(pruned.millisecondsByDay['1970-01-01']).toBe(1_000);
  await ledger.acknowledge(pruned.pending.map(({ idempotencyKey }) => idempotencyKey), 1);
  const fullyPruned = await ledger.pruneBeforeDay('1970-01-02');
  expect(fullyPruned.millisecondsByDay).toEqual({});
  expect(fullyPruned.segments).toEqual([]);
});
test('unverified gap is never bridged when exact segments are merged', async () => {
  const { ledger } = setup();
  await ledger.observe(sample(0)); await ledger.observe(sample(1_000));
  await ledger.observe(sample(2_000, false));
  await ledger.observe(sample(4_000)); await ledger.observe(sample(5_000));
  expect((await ledger.read()).segments).toEqual([
    { from: 0, to: 1_000, day: '1970-01-01', timezone: 'UTC' },
    { from: 4_000, to: 5_000, day: '1970-01-01', timezone: 'UTC' },
  ]);
});
test('legacy v1 aggregate migration creates no fabricated exact segments', async () => {
  const { ledger, setRaw } = setup();
  setRaw({ version: 1, generation: 1, cursor: sample(1_000), millisecondsByDay: { '1970-01-01': 999 }, pending: [] });
  expect(await ledger.read()).toMatchObject({ millisecondsByDay: { '1970-01-01': 999 }, segments: [] });
});
test('rejects overlapping or timezone/day-mismatched persisted segments', async () => {
  const { ledger, setRaw } = setup();
  const base = { version: 1, generation: 1, cursor: sample(3_000), millisecondsByDay: {}, pending: [] };
  setRaw({ ...base, segments: [
    { from: 0, to: 2_000, day: '1970-01-01', timezone: 'UTC' },
    { from: 1_000, to: 3_000, day: '1970-01-01', timezone: 'UTC' },
  ] });
  await expect(ledger.read()).rejects.toThrow('Invalid walking duration ledger');
  setRaw({ ...base, segments: [{ from: 0, to: 1_000, day: '1970-01-02', timezone: 'UTC' }] });
  await expect(ledger.read()).rejects.toThrow('Invalid walking duration ledger');
});
test('continuous verified travel keeps its origin timezone across restart, then a closed run adopts the new zone', async () => {
  const { ledger, restart } = setup();
  const start = Date.parse('2026-09-10T04:59:58Z'); // 23:59:58 Sep 9 in Chicago
  await ledger.observe(sample(start, true, 1, 'America/Chicago'));
  await ledger.observe(sample(start + 4_000, true, 1, 'America/New_York'));
  const cold = restart();
  const continued = await cold.observe(sample(start + 6_000, true, 1, 'America/New_York'));
  expect(continued.cursor?.timezone).toBe('America/Chicago');
  expect(continued.segments).toEqual([
    { from: start, to: start + 2_000, day: '2026-09-09', timezone: 'America/Chicago' },
    { from: start + 2_000, to: start + 6_000, day: '2026-09-10', timezone: 'America/Chicago' },
  ]);

  await cold.observe(sample(start + 7_000, false, 1, 'America/New_York'));
  await cold.observe(sample(start + 8_000, true, 1, 'America/New_York'));
  const nextRun = await cold.observe(sample(start + 10_000, true, 1, 'America/New_York'));
  expect(nextRun.cursor?.timezone).toBe('America/New_York');
  expect(nextRun.segments.at(-1)).toEqual({
    from: start + 8_000, to: start + 10_000, day: '2026-09-10', timezone: 'America/New_York',
  });
});

test('fractional CoreMotion wall clocks are floored instead of poisoning the ledger', async () => {
  const { ledger, restart } = setup();
  await ledger.observe(sample(1789574561230.1234));
  await ledger.observe(sample(1789574563800.5678));
  await ledger.observe(sample(1789574566372.9));
  await ledger.observe(sample(1789574570000.25, false));
  const state = await restart().read();
  expect(state.cursor).toEqual(sample(1789574570000, false));
  expect(state.segments).toEqual([{ from: 1789574561230, to: 1789574566372, day: '2026-09-16', timezone: 'UTC' }]);
  expect(state.millisecondsByDay['2026-09-16']).toBe(5_142);
  expect(state.pending.every((p) => Number.isSafeInteger(p.milliseconds) && Number.isSafeInteger(p.endedAt))).toBe(true);
});

test('a ledger already written with fractional bounds is repaired on load rather than rejected forever', async () => {
  const { ledger, setRaw } = setup();
  setRaw({
    version: 1, generation: 1,
    cursor: { generation: 1, at: 1789574563800.5678, verified: true, timezone: 'UTC' },
    millisecondsByDay: { '2026-09-16': 2570.4444 },
    pending: [{ idempotencyKey: 'walking:1:1789574561230.1234:1789574563800.5678', generation: 1, day: '2026-09-16', milliseconds: 2570.4444, endedAt: 1789574563800.5678 }],
    segments: [{ from: 1789574561230.1234, to: 1789574563800.5678, day: '2026-09-16', timezone: 'UTC' }],
  });
  const repaired = await ledger.read();
  expect(repaired.segments).toEqual([{ from: 1789574561230, to: 1789574563800, day: '2026-09-16', timezone: 'UTC' }]);
  expect(repaired.cursor?.at).toBe(1789574563800);
  await expect(ledger.observe(sample(1789574566372.9))).resolves.toBeTruthy();
  expect((await ledger.read()).millisecondsByDay['2026-09-16']).toBe(2570 + 2572);
});
