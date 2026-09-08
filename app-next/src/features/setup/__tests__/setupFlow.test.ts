import { nextSetup, resumeSetup, branchPermission, setupPath } from '../../../onboarding/setupFlow';
test('setup advances through every step, including optional skips', () => {
  expect(setupPath('walking')).toEqual(['X1', 'X2', 'X3b', 'X4', 'X5']);
  expect(setupPath('gym')).toEqual(['X1', 'X2', 'X3a', 'X3b', 'X4', 'X5']);
  expect(nextSetup('X2', 'walking')).toBe('X3b');
  expect(nextSetup('X2', 'gym')).toBe('X3a');
  expect(nextSetup('X3a', 'gym')).toBe('X3b');
  expect(nextSetup('X3b', 'gym')).toBe('X4');
  expect(resumeSetup({ setupStep: 'X3', setupComplete: false }, 'gym')).toBe('X3a');
  expect(resumeSetup({ setupStep: 'X3', setupComplete: false }, 'walking')).toBe('X3b');
  expect(resumeSetup({ setupStep: 'bad', setupComplete: false }, 'walking')).toBe('X1');
  expect(resumeSetup({ setupStep: 'X2', setupComplete: true }, 'walking')).toBe('done');
});
test.each([
  ['walking', 'motion'],
  ['gym', 'location'],
  ['running', 'health'],
  ['biking', 'health'],
] as const)('%s asks for %s', (activity, permission) => expect(branchPermission(activity)).toBe(permission));
