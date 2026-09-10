import { pathFor, nextStep, prevStep, progressFraction, resumeStep } from '../flow';
const pre = Array.from({ length: 20 }, (_, i) => 'O' + String(i + 1).padStart(2, '0')).filter(
  (step) => step !== 'O07' && step !== 'O19',
);
const tail = ['S1', 'S2', 'S3', 'S4', 'T1', 'T2', 'T3', 'T4', 'P'];
test.each([
  [{ activity: 'walking', walkingMode: 'steps' }, ['W1', 'W2', 'W3']],
  [{ activity: 'walking', walkingMode: 'state' }, ['W1', 'W2']],
  [{ activity: 'gym', gymMode: 'time' }, ['G1', 'G2']],
  [{ activity: 'gym', gymMode: 'arrival' }, ['G1']],
  [{ activity: 'gym', gymMode: 'time' }, ['G1', 'G2']],
  [{ activity: 'gym', gymMode: 'arrival' }, ['G1']],
] as const)('each branch walks forward, back and monotonically to P: %j', (answers, branch) => {
  const expected = [...pre, ...branch, ...tail];
  expect(pathFor(answers)).toEqual(expected);
  expected.forEach((step, i) => {
    const state = { step, answers };
    expect(nextStep(state)).toBe(expected[Math.min(i + 1, expected.length - 1)]);
    expect(prevStep(state)).toBe(expected[Math.max(0, i - 1)]);
    expect(resumeStep(state)).toBe(step);
    if (i) expect(progressFraction(state)).toBeGreaterThan(progressFraction({ step: expected[i - 1], answers }));
  });
  expect(progressFraction({ step: 'P', answers })).toBe(1);
});
test('corrupt resume state falls back safely to O01', () => {
  expect(resumeStep(null)).toBe('O01');
  expect(resumeStep({ step: 'missing', answers: {} })).toBe('O01');
});
