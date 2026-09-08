import {
  PICKUP_CADENCE_GRACE_MS,
  PROPPED_HANDOFF_MS,
  startHandheld,
  startPlacement,
  stepPlacement,
} from '../placementHandoff';

const T0 = '2026-09-07T15:00:00.000Z';
const at = (ms: number) => new Date(Date.parse(T0) + ms).toISOString();

describe('treadmill placement handoff', () => {
  test('a completed scan is the propped session verification', () => {
    const result = stepPlacement(startPlacement(T0), { type: 'scanCompleted', at: at(5_000) });
    expect(result.state).toMatchObject({ phase: 'propped', motionCounts: false, deadline: null });
    expect(result.effects).toEqual([{ type: 'verified', at: at(5_000) }]);
  });

  test('a propped phone never verifies itself', () => {
    // The console shakes and Core Motion reports a walking cadence for the machine, not the user.
    const propped = stepPlacement(startPlacement(T0), { type: 'scanCompleted', at: T0 }).state;
    expect(stepPlacement(propped, { type: 'verified', at: at(60_000) }).effects).toEqual([]);
    expect(stepPlacement(propped, { type: 'unverified', at: at(60_000) }).effects).toEqual([]);
  });

  test('picking the phone up hands verification to the pedometer, on probation', () => {
    const propped = stepPlacement(startPlacement(T0), { type: 'scanCompleted', at: T0 }).state;
    const handheld = stepPlacement(propped, { type: 'pickedUp', at: at(60_000) });
    expect(handheld.state).toMatchObject({
      phase: 'handheld',
      motionCounts: true,
      deadline: at(60_000 + PICKUP_CADENCE_GRACE_MS),
    });
    expect(handheld.effects).toEqual([]);

    const walking = stepPlacement(handheld.state, { type: 'verified', at: at(65_000) });
    expect(walking.effects).toEqual([{ type: 'verified', at: at(65_000) }]);
    expect(walking.state.deadline).toBeNull();
  });

  test('a pickup that never walks becomes one unverified event at the deadline', () => {
    const propped = stepPlacement(startPlacement(T0), { type: 'scanCompleted', at: T0 }).state;
    const handheld = stepPlacement(propped, { type: 'pickedUp', at: at(60_000) }).state;
    const expired = stepPlacement(handheld, { type: 'deadline', at: at(90_000) });
    // Reported at the deadline, not at the late tick that noticed it: the domain's stop grace runs
    // from when the evidence ran out.
    expect(expired.effects).toEqual([{ type: 'unverified', at: at(60_000 + PICKUP_CADENCE_GRACE_MS) }]);
    expect(expired.state.deadline).toBeNull();
    expect(stepPlacement(expired.state, { type: 'deadline', at: at(120_000) }).effects).toEqual([]);
  });

  test('setting the phone down emits nothing and opens the handoff window', () => {
    const handheld = startHandheld(T0);
    const handoff = stepPlacement(handheld, { type: 'setDown', at: at(10_000) });
    // Putting the phone back on the console is not evidence of stopping. The lease bounds the gap.
    expect(handoff.effects).toEqual([]);
    expect(handoff.state).toMatchObject({
      phase: 'handoff',
      motionCounts: false,
      deadline: at(10_000 + PROPPED_HANDOFF_MS),
    });
  });

  test('an expired handoff returns to the framing view', () => {
    const handoff = stepPlacement(startHandheld(T0), { type: 'setDown', at: T0 }).state;
    const expired = stepPlacement(handoff, { type: 'deadline', at: at(PROPPED_HANDOFF_MS + 1_000) });
    expect(expired.state).toMatchObject({ phase: 'scanning', motionCounts: false, deadline: null });
    expect(expired.effects).toEqual([{ type: 'rescan', at: at(PROPPED_HANDOFF_MS) }]);
  });

  test('picking the phone up during the handoff resumes handheld verification', () => {
    const handoff = stepPlacement(startHandheld(T0), { type: 'setDown', at: T0 }).state;
    const back = stepPlacement(handoff, { type: 'pickedUp', at: at(20_000) });
    expect(back.state).toMatchObject({ phase: 'handheld', motionCounts: true });
    expect(stepPlacement(back.state, { type: 'verified', at: at(21_000) }).effects).toEqual([
      { type: 'verified', at: at(21_000) },
    ]);
  });

  test('a handheld walk trusts motion from the first sample', () => {
    expect(stepPlacement(startHandheld(T0), { type: 'verified', at: at(1_000) }).effects).toEqual([
      { type: 'verified', at: at(1_000) },
    ]);
  });

  test('a scan while already propped changes nothing', () => {
    const propped = stepPlacement(startPlacement(T0), { type: 'scanCompleted', at: T0 }).state;
    expect(stepPlacement(propped, { type: 'scanCompleted', at: at(1_000) }).effects).toEqual([]);
  });

  test('a deadline that has not arrived is ignored', () => {
    const handheld = stepPlacement(
      stepPlacement(startPlacement(T0), { type: 'scanCompleted', at: T0 }).state,
      { type: 'pickedUp', at: T0 },
    ).state;
    expect(stepPlacement(handheld, { type: 'deadline', at: at(1_000) }).effects).toEqual([]);
  });

  test('probation, not the pedometer, answers a pickup', () => {
    const handheld = stepPlacement(
      stepPlacement(startPlacement(T0), { type: 'scanCompleted', at: T0 }).state,
      { type: 'pickedUp', at: T0 },
    ).state;
    // Cadence needs a few seconds to qualify once the phone leaves the console. Letting an early
    // "not walking" through would start the stop grace on every handoff.
    expect(stepPlacement(handheld, { type: 'unverified', at: at(2_000) }).effects).toEqual([]);
    // Once probation is spent, the same verdict is the answer.
    const spent = stepPlacement(handheld, { type: 'deadline', at: at(20_000) });
    expect(spent.effects).toEqual([{ type: 'unverified', at: at(20_000) }]);
    expect(stepPlacement(spent.state, { type: 'unverified', at: at(21_000) }).effects).toEqual([
      { type: 'unverified', at: at(21_000) },
    ]);
  });
});
