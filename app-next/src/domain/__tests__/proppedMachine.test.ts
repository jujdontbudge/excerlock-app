import { createProppedState, reducePropped, proppedRelief, ProppedState, ProppedEvent } from '../proppedMachine';
const run = (s: ProppedState, e: ProppedEvent, now = e.kind === 'tick' ? s.watermark : e.at) => reducePropped(s, e, now);
function propped() {
  const scan = run(createProppedState(0), { kind: 'startScan', at: 0, foreground: true });
  return run(scan, { kind: 'scanPass', at: 1000, generation: scan.generation, foreground: true });
}
function handoff() {
  let s = run(propped(), { kind: 'pickup', at: 2000 });
  s = run(s, { kind: 'walkingQualified', at: 5000 });
  return run(s, { kind: 'putDown', at: 6000 });
}
test('initial scan needs foreground and pass; background does not create relief', () => {
  const s = createProppedState(0);
  expect(run(s, { kind: 'startScan', at: 0, foreground: false }).phase).toBe('inactive');
  const scan = run(s, { kind: 'startScan', at: 0, foreground: true });
  expect(proppedRelief(scan)).toBe(false);
  const cancelled = run(scan, { kind: 'background', at: 100 });
  expect(run(cancelled, { kind: 'scanPass', at: 200, generation: scan.generation, foreground: true }).phase).toBe('inactive');
});
test('background alone preserves verified propped but lost coverage does not', () => {
  expect(run(propped(), { kind: 'background', at: 2000 }).phase).toBe('propped');
  expect(run(propped(), { kind: 'coverageLost', at: 2000 }).phase).toBe('inactive');
});
test('pickup has exactly one 20 second deadline, no stacked walking grace', () => {
  const s = run(propped(), { kind: 'pickup', at: 2000 });
  expect(run(s, { kind: 'pickup', at: 3000 }).deadlineAt).toBe(22000);
  expect(proppedRelief(run(s, { kind: 'tick' }, 21999))).toBe(true);
  expect(run(s, { kind: 'walkingQualified', at: 22000 }).phase).toBe('inactive');
});
test('qualified walking before pickup deadline transitions to active', () => {
  const s = run(propped(), { kind: 'pickup', at: 2000 });
  expect(run(s, { kind: 'walkingQualified', at: 21999 }).phase).toBe('active');
});
test('put-down handoff expires in 60 seconds, repeated put-down does not extend', () => {
  const s = handoff();
  expect(s.deadlineAt).toBe(66000);
  expect(run(s, { kind: 'putDown', at: 8000 }).deadlineAt).toBe(66000);
  expect(run(s, { kind: 'tick' }, 66000).phase).toBe('inactive');
});
test('rescan uses existing deadline; background returns to same bounded handoff', () => {
  const scan = run(handoff(), { kind: 'startScan', at: 65000, foreground: true });
  expect(proppedRelief(scan)).toBe(true);
  expect(run(scan, { kind: 'background', at: 65500 }).deadlineAt).toBe(66000);
  expect(run(scan, { kind: 'scanPass', at: 66000, generation: scan.generation, foreground: true }).phase).toBe('inactive');
});
test('valid timely rescan resets propped; stale generation rejected', () => {
  const scan = run(handoff(), { kind: 'startScan', at: 10000, foreground: true });
  expect(run(scan, { kind: 'scanPass', at: 11000, generation: scan.generation - 1, foreground: true }).phase).toBe('scanning');
  expect(run(scan, { kind: 'scanPass', at: 11000, generation: scan.generation, foreground: true }).phase).toBe('propped');
});
test('late wake and clock rewind cannot revive relief', () => {
  const expired = run(handoff(), { kind: 'tick' }, 100000);
  expect(run(expired, { kind: 'walkingQualified', at: 5000 }, 5000).phase).toBe('inactive');
  expect(run(expired, { kind: 'tick' }, 0).watermark).toBe(100000);
});
test('corrupt state and future observations reject', () => {
  expect(() => run({ ...propped(), phase: 'handheld' }, { kind: 'tick' })).toThrow('persisted');
  expect(() => run(propped(), { kind: 'pickup', at: 3000 }, 2000)).toThrow('future');
});
