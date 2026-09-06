import { nextSetup, resumeSetup, branchPermission } from '../../../onboarding/setupFlow';
test('setup advances through every step, including optional skips', () => {
  expect(['X1', 'X2', 'X3', 'X4', 'X5'].map(nextSetup)).toEqual(['X2', 'X3', 'X4', 'X5', 'done']);
  expect(resumeSetup({ setupStep: 'X3', setupComplete: false })).toBe('X3');
  expect(resumeSetup({ setupStep: 'bad', setupComplete: false })).toBe('X1');
  expect(resumeSetup({ setupStep: 'X2', setupComplete: true })).toBe('done');
});
test.each([
  ['walking', 'motion'],
  ['gym', 'location'],
  ['running', 'health'],
  ['biking', 'health'],
] as const)('%s asks for %s', (activity, permission) => expect(branchPermission(activity)).toBe(permission));
