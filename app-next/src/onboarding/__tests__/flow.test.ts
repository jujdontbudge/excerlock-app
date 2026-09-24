import { pathFor, nextStep, prevStep, progressFraction, resumeStep } from '../flow';
const pre = Array.from({ length: 20 }, (_, i) => 'O' + String(i + 1).padStart(2, '0')).filter(
  (step) => step !== 'O07' && step !== 'O19',
).flatMap(step => step === 'O03' ? [step, 'O07'] : step === 'O08' ? [step, 'O22', 'O21'] : [step]);
const tail = ['S1', 'S2', 'S3', 'S3b', 'S3c', 'S3d', 'P'];
test.each([
  [{ activity: 'walking', walkingMode: 'steps' }, ['W1', 'W2', 'W3']],
  [{ activity: 'walking', walkingMode: 'state' }, ['W1', 'W2']],
  [{ activity: 'gym', gymMode: 'time' }, ['G1', 'G2']],
  [{ activity: 'gym', gymMode: 'arrival' }, ['G1']],
  [{ activity: 'gym', gymMode: 'time' }, ['G1', 'G2']],
  [{ activity: 'gym', gymMode: 'arrival' }, ['G1']],
] as const)('each branch walks forward, back and monotonically to P: %j', (answers, branch) => {
  const baseline = answers.activity === 'gym' ? ['G0F', 'G0H'] : ['W0'];
  const expected = [...pre, ...baseline, ...branch, ...tail];
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
test('an install saved on a retired trial screen resumes at the paywall', () => {
  expect(resumeStep({ step: 'T3', answers: { activity: 'walking' } })).toBe('P');
});
test('corrupt resume state falls back safely to O01', () => {
  expect(resumeStep(null)).toBe('O01');
  expect(resumeStep({ step: 'missing', answers: {} })).toBe('O01');
});

const remote = { preBranch: ['O01', 'O03', 'O02', ...pre.filter((step) => !['O01', 'O02', 'O03'].includes(step))], tail: ['S1', 'P'] };

test('a remote rail reorders the pre-branch and shortens the tail', () => {
  const answers = { activity: 'walking', walkingMode: 'steps' };
  const path = [...remote.preBranch, 'W0', 'W1', 'W2', 'W3', ...remote.tail];
  expect(pathFor(answers, remote)).toEqual(path);
  path.forEach((step, i) => {
    const state = { step, answers };
    expect(nextStep(state, remote)).toBe(path[Math.min(i + 1, path.length - 1)]);
    expect(prevStep(state, remote)).toBe(path[Math.max(0, i - 1)]);
    expect(resumeStep(state, remote)).toBe(step);
  });
  expect(progressFraction({ step: 'P', answers }, remote)).toBe(1);
  expect(nextStep({ step: 'O01', answers }, remote)).toBe('O03');
});

test('a step the remote rail dropped keeps the bundled order instead of looping', () => {
  const answers = { activity: 'walking', walkingMode: 'steps' };
  const reduced = { preBranch: pre.filter((step) => step !== 'O05'), tail: [...tail] };
  expect(nextStep({ step: 'O05', answers }, reduced)).toBe('O06');
  expect(prevStep({ step: 'O05', answers }, reduced)).toBe('O04');
  expect(resumeStep({ step: 'O05', answers }, reduced)).toBe('O05');
  expect(resumeStep({ step: 'O05', answers })).toBe('O05');
});

test('resume without a remote rail keeps the bundled first step', () => {
  expect(resumeStep({ step: 'missing', answers: {} }, remote)).toBe('O01');
  expect(resumeStep(null, remote)).toBe('O01');
});
