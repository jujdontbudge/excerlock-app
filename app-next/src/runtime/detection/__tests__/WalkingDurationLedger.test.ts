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
  return { storage, ledger: new WalkingDurationLedger(storage), restart: () => new WalkingDurationLedger(storage) };
}
const sample = (at: number, verified = true, generation = 1, timezone = 'UTC') => ({ at, verified, generation, timezone });

test('credits only adjacent verified observations and caps an unobserved gap at five seconds', async () => {
  const { ledger } = setup();
  await ledger.observe(sample(1_000));
  await ledger.observe(sample(4_000));
  await ledger.observe(sample(20_000));
  expect((await ledger.read()).millisecondsByDay['1970-01-01']).toBe(8_000);
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
  const midnight = Date.parse('2026-09-11T05:00:00Z'); // Chicago midnight (CDT)
  await ledger.observe(sample(midnight - 2_000, true, 1, 'America/Chicago'));
  const state = await ledger.observe(sample(midnight + 2_000, true, 1, 'America/Chicago'));
  expect(state.millisecondsByDay).toEqual({ '2026-09-10': 2_000, '2026-09-11': 2_000 });
  expect(state.pending).toHaveLength(2);
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
  expect((await restart().read()).pending).toEqual([]);
});

test('generation change erases authority and fences stale callbacks; reset supports deletion', async () => {
  const { ledger } = setup();
  await ledger.observe(sample(0, true, 1));
  await ledger.observe(sample(1_000, true, 1));
  expect((await ledger.observe(sample(2_000, true, 2))).millisecondsByDay).toEqual({});
  await expect(ledger.observe(sample(3_000, true, 1))).rejects.toThrow('Obsolete');
  await ledger.reset();
  expect(await ledger.read()).toMatchObject({ generation: null, cursor: null, millisecondsByDay: {}, pending: [] });
});
